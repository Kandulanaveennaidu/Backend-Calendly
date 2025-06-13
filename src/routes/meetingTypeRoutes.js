const express = require('express');
const { body, param, query } = require('express-validator');
const meetingTypeController = require('../controllers/meetingTypeController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for meeting type operations
const meetingTypeCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 creates per windowMs
    message: {
        success: false,
        message: 'Too many meeting type creation attempts, please try again later'
    }
});

// Validation for meeting type ID parameter
const meetingTypeIdValidation = [
    param('id').isMongoId().withMessage('Invalid meeting type ID format')
];

// Validation for query parameters
const getMeetingTypesValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be either active or inactive'),
    query('sortBy')
        .optional()
        .isIn(['name', 'duration', 'createdAt', 'totalBookings'])
        .withMessage('Invalid sort field'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
];

// Validation for creating meeting type
const createMeetingTypeValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('duration')
        .optional()
        .isInt({ min: 5, max: 480 })
        .withMessage('Duration must be between 5 and 480 minutes'),
    body('defaultDuration')
        .optional()
        .isInt({ min: 5, max: 480 })
        .withMessage('Default duration must be between 5 and 480 minutes'),
    body('color')
        .optional()
        .matches(/^#([0-9A-F]{3}){1,2}$/i)
        .withMessage('Color must be a valid hex color code'),
    // ✅ Add availableDate validation
    body('availableDate')
        .isISO8601()
        .withMessage('Available date must be in YYYY-MM-DD format')
        .custom((value) => {
            const date = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                throw new Error('Available date must be today or in the future');
            }
            return true;
        }),
    body('availableDays')
        .optional()
        .isArray()
        .withMessage('Available days must be an array'),
    body('availableTimeSlots')
        .optional()
        .isArray()
        .withMessage('Available time slots must be an array')
];

// Validation for updating meeting type
const updateMeetingTypeValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('duration')
        .optional()
        .isInt({ min: 5, max: 480 })
        .withMessage('Duration must be between 5 and 480 minutes'),
    body('color')
        .optional()
        .matches(/^#([0-9A-F]{3}){1,2}$/i)
        .withMessage('Color must be a valid hex color code'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

// Bulk update validation
const bulkUpdateValidation = [
    body('meetingTypeIds')
        .isArray({ min: 1 })
        .withMessage('Meeting type IDs array is required'),
    body('meetingTypeIds.*')
        .isMongoId()
        .withMessage('Invalid meeting type ID format'),
    body('action')
        .isIn(['activate', 'deactivate', 'delete'])
        .withMessage('Action must be activate, deactivate, or delete')
];

// All routes require authentication
router.use(auth);

// @route   GET /api/v1/meeting-types
// @desc    Get all meeting types for user
// @access  Private
router.get('/', getMeetingTypesValidation, meetingTypeController.getMeetingTypes);

// @route   GET /api/v1/meeting-types/stats
// @desc    Get meeting types statistics
// @access  Private
router.get('/stats', meetingTypeController.getMeetingTypesStats);

// @route   POST /api/v1/meeting-types/bulk-update
// @desc    Bulk update meeting types
// @access  Private
router.post('/bulk-update', bulkUpdateValidation, meetingTypeController.bulkUpdateMeetingTypes);

// @route   GET /api/v1/meeting-types/:id
// @desc    Get single meeting type
// @access  Private
router.get('/:id', meetingTypeIdValidation, meetingTypeController.getMeetingTypeById);

// @route   POST /api/v1/meeting-types
// @desc    Create new meeting type
// @access  Private
router.post('/', meetingTypeCreateLimiter, createMeetingTypeValidation, meetingTypeController.createMeetingType);

// @route   PUT /api/v1/meeting-types/:id
// @desc    Update meeting type
// @access  Private
router.put('/:id', [...meetingTypeIdValidation, ...updateMeetingTypeValidation], meetingTypeController.updateMeetingType);

// @route   DELETE /api/v1/meeting-types/:id
// @desc    Delete meeting type
// @access  Private
router.delete('/:id', meetingTypeIdValidation, meetingTypeController.deleteMeetingType);

// @route   PATCH /api/v1/meeting-types/:id/toggle-status
// @desc    Toggle meeting type active status
// @access  Private
router.patch('/:id/toggle-status', meetingTypeIdValidation, (req, res, next) => {
    // Ensure the controller method exists before calling
    if (typeof meetingTypeController.toggleMeetingTypeStatus === 'function') {
        return meetingTypeController.toggleMeetingTypeStatus(req, res, next);
    } else {
        return res.status(500).json({
            success: false,
            message: 'toggleMeetingTypeStatus method not implemented'
        });
    }
});

// @route   POST /api/v1/meeting-types/:id/duplicate
// @desc    Duplicate meeting type
// @access  Private
router.post('/:id/duplicate', meetingTypeIdValidation, meetingTypeController.duplicateMeetingType);

// @route   PATCH /api/v1/meeting-types/:id/settings
// @desc    Update meeting type settings only
// @access  Private
router.patch('/:id/settings', meetingTypeIdValidation, [
    body('settings.bufferTimeBefore')
        .optional()
        .isInt({ min: 0, max: 60 })
        .withMessage('Buffer time before must be between 0 and 60 minutes'),
    body('settings.bufferTimeAfter')
        .optional()
        .isInt({ min: 0, max: 60 })
        .withMessage('Buffer time after must be between 0 and 60 minutes'),
    body('settings.allowRescheduling')
        .optional()
        .isBoolean()
        .withMessage('Allow rescheduling must be a boolean'),
    body('settings.allowCancellation')
        .optional()
        .isBoolean()
        .withMessage('Allow cancellation must be a boolean'),
    body('settings.requireApproval')
        .optional()
        .isBoolean()
        .withMessage('Require approval must be a boolean'),
    body('settings.maxAdvanceBooking')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Max advance booking must be at least 1 day')
], meetingTypeController.updateMeetingTypeSettings);

// @route   GET /api/v1/meeting-types/:id/bookings
// @desc    Get bookings for a specific meeting type
// @access  Private
router.get('/:id/bookings', meetingTypeIdValidation, [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'])
        .withMessage('Invalid status')
], meetingTypeController.getMeetingTypeBookings);

module.exports = router;
