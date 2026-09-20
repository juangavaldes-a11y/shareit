const env = require('../config/env');

const requireMetricsToken = (req, res, next) => {
  if (env.metricsToken && req.get('authorization') === `Bearer ${env.metricsToken}`) {
    return next();
  }

  return res.status(404).send();
};

module.exports = requireMetricsToken;