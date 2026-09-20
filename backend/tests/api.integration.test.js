const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const app = require('../src/app');
const { initModels, ModuleAuditLog, sequelize, User } = require('../src/models');

const adminEmail = `test-admin-${Date.now()}@example.test`;
const adminPassword = 'test-admin-password-2026';
let adminId;

before(async () => {
  initModels();
  await sequelize.authenticate();
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const user = await User.create({
    fullName: 'Integration Test Administrator',
    email: adminEmail,
    passwordHash,
    role: 'admin',
  });
  adminId = user.id;
});

after(async () => {
  if (adminId) {
    await ModuleAuditLog.destroy({ where: { actorId: adminId } });
    await User.destroy({ where: { id: adminId } });
  }
  await sequelize.close();
});

test('public registration cannot assign the administrator role', async () => {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName: 'Untrusted Administrator',
      email: 'untrusted-admin@example.test',
      password: 'a-secure-password',
      role: 'admin',
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Invalid role');
});

test('disabling listings blocks listing routes and can be restored', async () => {
  const agent = request.agent(app);
  const loginResponse = await agent
    .post('/api/v1/auth/login')
    .send({
      email: adminEmail,
      password: adminPassword,
    });

  assert.equal(loginResponse.status, 200, JSON.stringify(loginResponse.body));

  const modulesResponse = await agent.get('/api/v1/admin/modules');
  assert.equal(modulesResponse.status, 200);

  const listings = modulesResponse.body.find((module) => module.key === 'listings');
  assert.ok(listings);

  try {
    const disableResponse = await agent
      .patch('/api/v1/admin/modules/listings')
      .send({ enabled: false });
    assert.equal(disableResponse.status, 200);
    assert.equal(disableResponse.body.enabled, false);

    const listingResponse = await agent.get('/api/v1/listings');
    assert.equal(listingResponse.status, 503);
    assert.equal(listingResponse.body.message, 'This feature is currently unavailable');
  } finally {
    await agent
      .patch('/api/v1/admin/modules/listings')
      .send({ enabled: listings.enabled });
  }

  const auditResponse = await agent.get('/api/v1/admin/modules/listings/audit-logs');
  assert.equal(auditResponse.status, 200);
  assert.ok(auditResponse.body.some((entry) => entry.actor.email === adminEmail));
});