const express = require('express');
const { body, param, query } = require('express-validator');
const meetingController = require('../controllers/meetingController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const MeetingTypeDefinition = require('../models/MeetingTypeDefinition');
const Meeting = require('../models/Meeting');
const moment = require('moment-timezone');
const emailService = require('../services/emailService');
const zoomService = require('../services/zoomService');

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

// PUBLIC ROUTES FIRST (no auth required)
// Get Meeting Type Details (Public)
router.get('/public/:meetingTypeId', async (req, res, next) => {
    try {
        const { meetingTypeId } = req.params;

        // Check if meetingTypeId is valid
        if (!meetingTypeId || meetingTypeId === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Valid meetingTypeId is required'
            });
        }

        const mt = await MeetingTypeDefinition.findById(meetingTypeId)
            .populate('createdBy', 'email')
            .lean();

        if (!mt) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found.'
            });
        }

        res.json({
            success: true,
            data: {
                id: mt._id,
                name: mt.name,
                description: mt.description,
                duration: mt.defaultDuration,
                color: mt.color,
                isActive: mt.isActive,
                email: mt.createdBy?.email || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

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

// Get Available Times with Timezone Support (Public)
router.get('/public/:meetingTypeId/available-times', async (req, res, next) => {
    try {
        const { meetingTypeId } = req.params;
        const { date, timezone = 'UTC' } = req.query;

        const mt = await MeetingTypeDefinition.findById(meetingTypeId).lean();
        if (!mt) {
            return res.status(404).json({ success: false, message: 'Meeting type not found.' });
        }

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required.' });
        }

        // Get booked times for this date
        const meetings = await Meeting.find({
            meetingTypeId,
            date,
            status: { $nin: ['cancelled'] }
        }).select('time');
        const bookedTimes = meetings.map(m => m.time);

        // Generate available slots with timezone conversion
        const times = [];
        mt.availableTimeSlots.forEach(slot => {
            const slotTimezone = slot.timezone || mt.timezone;

            // Convert slot times to requested timezone
            const startMoment = moment.tz(`${date} ${slot.start}`, 'YYYY-MM-DD HH:mm', slotTimezone);
            const endMoment = moment.tz(`${date} ${slot.end}`, 'YYYY-MM-DD HH:mm', slotTimezone);

            // Convert to requested timezone
            const convertedStart = startMoment.clone().tz(timezone);
            const convertedEnd = endMoment.clone().tz(timezone);

            // Generate slots in requested timezone
            let current = convertedStart.clone();
            while (current.isBefore(convertedEnd.subtract(mt.defaultDuration, 'minutes'))) {
                const timeString = current.format('HH:mm');
                if (!bookedTimes.includes(timeString)) {
                    times.push(timeString);
                }
                current.add(mt.defaultDuration, 'minutes');
            }
        });

        res.json({
            success: true,
            data: {
                times,
                timezone,
                originalTimezone: mt.timezone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching available times.' });
    }
});

// Create Booking with Timezone Support (Public)
router.post('/public/:meetingTypeId/bookings', async (req, res, next) => {
    try {
        const { meetingTypeId } = req.params;
        const { date, time, timezone = 'UTC', guestInfo } = req.body;

        if (!meetingTypeId || !date || !time || !guestInfo || !guestInfo.name || !guestInfo.email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: meetingTypeId, date, time, guestInfo'
            });
        } console.log('🔍 Booking request details:');
        console.log('Meeting Type ID:', meetingTypeId);
        console.log('Requested Date:', date);
        console.log('Requested Time:', time);
        console.log('Requested Timezone:', timezone);
        console.log('Guest Info:', guestInfo);

        const mt = await MeetingTypeDefinition.findById(meetingTypeId).lean();
        if (!mt) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found.'
            });
        }

        console.log('📋 Meeting Type Details:');
        console.log('Name:', mt.name);
        console.log('Meeting Type Timezone:', mt.timezone);
        console.log('Default Duration:', mt.defaultDuration);

        // Convert booking time to meeting type's timezone for storage
        const bookingMoment = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
        const storageTime = bookingMoment.clone().tz(mt.timezone || 'UTC').format('HH:mm');
        const storageDate = bookingMoment.clone().tz(mt.timezone || 'UTC').format('YYYY-MM-DD');

        console.log('🕐 Time Conversion:');
        console.log('Storage Date:', storageDate);
        console.log('Storage Time:', storageTime);
        console.log('Booking Moment:', bookingMoment.format());

        // Check if slot is available in storage timezone
        const existingMeeting = await Meeting.findOne({
            meetingTypeId,
            date: storageDate,
            time: storageTime,
            status: { $nin: ['cancelled'] }
        });

        console.log('🔍 Existing Meeting Check:');
        console.log('Query:', { meetingTypeId, date: storageDate, time: storageTime, status: { $nin: ['cancelled'] } });
        console.log('Existing Meeting Found:', existingMeeting ? 'YES' : 'NO');

        if (existingMeeting) {
            console.log('❌ Conflict found with existing meeting:', existingMeeting._id);
            return res.status(409).json({
                success: false,
                message: 'Time slot no longer available.',
                debug: {
                    requestedSlot: { date: storageDate, time: storageTime },
                    conflictingMeeting: existingMeeting._id
                }
            });
        }// Create booking with timezone info
        const meeting = await Meeting.create({
            meetingTypeId,
            meetingOwnerId: mt.createdBy,
            userId: mt.createdBy,
            title: `${mt.name} with ${guestInfo.name}`,
            date: storageDate,
            time: storageTime,
            originalDate: date, // Store original guest date
            originalTime: time, // Store original guest time
            duration: mt.defaultDuration,
            guestInfo,
            status: 'confirmed',
            scheduledAt: bookingMoment.toDate(),
            timezone: timezone, // Store guest's timezone
            organizer: {
                name: mt.organizer?.name || 'Meeting Organizer',
                email: mt.organizer?.email || 'no-reply@example.com'
            }
        }); await MeetingTypeDefinition.findByIdAndUpdate(meetingTypeId, { $inc: { totalBookings: 1 } });

        // Create Zoom meeting
        let zoomMeetingData = null;
        try {
            console.log('🎥 Creating Zoom meeting...');

            // Prepare Zoom meeting data
            const zoomData = {
                topic: `${mt.name} with ${guestInfo.name}`,
                startTime: bookingMoment.toISOString(),
                duration: mt.defaultDuration,
                timezone: timezone,
                guestName: guestInfo.name,
                guestEmail: guestInfo.email,
                agenda: `${mt.name} meeting scheduled through the booking system.`
            };

            zoomMeetingData = await zoomService.createMeeting(zoomData);

            // Update meeting with Zoom details
            await Meeting.findByIdAndUpdate(meeting._id, {
                $set: {
                    zoomMeetingId: zoomMeetingData.meetingId,
                    zoomJoinUrl: zoomMeetingData.joinUrl,
                    zoomMeetingNumber: zoomMeetingData.meetingNumber,
                    zoomPassword: zoomMeetingData.password,
                    zoomStartUrl: zoomMeetingData.startUrl
                }
            });

            console.log('✅ Zoom meeting created successfully:', zoomMeetingData.meetingNumber);
        } catch (zoomError) {
            console.error('❌ Failed to create Zoom meeting:', zoomError.message);
            // Continue without Zoom meeting - don't fail the booking
        }

        // Send email notifications
        try {            // Prepare booking data for email
            const bookingEmailData = {
                guestInfo,
                title: meeting.title,
                date: date, // Original guest date
                time: time, // Original guest time
                timezone: timezone,
                duration: mt.defaultDuration,
                meetingName: mt.name,
                organizer: meeting.organizer,
                // Add Zoom meeting details
                zoomMeeting: zoomMeetingData ? {
                    joinUrl: zoomMeetingData.joinUrl,
                    meetingNumber: zoomMeetingData.meetingNumber,
                    password: zoomMeetingData.password,
                    startUrl: zoomMeetingData.startUrl
                } : null
            };

            // Send confirmation email to customer
            await emailService.sendBookingConfirmation(bookingEmailData);

            // Send notification to host/organizer
            if (mt.createdBy && meeting.organizer?.email) {
                await emailService.sendBookingNotificationToHost(bookingEmailData, meeting.organizer.email);
            }

            console.log('Booking confirmation emails sent successfully');
        } catch (emailError) {
            console.error('Failed to send booking emails:', emailError);
            // Don't fail the booking creation if email fails
        } res.status(201).json({
            success: true,
            message: 'Meeting scheduled successfully!',
            data: {
                bookingId: meeting._id,
                confirmedDate: date,
                confirmedTime: time,
                timezone: timezone,
                meetingName: mt.name,
                // Include Zoom meeting details in response
                zoomMeeting: zoomMeetingData ? {
                    joinUrl: zoomMeetingData.joinUrl,
                    meetingNumber: zoomMeetingData.meetingNumber,
                    password: zoomMeetingData.password,
                    meetingId: zoomMeetingData.meetingId
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating booking.' });
    }
});

// Public: Get all bookings for a meeting type
router.get('/public/:meetingTypeId/bookings', async (req, res, next) => {
    try {
        const { meetingTypeId } = req.params;

        // Get meeting type to know its timezone
        const meetingType = await MeetingTypeDefinition.findById(meetingTypeId);
        if (!meetingType) {
            return res.status(404).json({ success: false, message: 'Meeting type not found' });
        }

        const bookings = await Meeting.find({
            meetingTypeId,
            status: { $nin: ['cancelled'] }
        }).sort({ date: 1, time: 1 }).lean();

        res.json({
            success: true,
            data: bookings.map(b => {
                // Use stored original values if available, otherwise convert
                let confirmedTime = b.originalTime || b.time;
                let confirmedDate = b.originalDate || b.date;

                // If no original values stored, convert from meeting type timezone to guest timezone
                if (!b.originalTime && b.timezone && b.timezone !== meetingType.timezone) {
                    const storedMoment = moment.tz(`${b.date} ${b.time}`, 'YYYY-MM-DD HH:mm', meetingType.timezone);
                    const guestMoment = storedMoment.tz(b.timezone);
                    confirmedTime = guestMoment.format('HH:mm');
                    confirmedDate = guestMoment.format('YYYY-MM-DD');
                }

                return {
                    id: b._id,
                    title: b.title,
                    date: confirmedDate,
                    time: confirmedTime, // This will now show the guest's original time
                    confirmedTime: confirmedTime, // Keep for backward compatibility
                    confirmedDate: confirmedDate, // Keep for backward compatibility
                    timezone: b.timezone || meetingType.timezone,
                    storageTime: b.time, // Time in meeting type's timezone (for internal use)
                    storageDate: b.date, // Date in meeting type's timezone (for internal use)
                    guestInfo: b.guestInfo,
                    status: b.status,
                    duration: b.duration,
                    createdAt: b.createdAt
                };
            })
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/meetings/recent
// @desc    Get recent meetings with Zoom details (protected route)
// @access  Private
router.get('/recent', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const meetings = await Meeting.find({
            userId: req.user.userId
        })
            .populate('meetingTypeId', 'name description')
            .sort({ scheduledAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const totalMeetings = await Meeting.countDocuments({
            userId: req.user.userId
        });

        // Format meetings for frontend
        const formattedMeetings = meetings.map(meeting => ({
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date,
            time: meeting.time,
            originalDate: meeting.originalDate,
            originalTime: meeting.originalTime,
            duration: meeting.duration,
            status: meeting.status,
            timezone: meeting.timezone,
            guestInfo: meeting.guestInfo,
            meetingType: meeting.meetingTypeId,
            zoomMeeting: meeting.zoomMeetingId ? {
                meetingId: meeting.zoomMeetingId,
                meetingNumber: meeting.zoomMeetingNumber,
                joinUrl: meeting.zoomJoinUrl,
                startUrl: meeting.zoomStartUrl,
                password: meeting.zoomPassword
            } : null,
            createdAt: meeting.createdAt,
            updatedAt: meeting.updatedAt
        }));

        res.json({
            success: true,
            data: {
                meetings: formattedMeetings,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalMeetings / limit),
                    totalMeetings,
                    hasNext: skip + meetings.length < totalMeetings,
                    hasPrev: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get recent meetings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent meetings'
        });
    }
});

// @route   POST /api/v1/meetings/zoom-webhook
// @desc    Handle Zoom webhook events
// @access  Public (but verified)
router.post('/zoom-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['authorization'];
        const timestamp = req.headers['x-zm-request-timestamp'];
        const body = req.body.toString();

        // Verify webhook signature
        if (!zoomService.verifyWebhookSignature(signature, timestamp, body)) {
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        const event = JSON.parse(body);
        console.log('🎥 Zoom webhook received:', event.event);

        // Handle different Zoom events
        switch (event.event) {
            case 'meeting.started':
                console.log(`Meeting started: ${event.payload.object.id}`);
                // Update meeting status to 'in-progress'
                await Meeting.findOneAndUpdate(
                    { zoomMeetingId: event.payload.object.id },
                    { status: 'in-progress' }
                );
                break;

            case 'meeting.ended':
                console.log(`Meeting ended: ${event.payload.object.id}`);
                // Update meeting status to 'completed'
                await Meeting.findOneAndUpdate(
                    { zoomMeetingId: event.payload.object.id },
                    { status: 'completed' }
                );
                break;

            case 'meeting.participant_joined':
                console.log(`Participant joined: ${event.payload.object.participant.user_name}`);
                break;

            case 'meeting.participant_left':
                console.log(`Participant left: ${event.payload.object.participant.user_name}`);
                break;

            default:
                console.log(`Unhandled Zoom event: ${event.event}`);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Zoom webhook error:', error);
        res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
});

// @route   GET /api/v1/meetings/debug/:meetingTypeId
// @desc    Debug endpoint to check existing meetings for a meeting type
// @access  Public (for debugging)
router.get('/debug/:meetingTypeId', async (req, res) => {
    try {
        const { meetingTypeId } = req.params;

        const meetings = await Meeting.find({ meetingTypeId })
            .select('date time status guestInfo.name createdAt')
            .sort({ date: 1, time: 1 });

        const meetingType = await MeetingTypeDefinition.findById(meetingTypeId)
            .select('name timezone defaultDuration');

        res.json({
            success: true,
            data: {
                meetingType,
                existingMeetings: meetings,
                totalMeetings: meetings.length
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Debug query failed',
            error: error.message
        });
    }
});

// All routes require authentication
router.use(auth);

module.exports = router;
