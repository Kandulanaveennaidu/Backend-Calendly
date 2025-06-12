const { validationResult } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const VerificationCode = require('../models/VerificationCode');
const MeetingType = require('../models/MeetingType');
const Meeting = require('../models/Meeting');

// @desc    Get current user profile
// @route   GET /api/v1/profile
// @access  Private
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    isEmailVerified: user.isEmailVerified,
                    role: user.role,
                    bio: user.bio || '',
                    phone: user.phone || '',
                    timezone: user.timezone || 'UTC',
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    lastLoginAt: user.lastLoginAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/v1/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const allowedUpdates = ['firstName', 'lastName', 'avatar', 'bio', 'phone', 'timezone'];
        const updates = {};

        // Only include allowed fields that are present in request
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    avatar: user.avatar,
                    bio: user.bio || '',
                    phone: user.phone || '',
                    timezone: user.timezone || 'UTC',
                    isEmailVerified: user.isEmailVerified,
                    role: user.role,
                    updatedAt: user.updatedAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload avatar (placeholder - in real app, you'd use multer for file uploads)
// @route   POST /api/v1/profile/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
    try {
        const { avatar } = req.body;

        if (!avatar) {
            return res.status(400).json({
                success: false,
                message: 'Avatar URL is required'
            });
        }

        // Validate URL format
        try {
            new URL(avatar);
        } catch (urlError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid avatar URL format'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar },
            { new: true, runValidators: true }
        ).select('-password -refreshToken');

        res.json({
            success: true,
            message: 'Avatar updated successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    avatar: user.avatar
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user account
// @route   DELETE /api/v1/profile
// @access  Private
const deleteAccount = async (req, res, next) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password confirmation is required to delete account'
            });
        }

        // Get user with password for verification
        const user = await User.findById(req.user._id).select('+password');

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Delete all user's refresh tokens
        await RefreshToken.deleteMany({ userId: req.user._id });

        // Delete all user's verification codes
        await VerificationCode.deleteMany({ userId: req.user._id });

        // Delete user account
        await User.findByIdAndDelete(req.user._id);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get user statistics
// @route   GET /api/v1/profile/stats
// @access  Private
const getUserStats = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        // Calculate account age
        const accountAge = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

        // Get active sessions count
        const activeSessions = await RefreshToken.countDocuments({
            userId: req.user._id,
            isRevoked: false,
            expiresAt: { $gt: new Date() }
        });

        res.json({
            success: true,
            data: {
                stats: {
                    accountAge: `${accountAge} days`,
                    memberSince: user.createdAt,
                    lastLogin: user.lastLoginAt,
                    emailVerified: user.isEmailVerified,
                    activeSessions,
                    role: user.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/v1/profile/dashboard-stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
    try {
        // Get total meetings count
        const totalMeetings = await Meeting.countDocuments({ userId: req.user._id });

        // Get this week's meetings
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const thisWeekMeetings = await Meeting.countDocuments({
            userId: req.user._id,
            scheduledAt: {
                $gte: weekStart,
                $lt: weekEnd
            }
        });

        // Get total meeting types count
        const totalMeetingTypes = await MeetingType.countDocuments({ userId: req.user._id });

        // Get total bookings across all meeting types
        const meetingTypes = await MeetingType.find({ userId: req.user._id });
        const totalBookings = meetingTypes.reduce((sum, type) => sum + (type.totalBookings || 0), 0);

        res.json({
            success: true,
            data: {
                statistics: [
                    {
                        title: "Total Meetings",
                        value: totalMeetings.toString(),
                        icon: "FiCalendar",
                        color: "primary"
                    },
                    {
                        title: "This Week",
                        value: thisWeekMeetings.toString(),
                        icon: "FiClock",
                        color: "success"
                    },
                    {
                        title: "Total Meeting Types",
                        value: totalMeetingTypes.toString(),
                        icon: "FiSettings",
                        color: "info"
                    },
                    {
                        title: "Total Bookings",
                        value: totalBookings.toString(),
                        icon: "FiUsers",
                        color: "warning"
                    }
                ]
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAccount,
    getUserStats,
    getDashboardStats
};
