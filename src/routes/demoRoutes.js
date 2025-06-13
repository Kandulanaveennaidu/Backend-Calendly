const express = require('express');
const router = express.Router();

// Simple demo routes for testing notifications
router.post('/create-user', (req, res) => {
    res.json({
        success: true,
        message: 'Demo user creation endpoint',
        data: {
            userId: 'demo-user-123',
            name: 'Demo User',
            email: 'demo@example.com'
        }
    });
});

router.post('/send-multiple', (req, res) => {
    res.json({
        success: true,
        message: 'Demo multiple notifications endpoint',
        data: {
            userId: 'demo-user-123',
            count: 3
        }
    });
});

module.exports = router;
