const { validationResult } = require('express-validator');
const MeetingType = require('../models/MeetingType');
const Meeting = require('../models/Meeting');

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

        const filter = { userId: req.user._id };

        // Add status filter if provided
        if (req.query.status) {
            filter.isActive = req.query.status === 'active';
        }

        // Build sort object
        let sortBy = req.query.sortBy || 'createdAt';
        let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sortObj = { [sortBy]: sortOrder };

        const meetingTypes = await MeetingType.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

        const total = await MeetingType.countDocuments(filter);
        const hasMore = skip + meetingTypes.length < total;

        res.json({
            success: true,
            data: {
                meetingTypes,
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

// @desc    Get meeting types statistics
// @route   GET /api/v1/meeting-types/stats
// @access  Private
const getMeetingTypesStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Get total meeting types count
        const totalMeetingTypes = await MeetingType.countDocuments({ userId });

        // Get active meeting types count
        const activeMeetingTypes = await MeetingType.countDocuments({
            userId,
            isActive: true
        });

        // Get inactive meeting types count
        const inactiveMeetingTypes = await MeetingType.countDocuments({
            userId,
            isActive: false
        });

        // Get total bookings across all meeting types
        const meetingTypes = await MeetingType.find({ userId });
        const totalBookings = meetingTypes.reduce((sum, type) => sum + (type.totalBookings || 0), 0);

        // Get most popular meeting type
        const mostPopularMeetingType = await MeetingType.findOne({ userId })
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
        const meetingType = await MeetingType.findOne({
            _id: req.params.id,
            userId: req.user._id
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

// @desc    Create new meeting type
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

        const meetingTypeData = {
            ...req.body,
            userId: req.user._id
        };

        const meetingType = await MeetingType.create(meetingTypeData);

        res.status(201).json({
            success: true,
            message: 'Meeting type created successfully',
            data: {
                meetingType
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A meeting type with this name already exists'
            });
        }
        next(error);
    }
};

// @desc    Update meeting type
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

        const meetingType = await MeetingType.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!meetingType) {
            return res.status(404).json({
                success: false,
                message: 'Meeting type not found'
            });
        }

        res.json({
            success: true,
            message: 'Meeting type updated successfully',
            data: {
                meetingType
            }
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
        const meetingType = await MeetingType.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
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
        const meetingType = await MeetingType.findOne({
            _id: req.params.id,
            userId: req.user._id
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
        const originalMeetingType = await MeetingType.findOne({
            _id: req.params.id,
            userId: req.user._id
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

        const duplicatedMeetingType = await MeetingType.create(duplicatedData);

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

        const meetingType = await MeetingType.findOne({
            _id: req.params.id,
            userId: req.user._id
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
        const meetingType = await MeetingType.findOne({
            _id: req.params.id,
            userId: req.user._id
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
        const meetingTypes = await MeetingType.find({
            _id: { $in: meetingTypeIds },
            userId: req.user._id
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
                result = await MeetingType.updateMany(
                    { _id: { $in: meetingTypeIds }, userId: req.user._id },
                    { isActive: true }
                );
                message = `${result.modifiedCount} meeting types activated successfully`;
                break;

            case 'deactivate':
                result = await MeetingType.updateMany(
                    { _id: { $in: meetingTypeIds }, userId: req.user._id },
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

                result = await MeetingType.deleteMany({
                    _id: { $in: meetingTypeIds },
                    userId: req.user._id
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
