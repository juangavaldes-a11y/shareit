// DB-free tests: Sequelize model methods are stubbed, so no PostgreSQL is needed.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'unit-test-secret';
process.env.METRICS_TOKEN = 'metrics-secret';
process.env.LOG_LEVEL = 'silent';

const { afterEach, before, describe, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const app = require('../../src/app');
const { AppModule, Listing, ModuleAuditLog, User, initModels, sequelize } = require('../../src/models');
const { register: metricsRegister } = require('../../src/utils/metrics');
const { signAccessToken } = require('../../src/utils/jwt');
const { accessTokenCookieName } = require('../../src/utils/auth-cookie');

const authService = require('../../src/services/auth.service');
const listingService = require('../../src/services/listing.service');
const moduleService = require('../../src/services/module.service');
const userRepository = require('../../src/repositories/user.repository');
const listingRepository = require('../../src/repositories/listing.repository');
const errorHandler = require('../../src/middlewares/error-handler');
const authorizeRoles = require('../../src/middlewares/authorize-roles');
const requireMetricsToken = require('../../src/middlewares/require-metrics-token');
const ApiError = require('../../src/utils/api-error');

const adminUser = { id: 'u-admin', email: 'admin@example.test', role: 'admin', fullName: 'Admin' };
const ownerUser = { id: 'u-owner', email: 'owner@example.test', role: 'owner', fullName: 'Owner' };
const renterUser = { id: 'u-renter', email: 'renter@example.test', role: 'renter', fullName: 'Renter' };

const cookieFor = (user) => `${accessTokenCookieName}=${signAccessToken(user)}`;
const stubUserLookup = (...users) => mock.method(User, 'findByPk', async (id) => users.find((user) => user.id === id) || null);
const enableModule = (enabled = true) => mock.method(AppModule, 'findByPk', async () => ({ enabled }));
const fakeTransaction = () => mock.method(sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));

const rejectsWith = async (promise, statusCode, message) => {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ApiError, `expected ApiError, got ${error}`);
    assert.equal(error.statusCode, statusCode);
    if (message) assert.match(error.message, message);
    return true;
  });
};

before(() => initModels());
afterEach(() => mock.restoreAll());

describe('health, readiness and metrics', () => {
  test('health endpoint', async () => {
    const response = await request(app).get('/api/v1/health').set('x-request-id', 'trace-1');
    assert.equal(response.status, 200);
    assert.equal(response.headers['x-request-id'], 'trace-1');
    assert.deepEqual(response.body, { status: 'ok' });
  });

  test('ready endpoint reports database state', async () => {
    mock.method(sequelize, 'authenticate', async () => {});
    assert.equal((await request(app).get('/api/v1/ready')).status, 200);

    mock.method(sequelize, 'authenticate', async () => { throw new Error('db down'); });
    const failed = await request(app).get('/api/v1/ready');
    assert.equal(failed.status, 500);
    assert.equal(failed.body.message, 'Internal server error');
  });

  test('metrics are hidden without the token and exposed with it', async () => {
    assert.equal((await request(app).get('/api/v1/metrics')).status, 404);
    assert.equal((await request(app).get('/api/v1/metrics').set('Authorization', 'Bearer wrong')).status, 404);

    await request(app).get('/api/v1/listings/abc-123?x=1');
    await request(app).get('/api/v1/admin/modules/listings');
    const ok = await request(app).get('/api/v1/metrics').set('Authorization', 'Bearer metrics-secret');
    assert.equal(ok.status, 200);
    assert.match(ok.text, /shareit_http_requests_total/);
    assert.match(ok.text, /route="\/api\/v1\/listings\/:id"/);
    assert.match(ok.text, /route="\/api\/v1\/admin\/modules\/:key"/);
    assert.doesNotMatch(ok.text, /route="\/api\/v1\/metrics"/);

    mock.method(metricsRegister, 'metrics', async () => { throw new Error('boom'); });
    const failed = await request(app).get('/api/v1/metrics').set('Authorization', 'Bearer metrics-secret');
    assert.equal(failed.status, 500);
  });

  test('observeRequest skips the metrics endpoint itself', () => {
    const { observeRequest } = require('../../src/utils/metrics');
    const listeners = {};
    const res = { on: (event, handler) => { listeners[event] = handler; }, statusCode: 200 };
    let nextCalls = 0;
    observeRequest({ path: '/api/v1/metrics', method: 'GET', originalUrl: '/api/v1/metrics' }, res, () => { nextCalls += 1; });
    listeners.finish();
    assert.equal(nextCalls, 1);
  });

  test('requireMetricsToken denies when no token is configured', () => {
    const env = require('../../src/config/env');
    const previous = env.metricsToken;
    env.metricsToken = undefined;
    const res = { status: mock.fn(() => res), send: mock.fn() };
    requireMetricsToken({ get: () => 'Bearer undefined' }, res, () => assert.fail('should not pass'));
    assert.equal(res.status.mock.calls[0].arguments[0], 404);
    env.metricsToken = previous;
  });
});

