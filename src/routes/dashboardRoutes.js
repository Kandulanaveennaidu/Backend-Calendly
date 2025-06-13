const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Simple routes without auth middleware for now
router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
