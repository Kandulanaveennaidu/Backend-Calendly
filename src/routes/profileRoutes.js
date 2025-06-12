const express = require('express');
const { body } = require('express-validator');
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for profile updates
const profileUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 profile updates per windowMs
    message: {
        success: false,
        message: 'Too many profile update attempts, please try again later'
    }
});

// Validation for profile update
const updateProfileValidation = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('First name can only contain letters and spaces'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Last name can only contain letters and spaces'),
    body('avatar')
        .optional()
        .isURL()
        .withMessage('Avatar must be a valid URL'),
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a valid string'),
    body('preferences.emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications preference must be a boolean'),
    body('preferences.smsNotifications')
        .optional()
        .isBoolean()
        .withMessage('SMS notifications preference must be a boolean'),
    body('preferences.theme')
        .optional()
        .isIn(['light', 'dark', 'auto'])
        .withMessage('Theme must be light, dark, or auto')
];

// All routes require authentication
router.use(auth);

// @route   GET /api/v1/profile/dashboard-stats
// @desc    Get dashboard statistics (for dashboard page)
// @access  Private
router.get('/dashboard-stats', profileController.getDashboardStats);

// @route   GET /api/v1/profile/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', profileController.getUserStats);

// @route   GET /api/v1/profile
// @desc    Get current user profile
// @access  Private
router.get('/', profileController.getProfile);

// @route   PUT /api/v1/profile
// @desc    Update user profile
// @access  Private
router.put('/', profileUpdateLimiter, updateProfileValidation, profileController.updateProfile);

// @route   POST /api/v1/profile/avatar
// @desc    Upload avatar
// @access  Private
router.post('/avatar', profileController.uploadAvatar);

// @route   DELETE /api/v1/profile
// @desc    Delete user account
// @access  Private
router.delete('/', profileController.deleteAccount);

module.exports = router;
