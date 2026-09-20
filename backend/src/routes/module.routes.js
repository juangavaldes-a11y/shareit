const express = require('express');
const moduleController = require('../controllers/module.controller');

const router = express.Router();

router.get('/', moduleController.getCapabilities);

module.exports = router;