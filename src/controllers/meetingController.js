const { validationResult } = require('express-validator');
const Meeting = require('../models/Meeting');
const MeetingTypeDefinition = require('../models/MeetingTypeDefinition'); // Fix: Use correct model
const notificationService = require('../services/simpleNotificationService'); // Add this

// @desc    Get all meetings for user
// @route   GET /api/v1/meetings
// @access  Private
const getMeetings = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { userId: req.user._id };

        // Add status filter if provided
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Add date range filter if provided
        if (req.query.startDate || req.query.endDate) {
            filter.scheduledAt = {};
            if (req.query.startDate) {
                filter.scheduledAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.scheduledAt.$lte = new Date(req.query.endDate);
            }
        }

        const meetings = await Meeting.find(filter)
            .populate('meetingTypeId', 'name color duration')
            .sort({ scheduledAt: req.query.upcoming === 'true' ? 1 : -1 })
            .skip(skip)
            .limit(limit);

        const total = await Meeting.countDocuments(filter);
        const hasMore = skip + meetings.length < total;        // Format meetings for frontend
        const formattedMeetings = meetings.map(meeting => ({
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date || meeting.formattedDate, // Use stored date field first
            time: meeting.time || meeting.formattedTime, // Use stored time field first
            duration: meeting.duration,
            attendees: meeting.attendeeCount,
            confirmedAttendees: meeting.confirmedAttendeeCount,
            status: meeting.status,
            meetingType: meeting.meetingTypeId,
            location: meeting.location,
            notes: meeting.notes,
            timezone: meeting.timezone,
            guestInfo: meeting.guestInfo,
            createdAt: meeting.createdAt,
            updatedAt: meeting.updatedAt
        }));

        res.json({
            success: true,
            data: {
                meetings: formattedMeetings,
                pagination: {
                    page,
                    limit,
                    total,
                    hasMore,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get upcoming meetings
// @route   GET /api/v1/meetings/upcoming
// @access  Private
const getUpcomingMeetings = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {
            $or: [
                { createdBy: req.user._id },
                { userId: req.user._id }
            ],
            scheduledAt: { $gte: new Date() },
            status: { $in: ['confirmed', 'pending', 'scheduled'] }
        };

        // Add additional filters
        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.dateFrom) {
            filter.scheduledAt.$gte = new Date(req.query.dateFrom);
        }

        if (req.query.dateTo) {
            const dateTo = new Date(req.query.dateTo);
            dateTo.setHours(23, 59, 59, 999);
            filter.scheduledAt.$lte = dateTo;
        }

        if (req.query.meetingTypeId) {
            filter.meetingType = req.query.meetingTypeId;
        }

        const meetings = await Meeting.find(filter)
            .populate({
                path: 'meetingType',
                select: '_id name color'
            })
            .sort({ scheduledAt: 1 })
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true });

        const total = await Meeting.countDocuments(filter);
        const pages = Math.ceil(total / limit);
        const hasMore = page < pages;

        // Get current date for convenience calculations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Format meetings according to specified structure
        const formattedMeetings = meetings.map(meeting => {
            const scheduledDate = new Date(meeting.scheduledAt);
            const scheduledDateString = scheduledDate.toISOString().split('T')[0];
            const scheduledTimeString = scheduledDate.toTimeString().slice(0, 5); // HH:MM format

            // Calculate convenience fields
            const meetingDateOnly = new Date(scheduledDate);
            meetingDateOnly.setHours(0, 0, 0, 0);

            const isToday = meetingDateOnly.getTime() === today.getTime();
            const isTomorrow = meetingDateOnly.getTime() === tomorrow.getTime();
            const daysFromNow = Math.ceil((meetingDateOnly - today) / (1000 * 60 * 60 * 24)); return {
                _id: meeting._id,
                title: meeting.title,
                description: meeting.description || '',
                duration: meeting.duration,
                scheduledDate: meeting.date || scheduledDateString, // Use stored date field first
                scheduledTime: meeting.time || scheduledTimeString, // Use stored time field first
                scheduledDateTime: meeting.scheduledAt.toISOString(),
                status: meeting.status,
                meetingType: meeting.meetingType ? {
                    _id: meeting.meetingType._id,
                    name: meeting.meetingType.name,
                    color: meeting.meetingType.color
                } : null,
                attendees: meeting.attendees.map(attendee => ({
                    name: attendee.name,
                    email: attendee.email,
                    status: attendee.status
                })),
                attendeeCount: meeting.attendees ? meeting.attendees.length : 0,
                meetingLink: meeting.meetingLink || null,
                guestInfo: meeting.guestInfo,
                timezone: meeting.timezone,
                createdAt: meeting.createdAt.toISOString(),
                updatedAt: meeting.updatedAt.toISOString(),
                isToday: isToday,
                isTomorrow: isTomorrow,
                daysFromNow: daysFromNow
            };
        });

        res.json({
            success: true,
            data: {
                meetings: formattedMeetings,
                pagination: {
                    page: page,
                    pages: pages,
                    total: total,
                    hasMore: hasMore,
                    limit: limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single meeting
// @route   GET /api/v1/meetings/:id
// @access  Private
const getMeetingById = async (req, res, next) => {
    try {
        const meeting = await Meeting.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate('meetingTypeId', 'name color duration');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Format meeting to ensure time field is included
        const formattedMeeting = {
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date || meeting.formattedDate,
            time: meeting.time || meeting.formattedTime,
            duration: meeting.duration,
            scheduledAt: meeting.scheduledAt,
            status: meeting.status,
            attendees: meeting.attendees,
            attendeeCount: meeting.attendeeCount,
            confirmedAttendeeCount: meeting.confirmedAttendeeCount,
            organizer: meeting.organizer,
            location: meeting.location,
            notes: meeting.notes,
            timezone: meeting.timezone,
            guestInfo: meeting.guestInfo,
            meetingType: meeting.meetingTypeId,
            createdAt: meeting.createdAt,
            updatedAt: meeting.updatedAt
        };

        res.json({
            success: true,
            data: { meeting: formattedMeeting }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new meeting
// @route   POST /api/v1/meetings
// @access  Private
const createMeeting = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Fix: Use MeetingTypeDefinition instead of MeetingType
        const meetingType = await MeetingTypeDefinition.findOne({
            _id: req.body.meetingTypeId,
            createdBy: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        // Handle date and time combination
        let scheduledAt;
        let meetingDate;

        if (req.body.date && req.body.time) {
            // Combine date and time into a proper DateTime
            const dateStr = req.body.date; // Expected format: "2024-02-01"
            const timeStr = req.body.time; // Expected format: "14:30"

            meetingDate = dateStr; // Store the date separately
            scheduledAt = new Date(`${dateStr}T${timeStr}:00.000Z`);

            // Validate the date is in the future
            if (scheduledAt <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Meeting date must be in the future'
                });
            }
        } else if (req.body.scheduledAt) {
            // Use existing scheduledAt if provided
            scheduledAt = new Date(req.body.scheduledAt);
            meetingDate = scheduledAt.toISOString().split('T')[0]; // Extract date from scheduledAt
        } else {
            return res.status(400).json({
                success: false,
                message: 'Either date/time or scheduledAt is required'
            });
        } const meetingData = {
            ...req.body,
            userId: req.user._id,
            createdBy: req.user._id, // Use createdBy for consistency
            scheduledAt: scheduledAt,
            date: meetingDate,
            time: req.body.time, // Ensure time field is included
            duration: req.body.duration || meetingType.defaultDuration,
            organizer: {
                name: req.user.fullName || req.user.name || 'Unknown',
                email: req.user.email
            }
        };

        const meeting = await Meeting.create(meetingData);

        // Increment booking count for meeting type
        await meetingType.incrementBookings();

        const populatedMeeting = await Meeting.findById(meeting._id)
            .populate('meetingType', 'name color defaultDuration availableDate'); // Fix: Populate correct fields

        // Format meeting data for notification
        const formattedMeeting = {
            _id: populatedMeeting._id,
            title: populatedMeeting.title,
            date: meetingDate || populatedMeeting.formattedDate, // Use stored date or virtual
            time: populatedMeeting.formattedTime,
            scheduledAt: populatedMeeting.scheduledAt, // Include full datetime
            duration: populatedMeeting.duration,
            attendeeCount: populatedMeeting.attendeeCount,
            meetingType: populatedMeeting.meetingType
        };

        // Send real-time notification
        try {
            notificationService.sendMeetingCreated(req.user._id, formattedMeeting);
        } catch (notificationError) {
            console.log('Notification error:', notificationError.message);
            // Don't fail the meeting creation if notification fails
        }

        console.log('Meeting created successfully:', {
            meetingId: meeting._id,
            userId: req.user._id,
            title: meeting.title
        });

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: {
                meeting: {
                    ...populatedMeeting.toObject(),
                    date: meetingDate,
                    formattedDate: meetingDate,
                },
                notification: 'Real-time notification sent'
            }
        });
    } catch (error) {
        console.error('Meeting creation error:', error);
        next(error);
    }
};

// @desc    Update meeting
// @route   PUT /api/v1/meetings/:id
// @access  Private
const updateMeeting = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        } const meeting = await Meeting.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        ).populate('meetingTypeId', 'name color duration');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Format meeting to ensure time field is included
        const formattedMeeting = {
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.date || meeting.formattedDate,
            time: meeting.time || meeting.formattedTime,
            duration: meeting.duration,
            scheduledAt: meeting.scheduledAt,
            status: meeting.status,
            attendees: meeting.attendees,
            attendeeCount: meeting.attendeeCount,
            confirmedAttendeeCount: meeting.confirmedAttendeeCount,
            organizer: meeting.organizer,
            location: meeting.location,
            notes: meeting.notes,
            timezone: meeting.timezone,
            guestInfo: meeting.guestInfo,
            meetingType: meeting.meetingTypeId,
            createdAt: meeting.createdAt,
            updatedAt: meeting.updatedAt
        };

        res.json({
            success: true,
            message: 'Meeting updated successfully',
            data: { meeting: formattedMeeting }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete meeting
// @route   DELETE /api/v1/meetings/:id
// @access  Private
const deleteMeeting = async (req, res, next) => {
    try {
        const meeting = await Meeting.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // Decrement booking count for meeting type
        const meetingType = await MeetingTypeDefinition.findById(meeting.meetingTypeId);
        if (meetingType) {
            await meetingType.decrementBookings();
        }

        await Meeting.findByIdAndDelete(meeting._id);

        res.json({
            success: true,
            message: 'Meeting deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update meeting status
// @route   PATCH /api/v1/meetings/:id/status
// @access  Private
const updateMeetingStatus = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { status } = req.body;

        const meeting = await Meeting.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { status },
            { new: true, runValidators: true }
        ).populate('meetingTypeId', 'name color duration');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        res.json({
            success: true,
            message: 'Meeting status updated successfully',
            data: { meeting }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMeetings,
    getUpcomingMeetings,
    getMeetingById,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    updateMeetingStatus
};
