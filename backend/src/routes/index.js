const express = require('express');
const { sequelize } = require('../models');
const listingRoutes = require('./listing.routes');
const authRoutes = require('./auth.routes');
const moduleRoutes = require('./module.routes');
const adminRoutes = require('./admin.routes');
const requireMetricsToken = require('../middlewares/require-metrics-token');
const { register } = require('../utils/metrics');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (_req, res, next) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    next(error);
  }
});

router.get('/metrics', requireMetricsToken, async (_req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    res.status(200).send(await register.metrics());
  } catch (error) {
    next(error);
  }
});

router.use('/auth', authRoutes);
router.use('/modules', moduleRoutes);
router.use('/admin', adminRoutes);
router.use('/listings', listingRoutes);

module.exports = router;