describe('auth routes', () => {
  test('register, login, me and logout', async () => {
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    const stored = { ...renterUser, passwordHash, createdAt: 'c', updatedAt: 'u' };

    mock.method(User, 'findOne', async () => null);
    mock.method(User, 'create', async (payload) => ({ ...stored, ...payload }));
    const registered = await request(app).post('/api/v1/auth/register').send({
      fullName: ' New User ', email: 'New@Example.test', password: 'correct-horse-battery',
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.body.user.email, 'new@example.test');
    assert.equal(registered.body.user.fullName, 'New User');
    assert.equal(registered.body.user.passwordHash, undefined);
    assert.match(registered.headers['set-cookie'][0], /shareit_access_token=.*HttpOnly/);

    mock.method(User, 'findOne', async () => stored);
    const duplicate = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Dup', email: 'renter@example.test', password: 'correct-horse-battery',
    });
    assert.equal(duplicate.status, 409);

    const badRole = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Bad', email: 'bad@example.test', password: 'correct-horse-battery', role: 7,
    });
    assert.equal(badRole.status, 400);

    const loggedIn = await request(app).post('/api/v1/auth/login').send({ email: 'Renter@example.test', password: 'correct-horse-battery' });
    assert.equal(loggedIn.status, 200);

    const wrongPassword = await request(app).post('/api/v1/auth/login').send({ email: 'renter@example.test', password: 'another-long-password' });
    assert.equal(wrongPassword.status, 401);

    mock.method(User, 'findOne', async () => null);
    const unknown = await request(app).post('/api/v1/auth/login').send({ email: 'ghost@example.test', password: 'correct-horse-battery' });
    assert.equal(unknown.status, 401);

    stubUserLookup({ ...stored });
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookieFor(renterUser));
    assert.equal(me.status, 200);
    assert.equal(me.body.email, renterUser.email);
    assert.equal(me.body.passwordHash, undefined);

    const logout = await request(app).post('/api/v1/auth/logout');
    assert.equal(logout.status, 204);
    assert.match(logout.headers['set-cookie'][0], /shareit_access_token=;/);
  });

  test('me propagates repository failures', async () => {
    mock.method(User, 'findByPk', async () => { throw new Error('db'); });
    const response = await request(app).get('/api/v1/auth/me').set('Cookie', cookieFor(renterUser));
    assert.equal(response.status, 500);
  });
});

describe('authenticate and authorizeRoles middleware', () => {
  test('rejects missing cookies, unknown users and invalid tokens', async () => {
    assert.equal((await request(app).get('/api/v1/auth/me')).status, 401);

    stubUserLookup();
    const unknown = await request(app).get('/api/v1/auth/me').set('Cookie', cookieFor(renterUser));
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.message, 'Invalid token user');

    const invalid = await request(app).get('/api/v1/auth/me').set('Cookie', `${accessTokenCookieName}=garbage`);
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.message, 'Invalid or expired token');
  });

  test('authenticate tolerates requests without a cookie parser', async () => {
    const authenticate = require('../../src/middlewares/authenticate');
    const errors = [];
    await authenticate({}, {}, (error) => errors.push(error));
    assert.equal(errors[0].statusCode, 401);
  });

  test('authorizeRoles allows listed roles only', () => {
    const results = [];
    const guard = authorizeRoles('owner', 'admin');
    guard({ user: { role: 'owner' } }, {}, (error) => results.push(error));
    guard({ user: { role: 'renter' } }, {}, (error) => results.push(error));
    guard({}, {}, (error) => results.push(error));
    assert.equal(results[0], undefined);
    assert.equal(results[1].statusCode, 403);
    assert.equal(results[2].statusCode, 403);
  });
});

