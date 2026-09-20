const express = require('express');
const listingController = require('../controllers/listing.controller');
const authenticate = require('../middlewares/authenticate');
const authorizeRoles = require('../middlewares/authorize-roles');
const moduleGuard = require('../middlewares/module-guard');

const router = express.Router();

router.use(moduleGuard('listings'));
router.get('/', listingController.getAvailableListings);
router.post('/', authenticate, authorizeRoles('owner', 'admin'), listingController.createListing);

module.exports = router;
