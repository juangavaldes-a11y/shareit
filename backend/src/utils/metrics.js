const client = require('prom-client');
const env = require('../config/env');

const register = new client.Registry();
register.setDefaultLabels({ service: 'shareit-api', environment: env.nodeEnv });
client.collectDefaultMetrics({ register });

const requestCounter = new client.Counter({
  name: 'shareit_http_requests_total',
  help: 'Total HTTP requests completed by route and response status.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const requestDuration = new client.Histogram({
  name: 'shareit_http_request_duration_seconds',
  help: 'HTTP request duration by route and response status.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const metricRoute = (req) => req.originalUrl
  .replace(/\/api\/v1\/admin\/modules\/[^/]+/, '/api/v1/admin/modules/:key')
  .replace(/\/api\/v1\/listings\/[^/]+/, '/api/v1/listings/:id')
  .split('?')[0];

const observeRequest = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    if (req.path === '/api/v1/metrics') {
      return;
    }

    const labels = {
      method: req.method,
      route: metricRoute(req),
      status_code: String(res.statusCode),
    };
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    requestCounter.inc(labels);
    requestDuration.observe(labels, durationSeconds);
  });

  next();
};

module.exports = { observeRequest, register };