const notificationService = require('../services/simpleNotificationService');

// Demo: Create user and send notification
const createUserDemo = async (req, res) => {
    try {
        const { name, email, userId } = req.body;

        // Simulate user creation
        const userData = {
            id: userId || 'demo-user-123',
            name: name || 'John Doe',
            email: email || 'john@example.com',
            createdAt: new Date().toISOString()
        };

        // Send notification if service is available
        if (typeof notificationService.sendUserCreatedNotification === 'function') {
            notificationService.sendUserCreatedNotification(userData.id, userData);
        }

        res.json({
            success: true,
            message: 'Demo user created and notification sent',
            data: userData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Demo: Send multiple notifications
const sendMultipleNotifications = async (req, res) => {
    try {
        const { userId } = req.body;
        const userIdToUse = userId || 'demo-user-123';

        // Send multiple notifications with delay if service is available
        if (typeof notificationService.sendUserCreatedNotification === 'function') {
            setTimeout(() => {
                notificationService.sendUserCreatedNotification(userIdToUse, {
                    id: userIdToUse,
                    name: 'Alice Johnson',
                    email: 'alice@example.com'
                });
            }, 1000);

            setTimeout(() => {
                notificationService.sendMeetingCreated(userIdToUse, {
                    _id: 'meeting-123',
                    title: '30 Minute Consultation',
                    date: '2024-02-01',
                    time: '2:00 PM'
                });
            }, 2000);
        }

        res.json({
            success: true,
            message: 'Multiple notifications queued',
            userId: userIdToUse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createUserDemo,
    sendMultipleNotifications
};
