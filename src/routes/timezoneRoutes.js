const express = require('express');
const router = express.Router();
const timezoneController = require('../controllers/timezoneController');

// Get all timezones (public)
router.get('/', timezoneController.getTimezones);

module.exports = router;