describe('error handler', () => {
  const run = (error, req = {}) => {
    const res = { status: mock.fn(() => res), json: mock.fn() };
    errorHandler(error, req, res, () => {});
    return { status: res.status.mock.calls[0].arguments[0], body: res.json.mock.calls[0].arguments[0] };
  };

  test('maps known errors and hides unknown ones', () => {
    assert.deepEqual(run(new ApiError(418, 'teapot')), { status: 418, body: { message: 'teapot' } });
    for (const name of ['JsonWebTokenError', 'TokenExpiredError']) {
      const error = Object.assign(new Error('x'), { name });
      assert.equal(run(error).status, 401);
    }
    const log = { error: mock.fn() };
    assert.equal(run(new Error('boom'), { log: { error: log.error } }).status, 500);
    assert.equal(log.error.mock.callCount(), 1);
    assert.equal(run(new Error('boom')).status, 500);
  });
});

describe('authService validation', () => {
  const valid = { fullName: 'Valid Name', email: 'valid@example.test', password: 'long-enough-password' };

  test('rejects invalid credentials field by field', async () => {
    const invalid = [
      { ...valid, fullName: undefined },
      { ...valid, fullName: 'x' },
      { ...valid, fullName: 'y'.repeat(121) },
      { ...valid, email: 5 },
      { ...valid, email: 'not-an-email' },
      { ...valid, password: 5 },
      { ...valid, password: 'short' },
      { ...valid, password: 'p'.repeat(129) },
    ];
    for (const payload of invalid) {
      await rejectsWith(authService.register(payload), 400, /valid email/);
    }
    await rejectsWith(authService.login({ email: 'valid@example.test', password: 'short' }), 400);
    await rejectsWith(authService.login({ email: undefined, password: valid.password }), 400);
  });

  test('role handling', async () => {
    await rejectsWith(authService.register({ ...valid, role: 'admin' }), 400, /Invalid role/);
    await rejectsWith(authService.register({ ...valid, role: null }), 400, /Invalid role/);

    mock.method(userRepository, 'findUserByEmail', async () => null);
    const create = mock.method(userRepository, 'createUser', async (payload) => ({ id: 'n1', ...payload }));
    const owner = await authService.register({ ...valid, role: 'OWNER' });
    assert.equal(owner.user.role, 'owner');
    assert.ok(owner.token);
    await authService.register(valid);
    assert.equal(create.mock.calls[1].arguments[0].role, 'renter');
  });
});

