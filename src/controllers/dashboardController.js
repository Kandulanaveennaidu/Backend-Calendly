const Meeting = require('../models/Meeting');
const MeetingTypeDefinition = require('../models/MeetingTypeDefinition');

// @desc    Get dashboard statistics
// @route   GET /api/v1/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
    try {
        // Get user ID from request (fallback to mock for testing)
        const userId = req.user?._id || '507f1f77bcf86cd799439011';

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Get actual counts from database
        const [
            totalMeetings,
            weeklyMeetings,
            totalMeetingTypes,
            totalBookings
        ] = await Promise.all([
            // Count meetings with both field name possibilities
            Meeting.countDocuments({
                $or: [
                    { createdBy: userId },
                    { userId: userId }
                ]
            }),

            // Count this week's meetings
            Meeting.countDocuments({
                $or: [
                    { createdBy: userId },
                    { userId: userId }
                ],
                scheduledAt: { $gte: startOfWeek, $lte: endOfWeek }
            }),

            // Count meeting types
            MeetingTypeDefinition.countDocuments({
                $or: [
                    { createdBy: userId },
                    { userId: userId }
                ]
            }),

            // Sum total bookings
            MeetingTypeDefinition.aggregate([
                {
                    $match: {
                        $or: [
                            { createdBy: userId },
                            { userId: userId }
                        ]
                    }
                },
                { $group: { _id: null, total: { $sum: '$totalBookings' } } }
            ])
        ]);

        console.log('Dashboard Stats Debug:', {
            userId,
            totalMeetings,
            weeklyMeetings,
            totalMeetingTypes,
            totalBookings: totalBookings[0]?.total || 0
        });

        // Format statistics to match your expected response format
        const statistics = [
            {
                title: "Total Meetings",
                value: totalMeetings.toString(),
                icon: "FiCalendar",
                color: "primary"
            },
            {
                title: "This Week",
                value: weeklyMeetings.toString(),
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
                value: (totalBookings[0]?.total || 0).toString(),
                icon: "FiUsers",
                color: "warning"
            }
        ];

        res.json({
            success: true,
            data: {
                statistics
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};

// @desc    Get recent activity
// @route   GET /api/v1/dashboard/recent-activity  
// @access  Private
const getRecentActivity = async (req, res, next) => {
    try {
        // Use mock user ID for now
        const userId = '507f1f77bcf86cd799439011';
        const limit = parseInt(req.query.limit) || 10;

        const recentMeetings = await Meeting.find({
            $or: [
                { createdBy: userId },
                { userId: userId }
            ]
        })
            .populate('meetingType', 'name color')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean({ virtuals: true });

        const activities = recentMeetings.map(meeting => ({
            id: meeting._id,
            type: 'meeting',
            title: meeting.title,
            description: `Meeting scheduled for ${meeting.date || meeting.formattedDate} at ${meeting.time || meeting.formattedTime}`,
            timestamp: meeting.createdAt,
            status: meeting.status,
            meetingType: meeting.meetingType
        }));

        res.json({
            success: true,
            data: { activities }
        });
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching recent activity'
        });
    }
};

module.exports = {
    getDashboardStats,
    getRecentActivity
};
