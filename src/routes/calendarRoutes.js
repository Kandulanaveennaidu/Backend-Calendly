const express = require('express');
const { body, param, query } = require('express-validator');
const calendarController = require('../controllers/calendarController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for calendar operations
const calendarCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 creates per windowMs
    message: {
        success: false,
        message: 'Too many calendar operations, please try again later'
    }
});

// Validation for event ID parameter
const eventIdValidation = [
    param('eventId').isMongoId().withMessage('Invalid event ID format')
];

// Validation for attendee email parameter
const attendeeEmailValidation = [
    param('attendeeEmail').isEmail().withMessage('Invalid attendee email format')
];

// Validation for query parameters
const getEventsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('startDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Start date must be in YYYY-MM-DD format'),
    query('endDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('End date must be in YYYY-MM-DD format'),
    query('type')
        .optional()
        .isIn(['meeting', 'presentation', 'review', 'interview'])
        .withMessage('Invalid event type'),
    query('status')
        .optional()
        .isIn(['confirmed', 'pending', 'cancelled'])
        .withMessage('Invalid status')
];

// Validation for date range query
const dateRangeValidation = [
    query('startDate')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Start date is required and must be in YYYY-MM-DD format'),
    query('endDate')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('End date is required and must be in YYYY-MM-DD format')
];

// Validation for search query
const searchValidation = [
    query('q')
        .isLength({ min: 1 })
        .withMessage('Search query is required'),
    query('type')
        .optional()
        .isIn(['meeting', 'presentation', 'review', 'interview'])
        .withMessage('Invalid event type'),
    query('startDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Start date must be in YYYY-MM-DD format'),
    query('endDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('End date must be in YYYY-MM-DD format')
];

// Validation for creating event
const createEventValidation = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('date')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Date must be in YYYY-MM-DD format'),
    body('time')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Time must be in HH:MM format'),
    body('duration')
        .isInt({ min: 5, max: 1440 })
        .withMessage('Duration must be between 5 and 1440 minutes'),
    body('type')
        .isIn(['meeting', 'presentation', 'review', 'interview'])
        .withMessage('Invalid event type'),
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
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('location.type')
        .optional()
        .isIn(['in-person', 'video-call', 'phone'])
        .withMessage('Invalid location type'),
    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a string'),
    body('isRecurring')
        .optional()
        .isBoolean()
        .withMessage('isRecurring must be a boolean'),
    body('recurringPattern.frequency')
        .optional()
        .isIn(['daily', 'weekly', 'monthly'])
        .withMessage('Frequency must be daily, weekly, or monthly'),
    body('recurringPattern.interval')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Interval must be a positive integer'),
    body('recurringPattern.endDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('End date must be in YYYY-MM-DD format'),
    body('reminderSettings.emailReminder')
        .optional()
        .isBoolean()
        .withMessage('Email reminder must be a boolean'),
    body('reminderSettings.reminderTime')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Reminder time must be a non-negative integer')
];

// Validation for updating event
const updateEventValidation = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('date')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Date must be in YYYY-MM-DD format'),
    body('time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Time must be in HH:MM format'),
    body('duration')
        .optional()
        .isInt({ min: 5, max: 1440 })
        .withMessage('Duration must be between 5 and 1440 minutes'),
    body('type')
        .optional()
        .isIn(['meeting', 'presentation', 'review', 'interview'])
        .withMessage('Invalid event type'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('isRecurring')
        .optional()
        .isBoolean()
        .withMessage('isRecurring must be a boolean'),
    body('recurringPattern.frequency')
        .optional()
        .isIn(['daily', 'weekly', 'monthly'])
        .withMessage('Frequency must be daily, weekly, or monthly'),
    body('recurringPattern.interval')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Interval must be a positive integer'),
    body('recurringPattern.endDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('End date must be in YYYY-MM-DD format')
];

// Status update validation
const statusUpdateValidation = [
    body('status')
        .isIn(['confirmed', 'pending', 'cancelled'])
        .withMessage('Invalid status')
];

// Add attendees validation
const addAttendeesValidation = [
    body('attendees')
        .isArray({ min: 1 })
        .withMessage('At least one attendee is required'),
    body('attendees.*.name')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Attendee name is required'),
    body('attendees.*.email')
        .isEmail()
        .withMessage('Valid attendee email is required')
];

// All routes require authentication
router.use(auth);

// 1. Get All Events/Meetings
router.get('/events', getEventsValidation, calendarController.getAllEvents);

// 2. Get Events by Date Range
router.get('/events/date-range', dateRangeValidation, calendarController.getEventsByDateRange);

// 3. Get Today's Events
router.get('/events/today', calendarController.getTodaysEvents);

// 4. Get Upcoming Events
router.get('/events/upcoming', [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50')
], calendarController.getUpcomingEvents);

// 5. Search Events
router.get('/events/search', searchValidation, calendarController.searchEvents);

// 6. Get Calendar Statistics
router.get('/stats', calendarController.getCalendarStats);

// 7. Create New Event/Meeting
router.post('/events', calendarCreateLimiter, createEventValidation, calendarController.createEvent);

// 8. Update Event/Meeting
router.put('/events/:eventId', [...eventIdValidation, ...updateEventValidation], calendarController.updateEvent);

// 9. Delete Event/Meeting
router.delete('/events/:eventId', eventIdValidation, calendarController.deleteEvent);

// 10. Update Event Status
router.patch('/events/:eventId/status', [...eventIdValidation, ...statusUpdateValidation], calendarController.updateEventStatus);

// 11. Add Attendee to Event
router.post('/events/:eventId/attendees', [...eventIdValidation, ...addAttendeesValidation], calendarController.addAttendees);

// 12. Remove Attendee from Event
router.delete('/events/:eventId/attendees/:attendeeEmail', [...eventIdValidation, ...attendeeEmailValidation], calendarController.removeAttendee);

module.exports = router;
