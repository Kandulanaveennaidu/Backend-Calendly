const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const meetingTypeRoutes = require('./meetingTypeRoutes');
const meetingRoutes = require('./meetingRoutes');
const calendarRoutes = require('./calendarRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// Use routes with proper middleware
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/meeting-types', meetingTypeRoutes);
router.use('/meetings', meetingRoutes);
router.use('/calendar', calendarRoutes);
router.use('/dashboard', dashboardRoutes); // Remove auth middleware for now

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Calendly Clone Backend API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        logout: 'POST /api/v1/auth/logout',
        refreshToken: 'POST /api/v1/auth/refresh-token',
        forgotPassword: 'POST /api/v1/auth/forgot-password',
        resetPassword: 'POST /api/v1/auth/reset-password',
        verifyEmail: 'POST /api/v1/auth/verify-email',
        sendVerificationEmail: 'POST /api/v1/auth/send-verification-email',
        me: 'GET /api/v1/auth/me',
        updateProfile: 'PUT /api/v1/auth/update-profile',
        changePassword: 'PUT /api/v1/auth/change-password'
      },
      profile: {
        getProfile: 'GET /api/v1/profile',
        updateProfile: 'PUT /api/v1/profile',
        uploadAvatar: 'POST /api/v1/profile/avatar',
        deleteAccount: 'DELETE /api/v1/profile',
        getStats: 'GET /api/v1/profile/stats',
        getDashboardStats: 'GET /api/v1/profile/dashboard-stats'
      },
      meetingTypes: {
        getAll: 'GET /api/v1/meeting-types',
        getStats: 'GET /api/v1/meeting-types/stats',
        getById: 'GET /api/v1/meeting-types/:id',
        create: 'POST /api/v1/meeting-types',
        update: 'PUT /api/v1/meeting-types/:id',
        delete: 'DELETE /api/v1/meeting-types/:id',
        toggleStatus: 'PATCH /api/v1/meeting-types/:id/toggle-status',
        duplicate: 'POST /api/v1/meeting-types/:id/duplicate',
        updateSettings: 'PATCH /api/v1/meeting-types/:id/settings',
        getBookings: 'GET /api/v1/meeting-types/:id/bookings',
        bulkUpdate: 'POST /api/v1/meeting-types/bulk-update'
      },
      meetings: {
        getAll: 'GET /api/v1/meetings',
        getTodays: 'GET /api/v1/meetings/today',
        getTomorrows: 'GET /api/v1/meetings/tomorrow',
        getUpcoming: 'GET /api/v1/meetings/upcoming',
        getById: 'GET /api/v1/meetings/:id',
        create: 'POST /api/v1/meetings',
        update: 'PUT /api/v1/meetings/:id',
        delete: 'DELETE /api/v1/meetings/:id',
        updateStatus: 'PATCH /api/v1/meetings/:id/status'
      },
      users: {
        getAll: 'GET /api/v1/users',
        getById: 'GET /api/v1/users/:id',
        update: 'PUT /api/v1/users/:id',
        delete: 'DELETE /api/v1/users/:id'
      },
      calendar: {
        getAllEvents: 'GET /api/v1/calendar/events',
        createEvent: 'POST /api/v1/calendar/events',
        updateEvent: 'PUT /api/v1/calendar/events/:eventId',
        deleteEvent: 'DELETE /api/v1/calendar/events/:eventId',
        getEventsByDateRange: 'GET /api/v1/calendar/events/date-range',
        getTodaysEvents: 'GET /api/v1/calendar/events/today',
        getUpcomingEvents: 'GET /api/v1/calendar/events/upcoming',
        searchEvents: 'GET /api/v1/calendar/events/search',
        updateEventStatus: 'PATCH /api/v1/calendar/events/:eventId/status',
        addAttendees: 'POST /api/v1/calendar/events/:eventId/attendees',
        removeAttendee: 'DELETE /api/v1/calendar/events/:eventId/attendees/:attendeeEmail',
        getCalendarStats: 'GET /api/v1/calendar/stats'
      },
      dashboard: {
        getStats: 'GET /api/v1/dashboard/stats',
        getRecentActivity: 'GET /api/v1/dashboard/recent-activity'
      }
    },
    instructions: {
      authentication: 'Most endpoints require Authorization header with Bearer token',
      pagination: 'Use ?page=1&limit=10 for paginated results',
      filtering: 'Use ?status=active&sortBy=name&sortOrder=asc for filtering and sorting'
    }
  });
});

// Health check with detailed status
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    routes: {
      auth: 'Available',
      profile: 'Available',
      meetingTypes: 'Available',
      meetings: 'Available',
      users: 'Available',
      calendar: 'Available',
      dashboard: 'Available'
    }
  });
});

module.exports = router;