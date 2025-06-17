const { validationResult } = require('express-validator');
const MeetingTypeDefinition = require('../models/MeetingTypeDefinition');
const Meeting = require('../models/Meeting');
const notificationService = require('../services/simpleNotificationService');

// @desc    Get all meeting types for user
// @route   GET /api/v1/meeting-types
// @access  Private
const getMeetingTypes = async (req, res, next) => {
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

        const filter = { createdBy: req.user._id };

        // ✅ Filter by availableDate if provided
        if (req.query.availableDate) {
            const filterDate = new Date(req.query.availableDate);
            filter.availableDate = {
                $gte: new Date(filterDate.setHours(0, 0, 0, 0)),
                $lt: new Date(filterDate.setHours(23, 59, 59, 999))
            };
        }

        if (req.query.status === 'active') {
            filter.isActive = true;
        } else if (req.query.status === 'inactive') {
            filter.isActive = false;
        }

        const meetingTypes = await MeetingTypeDefinition.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true });

        const total = await MeetingTypeDefinition.countDocuments(filter);

        // ✅ Format response to include availableDate and dateFormatted
        const formattedMeetingTypes = meetingTypes.map(mt => ({
            ...mt,
            availableDate: mt.availableDate,
            dateFormatted: mt.dateFormatted, // Virtual field
            duration: mt.defaultDuration, // Map defaultDuration to duration for frontend compatibility
        }));

        res.json({
            success: true,
            data: {
                meetingTypes: formattedMeetingTypes,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalMeetingTypes: total,
                    limit,
                    hasMore: skip + meetingTypes.length < total
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get meeting types statistics
// @route   GET /api/v1/meeting-types/stats
// @access  Private
const getMeetingTypesStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Get total meeting types count
        const totalMeetingTypes = await MeetingTypeDefinition.countDocuments({ userId });

        // Get active meeting types count
        const activeMeetingTypes = await MeetingTypeDefinition.countDocuments({
            userId,
            isActive: true
        });

        // Get inactive meeting types count
        const inactiveMeetingTypes = await MeetingTypeDefinition.countDocuments({
            userId,
            isActive: false
        });

        // Get total bookings across all meeting types
        const meetingTypes = await MeetingTypeDefinition.find({ userId });
        const totalBookings = meetingTypes.reduce((sum, type) => sum + (type.totalBookings || 0), 0);

        // Get most popular meeting type
        const mostPopularMeetingType = await MeetingTypeDefinition.findOne({ userId })
            .sort({ totalBookings: -1 })
            .limit(1);

        res.json({
            success: true,
            data: {
                stats: {
                    totalMeetingTypes,
                    activeMeetingTypes,
                    inactiveMeetingTypes,
                    totalBookings,
                    mostPopularMeetingType: mostPopularMeetingType ? {
                        name: mostPopularMeetingType.name,
                        bookings: mostPopularMeetingType.totalBookings
                    } : null
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single meeting type
// @route   GET /api/v1/meeting-types/:id
// @access  Private
const getMeetingTypeById = async (req, res, next) => {
    try {
        const meetingType = await MeetingTypeDefinition.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        res.json({
            success: true,
            data: {
                meetingType
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create meeting type with availableDate
// @route   POST /api/v1/meeting-types
// @access  Private
const createMeetingType = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Ensure availableDate is provided
        if (!req.body.availableDate) {
            return res.status(400).json({
                success: false,
                message: 'availableDate is required'
            });
        }

        const meetingTypeData = {
            name: req.body.name,
            description: req.body.description || '',
            defaultDuration: req.body.duration || req.body.defaultDuration,
            color: req.body.color || '#006bff',
            icon: req.body.icon || 'FiCalendar',
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,

            // ✅ Handle availableDate properly
            availableDate: new Date(req.body.availableDate),

            // Calendar Integration Fields
            availableDays: req.body.availableDays || [1, 2, 3, 4, 5],
            availableTimeSlots: req.body.availableTimeSlots?.map(slot => ({
                start: slot.start,
                end: slot.end,
                timezone: slot.timezone || req.body.timezone || 'UTC' // NEW FIELD
            })) || [{ start: "09:00", end: "17:00", timezone: req.body.timezone || 'UTC' }],
            timezone: req.body.timezone || 'UTC', // NEW FIELD
            bufferTime: req.body.bufferTime || 0,
            maxBookingsPerDay: req.body.maxBookingsPerDay || 10,
            advanceBookingDays: req.body.advanceBookingDays || 30,
            minimumNotice: req.body.minimumNotice || 24,

            // Settings object
            settings: req.body.settings || {
                bufferTimeBefore: 5,
                bufferTimeAfter: 5,
                allowRescheduling: true,
                allowCancellation: true,
                requireApproval: false,
                maxAdvanceBooking: 30
            },

            createdBy: req.user._id,
            totalBookings: 0
        };

        const meetingType = await MeetingTypeDefinition.create(meetingTypeData);

        // Generate booking link
        const bookingLink = `scheduleme.com/${req.user._id}/${meetingType.name.toLowerCase().replace(/\s+/g, '-')}-${meetingType._id.toString().slice(-6)}`;

        // Update with booking link
        meetingType.bookingLink = bookingLink;
        await meetingType.save();

        // Send notification
        try {
            notificationService.sendMeetingTypeCreated(req.user._id, meetingType);
        } catch (notificationError) {
            console.log('Notification error:', notificationError.message);
        }

        // ✅ Format response with availableDate and dateFormatted
        const responseData = {
            ...meetingType.toObject(),
            availableDate: meetingType.availableDate,
            dateFormatted: meetingType.dateFormatted, // Virtual field
            bookingLink: bookingLink
        };

        res.status(201).json({
            success: true,
            message: 'Meeting type created successfully',
            data: {
                meetingType: responseData
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Meeting type name already exists'
            });
        }
        next(error);
    }
};

// @desc    Update meeting type with availableDate
// @route   PUT /api/v1/meeting-types/:id
// @access  Private
const updateMeetingType = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const updateData = { ...req.body };

        // ✅ Handle availableDate update
        if (req.body.availableDate) {
            updateData.availableDate = new Date(req.body.availableDate);
        }

        // Map duration to defaultDuration if provided
        if (req.body.duration) {
            updateData.defaultDuration = req.body.duration;
        }

        const meetingType = await MeetingTypeDefinition.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id },
            updateData,
            { new: true, runValidators: true }
        ).lean({ virtuals: true });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        // ✅ Format response with availableDate and dateFormatted
        const responseData = {
            ...meetingType,
            availableDate: meetingType.availableDate,
            dateFormatted: meetingType.dateFormatted,
            duration: meetingType.defaultDuration
        };

        res.json({
            success: true,
            message: 'Meeting type updated successfully',
            data: { meetingType: responseData }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete meeting type
// @route   DELETE /api/v1/meeting-types/:id
// @access  Private
const deleteMeetingType = async (req, res, next) => {
    try {
        const meetingType = await MeetingTypeDefinition.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        res.json({
            success: true,
            message: 'Meeting type deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle meeting type active status
// @route   PATCH /api/v1/meeting-types/:id/toggle-status
// @access  Private
const toggleMeetingTypeStatus = async (req, res, next) => {
    try {
        const meetingType = await MeetingTypeDefinition.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        meetingType.isActive = !meetingType.isActive;
        await meetingType.save();

        res.json({
            success: true,
            message: `Meeting type ${meetingType.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                meetingType
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Duplicate meeting type
// @route   POST /api/v1/meeting-types/:id/duplicate
// @access  Private
const duplicateMeetingType = async (req, res, next) => {
    try {
        const originalMeetingType = await MeetingTypeDefinition.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!originalMeetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        const duplicatedData = {
            ...originalMeetingType.toObject(),
            name: `${originalMeetingType.name} (Copy)`,
            bookingLink: undefined, // Will be auto-generated
            totalBookings: 0
        };

        delete duplicatedData._id;
        delete duplicatedData.__v;
        delete duplicatedData.createdAt;
        delete duplicatedData.updatedAt;

        const duplicatedMeetingType = await MeetingTypeDefinition.create(duplicatedData);

        res.status(201).json({
            success: true,
            message: 'Meeting type duplicated successfully',
            data: {
                meetingType: duplicatedMeetingType
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update meeting type settings only
// @route   PATCH /api/v1/meeting-types/:id/settings
// @access  Private
const updateMeetingTypeSettings = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const meetingType = await MeetingTypeDefinition.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        // Update only settings
        if (req.body.settings) {
            meetingType.settings = { ...meetingType.settings, ...req.body.settings };
            await meetingType.save();
        }

        res.json({
            success: true,
            message: 'Meeting type settings updated successfully',
            data: {
                meetingType
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bookings for a specific meeting type
// @route   GET /api/v1/meeting-types/:id/bookings
// @access  Private
const getMeetingTypeBookings = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // First check if meeting type exists and belongs to user
        const meetingType = await MeetingTypeDefinition.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {
            userId: req.user._id,
            meetingTypeId: req.params.id
        };

        // Add status filter if provided
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const bookings = await Meeting.find(filter)
            .populate('meetingTypeId', 'name color duration')
            .sort({ scheduledAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Meeting.countDocuments(filter);
        const hasMore = skip + bookings.length < total;

        res.json({
            success: true,
            data: {
                bookings,
                meetingType: {
                    id: meetingType._id,
                    name: meetingType.name,
                    totalBookings: meetingType.totalBookings
                },
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

// @desc    Bulk update meeting types (activate/deactivate/delete multiple)
// @route   POST /api/v1/meeting-types/bulk-update
// @access  Private
const bulkUpdateMeetingTypes = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { meetingTypeIds, action } = req.body;

        // Verify all meeting types belong to the user
        const meetingTypes = await MeetingTypeDefinition.find({
            _id: { $in: meetingTypeIds },
            createdBy: req.user._id
        });

        if (meetingTypes.length !== meetingTypeIds.length) {
            return res.status(404).json({
                success: false,
                message: 'One or more meeting types not found'
            });
        }

        let result;
        let message;

        switch (action) {
            case 'activate':
                result = await MeetingTypeDefinition.updateMany(
                    { _id: { $in: meetingTypeIds }, createdBy: req.user._id },
                    { isActive: true }
                );
                message = `${result.modifiedCount} meeting types activated successfully`;
                break;

            case 'deactivate':
                result = await MeetingTypeDefinition.updateMany(
                    { _id: { $in: meetingTypeIds }, createdBy: req.user._id },
                    { isActive: false }
                );
                message = `${result.modifiedCount} meeting types deactivated successfully`;
                break;

            case 'delete':
                // Also delete related meetings
                await Meeting.deleteMany({
                    meetingTypeId: { $in: meetingTypeIds },
                    userId: req.user._id
                });

                result = await MeetingTypeDefinition.deleteMany({
                    _id: { $in: meetingTypeIds },
                    createdBy: req.user._id
                });
                message = `${result.deletedCount} meeting types deleted successfully`;
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action specified'
                });
        }

        res.json({
            success: true,
            message,
            data: {
                affectedCount: result.modifiedCount || result.deletedCount,
                action
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMeetingTypes,
    getMeetingTypesStats,
    getMeetingTypeById,
    createMeetingType,
    updateMeetingType,
    deleteMeetingType,
    toggleMeetingTypeStatus,
    duplicateMeetingType,
    updateMeetingTypeSettings,
    getMeetingTypeBookings,
    bulkUpdateMeetingTypes
};