describe('listing routes and service', () => {
  test('module guard blocks disabled listings', async () => {
    enableModule(false);
    const blocked = await request(app).get('/api/v1/listings');
    assert.equal(blocked.status, 503);
    mock.method(AppModule, 'findByPk', async () => null);
    assert.equal((await request(app).get('/api/v1/listings')).status, 503);
    mock.method(AppModule, 'findByPk', async () => { throw new Error('db'); });
    assert.equal((await request(app).get('/api/v1/listings')).status, 500);
  });

  test('lists available listings with filters, paging and sorting', async () => {
    enableModule(true);
    const find = mock.method(Listing, 'findAndCountAll', async () => ({ rows: [{ id: 'l1' }], count: 25 }));
    const response = await request(app).get('/api/v1/listings').query({
      location: ' Lima ', category: ' Tools ', page: '2', pageSize: '10', sort: 'price_desc',
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.pagination, { page: 2, pageSize: 10, total: 25, totalPages: 3 });
    const args = find.mock.calls[0].arguments[0];
    assert.deepEqual(args.where, { isAvailable: true, location: 'Lima', category: 'tools' });
    assert.equal(args.limit, 10);
    assert.equal(args.offset, 10);
    assert.deepEqual(args.order, [['pricePerDay', 'DESC']]);

    await request(app).get('/api/v1/listings');
    assert.deepEqual(find.mock.calls[1].arguments[0].where, { isAvailable: true });
  });

  test('rejects invalid list options', async () => {
    enableModule(true);
    mock.method(Listing, 'findAndCountAll', async () => ({ rows: [], count: 0 }));
    for (const query of [
      { page: '0' }, { page: 'abc' }, { pageSize: '51' }, { sort: 'cheapest' }, { location: 'x'.repeat(121) },
      { category: ['a', 'b'] },
    ]) {
      const response = await request(app).get('/api/v1/listings').query(query);
      assert.equal(response.status, 400, JSON.stringify(query));
    }
    const empty = await request(app).get('/api/v1/listings');
    assert.equal(empty.body.pagination.totalPages, 0);
  });

  test('creating listings requires an authenticated owner or admin', async () => {
    enableModule(true);
    stubUserLookup(ownerUser, renterUser, adminUser);
    const create = mock.method(Listing, 'create', async (payload) => ({ id: 'new', ...payload }));
    const body = { title: ' Drill ', description: ' Cordless ', category: ' TOOLS ', pricePerDay: '12.5', location: ' Lima ', imageUrl: ' http://img ' };

    assert.equal((await request(app).post('/api/v1/listings').send(body)).status, 401);
    assert.equal((await request(app).post('/api/v1/listings').set('Cookie', cookieFor(renterUser)).send(body)).status, 403);

    const created = await request(app).post('/api/v1/listings').set('Cookie', cookieFor(ownerUser)).send(body);
    assert.equal(created.status, 201);
    assert.deepEqual(create.mock.calls[0].arguments[0], {
      title: 'Drill', description: 'Cordless', category: 'tools', pricePerDay: '12.5', location: 'Lima', imageUrl: 'http://img', ownerId: ownerUser.id,
    });

    const minimal = await request(app).post('/api/v1/listings').set('Cookie', cookieFor(adminUser)).send({ title: 'Ab', location: 'Cd', pricePerDay: 1 });
    assert.equal(minimal.status, 201);
    assert.deepEqual(create.mock.calls[1].arguments[0], {
      title: 'Ab', description: null, category: 'general', pricePerDay: 1, location: 'Cd', imageUrl: null, ownerId: adminUser.id,
    });

    const invalid = await request(app).post('/api/v1/listings').set('Cookie', cookieFor(ownerUser)).send({ title: 'x' });
    assert.equal(invalid.status, 400);
  });

  test('createListing validation', async () => {
    const base = { title: 'Title', location: 'Place', pricePerDay: 5 };
    mock.method(listingRepository, 'createListing', async (payload) => payload);
    for (const payload of [
      undefined, null, 'text', { ...base, title: 5 }, { ...base, title: 'a' }, { ...base, title: 't'.repeat(151) },
      { ...base, location: 5 }, { ...base, location: 'a' }, { ...base, location: 'l'.repeat(121) },
      { ...base, pricePerDay: 'free' }, { ...base, pricePerDay: 0 }, { ...base, pricePerDay: -3 },
    ]) {
      await rejectsWith(listingService.createListing(payload, 'o'), 400, /Provide a title/);
    }
    for (const field of ['description', 'category', 'imageUrl']) {
      await rejectsWith(listingService.createListing({ ...base, [field]: 5 }, 'o'), 400, new RegExp(`${field} must be a string`));
    }
  });

  test('listing repository applies optional filters', async () => {
    const find = mock.method(Listing, 'findAndCountAll', async () => ({ rows: [], count: 0 }));
    await listingRepository.findAvailableListings({ limit: 1, offset: 0, order: [] });
    assert.deepEqual(find.mock.calls[0].arguments[0].where, { isAvailable: true });
    await listingRepository.findAvailableListings({ filters: { location: 'L' }, limit: 1, offset: 0, order: [] });
    assert.deepEqual(find.mock.calls[1].arguments[0].where, { isAvailable: true, location: 'L' });
    await listingRepository.findAvailableListings({ filters: { category: 'c' }, limit: 1, offset: 0, order: [] });
    assert.deepEqual(find.mock.calls[2].arguments[0].where, { isAvailable: true, category: 'c' });
  });
});

describe('user repository', () => {
  test('delegates to the model', async () => {
    const create = mock.method(User, 'create', async (payload) => payload);
    const findOne = mock.method(User, 'findOne', async () => 'one');
    const findByPk = mock.method(User, 'findByPk', async () => 'pk');
    assert.deepEqual(await userRepository.createUser({ a: 1 }), { a: 1 });
    assert.equal(await userRepository.findUserByEmail('e'), 'one');
    assert.equal(await userRepository.findUserById('id'), 'pk');
    assert.equal(create.mock.callCount() + findOne.mock.callCount() + findByPk.mock.callCount(), 3);
  });
});

describe('module routes and service', () => {
  const adminCookie = () => {
    stubUserLookup(adminUser, renterUser);
    return cookieFor(adminUser);
  };
  const moduleRow = (overrides = {}) => ({
    key: 'listings', name: 'Listings', description: 'd', enabled: true, isCore: false, updatedAt: 'now',
    update: mock.fn(async function update(values) { Object.assign(this, values); }),
    ...overrides,
  });

  test('capabilities are public', async () => {
    mock.method(AppModule, 'findAll', async () => [{ key: 'listings' }, { key: 'auth' }]);
    const response = await request(app).get('/api/v1/modules');
    assert.deepEqual(response.body, { enabledModules: ['listings', 'auth'] });

    mock.method(AppModule, 'findAll', async () => { throw new Error('db'); });
    assert.equal((await request(app).get('/api/v1/modules')).status, 500);
  });

  test('admin routes require an administrator', async () => {
    assert.equal((await request(app).get('/api/v1/admin/modules')).status, 401);
    stubUserLookup(renterUser);
    assert.equal((await request(app).get('/api/v1/admin/modules').set('Cookie', cookieFor(renterUser))).status, 403);
  });

  test('lists modules', async () => {
    const cookie = adminCookie();
    mock.method(AppModule, 'findAll', async () => [moduleRow()]);
    const response = await request(app).get('/api/v1/admin/modules').set('Cookie', cookie);
    assert.equal(response.status, 200);
    assert.equal(response.body[0].key, 'listings');
    assert.equal(response.body[0].update, undefined);

    mock.method(AppModule, 'findAll', async () => { throw new Error('db'); });
    assert.equal((await request(app).get('/api/v1/admin/modules').set('Cookie', cookie)).status, 500);
  });

  test('updates modules inside a transaction and audits real changes only', async () => {
    const cookie = adminCookie();
    fakeTransaction();
    const row = moduleRow();
    mock.method(AppModule, 'findByPk', async () => row);
    const audit = mock.method(ModuleAuditLog, 'create', async () => ({}));

    const disabled = await request(app).patch('/api/v1/admin/modules/listings').set('Cookie', cookie).send({ enabled: false });
    assert.equal(disabled.status, 200);
    assert.equal(disabled.body.enabled, false);
    assert.equal(audit.mock.callCount(), 1);
    assert.deepEqual(audit.mock.calls[0].arguments[0], { moduleKey: 'listings', actorId: adminUser.id, previousEnabled: true, enabled: false });

    await request(app).patch('/api/v1/admin/modules/listings').set('Cookie', cookie).send({ enabled: false });
    assert.equal(audit.mock.callCount(), 1);

    assert.equal((await request(app).patch('/api/v1/admin/modules/listings').set('Cookie', cookie).send({ enabled: 'no' })).status, 400);

    mock.method(AppModule, 'findByPk', async () => null);
    assert.equal((await request(app).patch('/api/v1/admin/modules/ghost').set('Cookie', cookie).send({ enabled: true })).status, 404);

    mock.method(AppModule, 'findByPk', async () => moduleRow({ isCore: true }));
    const core = await request(app).patch('/api/v1/admin/modules/auth').set('Cookie', cookie).send({ enabled: false });
    assert.equal(core.status, 400);
    assert.equal(core.body.message, 'Core modules cannot be disabled');
  });

  test('lists audit logs', async () => {
    const cookie = adminCookie();
    mock.method(AppModule, 'findByPk', async () => ({ key: 'listings' }));
    const find = mock.method(ModuleAuditLog, 'findAll', async () => [{
      id: 'a1', previousEnabled: true, enabled: false, createdAt: 'then', actor: { id: 'u', email: 'e' }, extra: 'dropped',
    }]);
    const response = await request(app).get('/api/v1/admin/modules/listings/audit-logs').set('Cookie', cookie);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [{ id: 'a1', previousEnabled: true, enabled: false, createdAt: 'then', actor: { id: 'u', email: 'e' } }]);
    assert.equal(find.mock.calls[0].arguments[0].limit, 20);

    mock.method(AppModule, 'findByPk', async () => null);
    assert.equal((await request(app).get('/api/v1/admin/modules/ghost/audit-logs').set('Cookie', cookie)).status, 404);
  });

  test('isModuleEnabled requires an explicit true', async () => {
    mock.method(AppModule, 'findByPk', async () => ({ enabled: true }));
    assert.equal(await moduleService.isModuleEnabled('x'), true);
    mock.method(AppModule, 'findByPk', async () => ({ enabled: 'yes' }));
    assert.equal(await moduleService.isModuleEnabled('x'), false);
    mock.method(AppModule, 'findByPk', async () => null);
    assert.equal(await moduleService.isModuleEnabled('x'), false);
  });
});

