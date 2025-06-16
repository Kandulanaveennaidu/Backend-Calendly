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
    body('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be in YYYY-MM-DD format'),
    body('time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Time must be in HH:MM format'),
    body('scheduledAt')
        .optional()
        .isISO8601()
        .withMessage('ScheduledAt must be a valid ISO date'),
    body('duration')
        .optional()
        .isInt({ min: 5, max: 480 })
        .withMessage('Duration must be between 5 and 480 minutes'),
    body('meetingTypeId')
        .isMongoId()
        .withMessage('Valid meeting type ID is required'),
    body('attendees')
        .optional()
        .isArray()
        .withMessage('Attendees must be an array'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters')
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

// Public routes
// GET /api/v1/meetings/public/:meetingTypeId/slots?date=YYYY-MM-DD
router.get('/public/:meetingTypeId/slots', async (req, res, next) => {
    try {
        const { meetingTypeId } = req.params;
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date parameter is required (YYYY-MM-DD)' });
        }
        const meetingType = await MeetingTypeDefinition.findById(meetingTypeId);
        if (!meetingType) {
            return res.status(404).json({ success: false, message: 'Meeting type not found' });
        }
        // Get existing bookings for the date
        const existingMeetings = await Meeting.find({
            meetingTypeId: meetingTypeId,
            date: date,
            status: { $nin: ['cancelled'] }
        }).select('time');
        const bookedSlots = existingMeetings.map(m => m.time);
        // Generate all possible slots
        const slots = [];
        meetingType.availableTimeSlots.forEach(slot => {
            const [startHour, startMin] = slot.start.split(':').map(Number);
            const [endHour, endMin] = slot.end.split(':').map(Number);
            const startTime = startHour * 60 + startMin;
            const endTime = endHour * 60 + endMin;
            for (let time = startTime; time + meetingType.defaultDuration <= endTime; time += meetingType.defaultDuration) {
                const hours = Math.floor(time / 60);
                const minutes = time % 60;
                const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }
        });
        const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
        res.json({
            success: true,
            data: {
                availableSlots,
                bookedSlots
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/meetings/public
router.post('/public', async (req, res, next) => {
    try {
        const { meetingTypeId, meetingOwnerId, title, date, time, guestInfo } = req.body;
        if (!meetingTypeId || !meetingOwnerId || !date || !time || !guestInfo) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const meetingType = await MeetingTypeDefinition.findOne({ _id: meetingTypeId, createdBy: meetingOwnerId, isActive: true });
        if (!meetingType) {
            return res.status(404).json({ success: false, message: 'Meeting type not found' });
        }
        // Check if slot is still available
        const existingMeeting = await Meeting.findOne({
            meetingTypeId: meetingTypeId,
            date: date,
            time: time,
            status: { $nin: ['cancelled'] }
        });
        if (existingMeeting) {
            return res.status(409).json({ success: false, message: 'This time slot is no longer available' });
        }
        const scheduledAt = new Date(`${date}T${time}:00.000Z`);
        const meeting = await Meeting.create({
            meetingTypeId,
            meetingOwnerId,
            title: title || `${meetingType.name} with ${guestInfo.name}`,
            date,
            time,
            duration: meetingType.defaultDuration,
            guestInfo,
            status: 'confirmed',
            scheduledAt
        });
        await MeetingTypeDefinition.findByIdAndUpdate(meetingTypeId, { $inc: { totalBookings: 1 } });
        res.status(201).json({
            success: true,
            data: {
                _id: meeting._id,
                meetingTypeId: meeting.meetingTypeId,
                meetingOwnerId: meeting.meetingOwnerId,
                title: meeting.title,
                date: meeting.date,
                time: meeting.time,
                duration: meeting.duration,
                guestInfo: meeting.guestInfo,
                status: meeting.status,
                createdAt: meeting.createdAt
            },
            message: 'Booking created successfully!'
        });
    } catch (error) {
        next(error);
    }
});

// Public: Get all bookings for a meeting type
router.get('/public/:meetingTypeId/bookings', async (req, res, next) => {
    try {
        const { meetingTypeId } = req.params;
        const bookings = await require('../models/Meeting').find({
            meetingTypeId,
            status: { $nin: ['cancelled'] }
        }).sort({ date: 1, time: 1 }).lean();

        res.json({
            success: true,
            data: bookings.map(b => ({
                id: b._id,
                title: b.title,
                date: b.date,
                time: b.time,
                guestInfo: b.guestInfo,
                status: b.status,
                createdAt: b.createdAt
            }))
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
