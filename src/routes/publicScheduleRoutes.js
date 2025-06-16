const express = require('express');
const router = express.Router();
const publicScheduleController = require('../controllers/publicScheduleController');

router.post('/', publicScheduleController.handlePublicSchedule);

module.exports = router;