describe('config/env', () => {
  const envPath = require.resolve('../../src/config/env');
  const keys = ['NODE_ENV', 'PORT', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_PORT', 'DB_LOGGING', 'CORS_ORIGIN', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'METRICS_TOKEN'];

  const loadEnv = (overrides) => {
    const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    keys.forEach((key) => delete process.env[key]);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value !== undefined) process.env[key] = value;
    });
    delete require.cache[envPath];
    try {
      return require(envPath);
    } finally {
      keys.forEach((key) => {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      });
      delete require.cache[envPath];
      require(envPath);
    }
  };

  test('applies defaults', () => {
    const env = loadEnv({ NODE_ENV: undefined });
    assert.equal(env.nodeEnv, 'development');
    assert.equal(env.port, 4000);
    assert.equal(env.db.host, 'localhost');
    assert.equal(env.db.port, 5432);
    assert.equal(env.db.logging, false);
    assert.deepEqual(env.corsOrigins, ['http://localhost:5173']);
    assert.equal(env.jwt.expiresIn, '1d');
    assert.equal(env.metricsToken, undefined);
  });

  test('reads overrides', () => {
    const env = loadEnv({
      PORT: '8080', DB_HOST: 'db', DB_PORT: '6543', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p', DB_LOGGING: 'true',
      CORS_ORIGIN: 'http://a.test, http://b.test ,', JWT_SECRET: 's', JWT_EXPIRES_IN: '2h', METRICS_TOKEN: 'm',
    });
    assert.equal(env.port, 8080);
    assert.equal(env.db.port, 6543);
    assert.equal(env.db.logging, true);
    assert.deepEqual(env.corsOrigins, ['http://a.test', 'http://b.test']);
    assert.equal(env.jwt.secret, 's');
  });

  test('production requires configuration', () => {
    assert.throws(() => loadEnv({ NODE_ENV: 'production' }), /Missing required production environment variables: DB_HOST/);
    const env = loadEnv({
      NODE_ENV: 'production', DB_HOST: 'h', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p', CORS_ORIGIN: 'https://x.test', JWT_SECRET: 's', METRICS_TOKEN: 'm',
    });
    assert.equal(env.nodeEnv, 'production');
  });

  test('production app trusts the proxy and cookies are secure', () => {
    const appPath = require.resolve('../../src/app');
    const cookiePath = require.resolve('../../src/utils/auth-cookie');
    const production = {
      NODE_ENV: 'production', DB_HOST: 'h', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p', CORS_ORIGIN: 'https://x.test', JWT_SECRET: 's', METRICS_TOKEN: 'm',
    };
    const saved = Object.fromEntries(Object.keys(production).map((key) => [key, process.env[key]]));
    Object.assign(process.env, production);
    const cached = [envPath, appPath, cookiePath].map((path) => [path, require.cache[path]]);
    [envPath, appPath, cookiePath].forEach((path) => delete require.cache[path]);
    try {
      const productionApp = require(appPath);
      assert.equal(productionApp.get('trust proxy'), 1);
      const res = { cookie: mock.fn() };
      require(cookiePath).setAccessTokenCookie(res, 't');
      assert.equal(res.cookie.mock.calls[0].arguments[2].secure, true);
    } finally {
      Object.entries(saved).forEach(([key, value]) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      });
      cached.forEach(([path, entry]) => {
        if (entry) require.cache[path] = entry;
        else delete require.cache[path];
      });
    }
  });
});

