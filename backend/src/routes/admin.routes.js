const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authorizeRoles = require('../middlewares/authorize-roles');
const moduleController = require('../controllers/module.controller');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));
router.get('/modules', moduleController.getModules);
router.get('/modules/:key/audit-logs', moduleController.getModuleAuditLogs);
router.patch('/modules/:key', moduleController.updateModule);

module.exports = router;