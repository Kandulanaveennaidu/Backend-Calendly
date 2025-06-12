const { validationResult } = require('express-validator');
const Meeting = require('../models/Meeting');
const MeetingType = require('../models/MeetingType');

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
        const hasMore = skip + meetings.length < total;

        // Format meetings for frontend
        const formattedMeetings = meetings.map(meeting => ({
            id: meeting._id,
            title: meeting.title,
            description: meeting.description,
            date: meeting.formattedDate,
            time: meeting.formattedTime,
            duration: meeting.duration,
            attendees: meeting.attendeeCount,
            confirmedAttendees: meeting.confirmedAttendeeCount,
            status: meeting.status,
            meetingType: meeting.meetingTypeId,
            location: meeting.location,
            notes: meeting.notes,
            timezone: meeting.timezone,
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

        const filter = {
            userId: req.user._id,
            scheduledAt: { $gte: new Date() },
            status: { $in: ['scheduled', 'confirmed'] }
        };

        const meetings = await Meeting.find(filter)
            .populate('meetingTypeId', 'name color duration')
            .sort({ scheduledAt: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Meeting.countDocuments(filter);
        const hasMore = skip + meetings.length < total;

        // Format meetings for frontend
        const formattedMeetings = meetings.map(meeting => ({
            id: meeting._id,
            title: meeting.title,
            date: meeting.formattedDate,
            time: meeting.formattedTime,
            attendees: meeting.attendeeCount,
            status: meeting.status,
            meetingType: meeting.meetingTypeId
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

        res.json({
            success: true,
            data: { meeting }
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

        // Verify meeting type belongs to user
        const meetingType = await MeetingType.findOne({
            _id: req.body.meetingTypeId,
            userId: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        const meetingData = {
            ...req.body,
            userId: req.user._id,
            duration: req.body.duration || meetingType.duration,
            organizer: {
                name: req.user.fullName,
                email: req.user.email
            }
        };

        const meeting = await Meeting.create(meetingData);

        // Increment booking count for meeting type
        await meetingType.incrementBookings();

        const populatedMeeting = await Meeting.findById(meeting._id)
            .populate('meetingTypeId', 'name color duration');

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: { meeting: populatedMeeting }
        });
    } catch (error) {
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
        }

        const meeting = await Meeting.findOneAndUpdate(
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

        res.json({
            success: true,
            message: 'Meeting updated successfully',
            data: { meeting }
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
        const meetingType = await MeetingType.findById(meeting.meetingTypeId);
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