describe('bootstrap-admin script', () => {
  const scriptPath = require.resolve('../../src/scripts/bootstrap-admin');
  const saved = {};

  const runScript = async (env) => {
    ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_FULL_NAME'].forEach((key) => {
      saved[key] = process.env[key];
      delete process.env[key];
    });
    Object.assign(process.env, env);
    mock.method(sequelize, 'authenticate', async () => {});
    const close = mock.method(sequelize, 'close', async () => {});
    const logs = mock.method(console, 'log', () => {});
    const errors = mock.method(console, 'error', () => {});
    delete require.cache[scriptPath];
    require(scriptPath);
    for (let waited = 0; close.mock.callCount() === 0 && waited < 3000; waited += 10) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const outcome = { closed: close.mock.callCount(), logs: logs.mock.calls.map((c) => c.arguments[0]), errors: errors.mock.calls.map((c) => c.arguments[1]), exitCode: process.exitCode };
    process.exitCode = 0;
    ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_FULL_NAME'].forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
    delete require.cache[scriptPath];
    return outcome;
  };

  test('rejects missing or weak configuration', async () => {
    for (const env of [{}, { ADMIN_EMAIL: 'bad', ADMIN_PASSWORD: 'long-enough-password' }, { ADMIN_EMAIL: 'a@b.co', ADMIN_PASSWORD: 'short' }, { ADMIN_EMAIL: 'a@b.co', ADMIN_PASSWORD: 'p'.repeat(129) }]) {
      const outcome = await runScript(env);
      assert.equal(outcome.exitCode, 1);
      assert.match(outcome.errors[0], /Set ADMIN_EMAIL/);
      assert.equal(outcome.closed, 1);
    }
  });

  test('creates a new administrator', async () => {
    mock.method(User, 'findOne', async () => null);
    const create = mock.method(User, 'create', async () => ({}));
    const outcome = await runScript({ ADMIN_EMAIL: ' Root@Example.test ', ADMIN_PASSWORD: 'long-enough-password' });
    assert.equal(outcome.exitCode, 0);
    assert.match(outcome.logs[0], /root@example.test/);
    const payload = create.mock.calls[0].arguments[0];
    assert.equal(payload.fullName, 'Platform Administrator');
    assert.equal(payload.role, 'admin');
  });

  test('promotes an existing user', async () => {
    const update = mock.fn(async () => {});
    mock.method(User, 'findOne', async () => ({ update }));
    const outcome = await runScript({ ADMIN_EMAIL: 'root@example.test', ADMIN_PASSWORD: 'long-enough-password', ADMIN_FULL_NAME: ' Chief ' });
    assert.equal(outcome.exitCode, 0);
    assert.equal(update.mock.calls[0].arguments[0].fullName, 'Chief');
    assert.equal(update.mock.calls[0].arguments[0].role, 'admin');
  });
});
