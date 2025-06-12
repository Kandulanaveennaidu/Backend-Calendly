const express = require('express');
const { body, param, query } = require('express-validator');
const meetingController = require('../controllers/meetingController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for meeting operations
const meetingCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 creates per windowMs
    message: {
        success: false,
        message: 'Too many meeting creation attempts, please try again later'
    }
});

// Validation for meeting ID parameter
const meetingIdValidation = [
    param('id').isMongoId().withMessage('Invalid meeting ID format')
];

// Validation for query parameters
const getMeetingsValidation = [
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
        .withMessage('Invalid status'),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    query('upcoming')
        .optional()
        .isBoolean()
        .withMessage('Upcoming must be a boolean')
];

// Validation for creating meeting
const createMeetingValidation = [
    body('meetingTypeId')
        .isMongoId()
        .withMessage('Invalid meeting type ID'),
    body('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('scheduledAt')
        .isISO8601()
        .withMessage('Scheduled date must be a valid ISO 8601 date'),
    body('duration')
        .optional()
        .isInt({ min: 5 })
        .withMessage('Duration must be at least 5 minutes'),
    body('attendees')
        .isArray({ min: 1 })
        .withMessage('At least one attendee is required'),
    body('attendees.*.name')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Attendee name is required'),
    body('attendees.*.email')
        .isEmail()
        .withMessage('Valid attendee email is required'),
    body('location.type')
        .optional()
        .isIn(['in-person', 'video-call', 'phone-call', 'custom'])
        .withMessage('Invalid location type'),
    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a string')
];

// Validation for updating meeting
const updateMeetingValidation = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('scheduledAt')
        .optional()
        .isISO8601()
        .withMessage('Scheduled date must be a valid ISO 8601 date'),
    body('duration')
        .optional()
        .isInt({ min: 5 })
        .withMessage('Duration must be at least 5 minutes'),
    body('status')
        .optional()
        .isIn(['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'])
        .withMessage('Invalid status'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Notes cannot exceed 2000 characters')
];

// Status update validation
const statusUpdateValidation = [
    body('status')
        .isIn(['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'])
        .withMessage('Invalid status')
];

// All routes require authentication
router.use(auth);

// @route   GET /api/v1/meetings
// @desc    Get all meetings for user
// @access  Private
router.get('/', getMeetingsValidation, meetingController.getMeetings);

// @route   GET /api/v1/meetings/upcoming
// @desc    Get upcoming meetings for user
// @access  Private
router.get('/upcoming', getMeetingsValidation, meetingController.getUpcomingMeetings);

// @route   GET /api/v1/meetings/:id
// @desc    Get single meeting
// @access  Private
router.get('/:id', meetingIdValidation, meetingController.getMeetingById);

// @route   POST /api/v1/meetings
// @desc    Create new meeting
// @access  Private
router.post('/', meetingCreateLimiter, createMeetingValidation, meetingController.createMeeting);

// @route   PUT /api/v1/meetings/:id
// @desc    Update meeting
// @access  Private
router.put('/:id', [...meetingIdValidation, ...updateMeetingValidation], meetingController.updateMeeting);

// @route   DELETE /api/v1/meetings/:id
// @desc    Delete meeting
// @access  Private
router.delete('/:id', meetingIdValidation, meetingController.deleteMeeting);

// @route   PATCH /api/v1/meetings/:id/status
// @desc    Update meeting status
// @access  Private
router.patch('/:id/status', [...meetingIdValidation, ...statusUpdateValidation], meetingController.updateMeetingStatus);

module.exports = router;
