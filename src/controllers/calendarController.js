const { validationResult } = require('express-validator');
const CalendarEvent = require('../models/CalendarEvent');

// Helper function to parse date string to Date object
const parseDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
};

// Helper function to get start and end of day
const getDateRange = (dateString) => {
    const date = parseDate(dateString);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
};

// 1. Get All Events/Meetings
const getAllEvents = async (req, res, next) => {
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

        // Add date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) {
                filter.date.$gte = parseDate(req.query.startDate);
            }
            if (req.query.endDate) {
                const endDate = parseDate(req.query.endDate);
                endDate.setHours(23, 59, 59, 999);
                filter.date.$lte = endDate;
            }
        }

        // Add type filter
        if (req.query.type) {
            filter.type = req.query.type;
        }

        // Add status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const events = await CalendarEvent.find(filter)
            .sort({ date: 1, time: 1 })
            .skip(skip)
            .limit(limit);

        const total = await CalendarEvent.countDocuments(filter);
        const hasMore = skip + events.length < total;

        // Format events for response
        const formattedEvents = events.map(event => ({
            _id: event._id,
            userId: event.userId,
            title: event.title,
            date: event.formattedDate,
            time: event.time,
            duration: event.duration,
            attendees: event.attendees,
            type: event.type,
            status: event.status,
            description: event.description,
            meetingLink: event.meetingLink,
            location: event.location,
            timezone: event.timezone,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }));

        res.json({
            success: true,
            data: {
                events: formattedEvents,
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

// 2. Create New Event/Meeting
const createEvent = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const eventData = {
            ...req.body,
            userId: req.user._id,
            date: parseDate(req.body.date)
        };

        // Handle recurring pattern - only include if isRecurring is true
        if (!eventData.isRecurring || eventData.isRecurring === false) {
            delete eventData.recurringPattern;
        } else if (eventData.recurringPattern) {
            // Convert endDate string to Date object if provided
            if (eventData.recurringPattern.endDate) {
                eventData.recurringPattern.endDate = parseDate(eventData.recurringPattern.endDate);
            }
        }

        const event = await CalendarEvent.create(eventData);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: {
                event: {
                    _id: event._id,
                    userId: event.userId,
                    title: event.title,
                    date: event.formattedDate,
                    time: event.time,
                    duration: event.duration,
                    attendees: event.attendees,
                    type: event.type,
                    status: event.status,
                    description: event.description,
                    meetingLink: event.meetingLink,
                    location: event.location,
                    timezone: event.timezone,
                    isRecurring: event.isRecurring,
                    recurringPattern: event.recurringPattern,
                    createdAt: event.createdAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// 3. Update Event/Meeting
const updateEvent = async (req, res, next) => {
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
        if (updateData.date) {
            updateData.date = parseDate(updateData.date);
        }

        // Handle recurring pattern updates
        if (updateData.isRecurring === false) {
            updateData.recurringPattern = undefined;
        } else if (updateData.recurringPattern && updateData.recurringPattern.endDate) {
            updateData.recurringPattern.endDate = parseDate(updateData.recurringPattern.endDate);
        }

        const event = await CalendarEvent.findOneAndUpdate(
            { _id: req.params.eventId, userId: req.user._id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: {
                event: {
                    _id: event._id,
                    title: event.title,
                    date: event.formattedDate,
                    time: event.time,
                    duration: event.duration,
                    attendees: event.attendees,
                    type: event.type,
                    status: event.status,
                    description: event.description,
                    meetingLink: event.meetingLink,
                    location: event.location,
                    isRecurring: event.isRecurring,
                    recurringPattern: event.recurringPattern,
                    updatedAt: event.updatedAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// 4. Delete Event/Meeting
const deleteEvent = async (req, res, next) => {
    try {
        const event = await CalendarEvent.findOneAndDelete({
            _id: req.params.eventId,
            userId: req.user._id
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// 5. Get Events by Date Range
const getEventsByDateRange = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);

        const events = await CalendarEvent.find({
            userId: req.user._id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1, time: 1 });

        // Group events by date
        const groupedEvents = events.reduce((acc, event) => {
            const dateKey = event.formattedDate;
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push({
                _id: event._id,
                title: event.title,
                time: event.time,
                duration: event.duration,
                type: event.type,
                status: event.status
            });
            return acc;
        }, {});

        // Convert to array format
        const formattedEvents = Object.keys(groupedEvents).map(date => ({
            date,
            events: groupedEvents[date]
        }));

        res.json({
            success: true,
            data: {
                events: formattedEvents
            }
        });
    } catch (error) {
        next(error);
    }
};

// 6. Get Today's Events
const getTodaysEvents = async (req, res, next) => {
    try {
        const today = new Date();
        const { startOfDay, endOfDay } = getDateRange(today.toISOString().split('T')[0]);

        const events = await CalendarEvent.find({
            userId: req.user._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ time: 1 });

        const formattedEvents = events.map(event => ({
            _id: event._id,
            userId: event.userId,
            title: event.title,
            date: event.formattedDate,
            time: event.time,
            duration: event.duration,
            attendees: event.attendees.map(attendee => ({
                _id: attendee._id,
                name: attendee.name,
                email: attendee.email,
                status: attendee.status
            })),
            type: event.type,
            status: event.status,
            description: event.description || '',
            meetingLink: event.meetingLink || '',
            location: event.location,
            timezone: event.timezone,
            isRecurring: event.isRecurring || false,
            recurringPattern: event.recurringPattern,
            reminderSettings: event.reminderSettings,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }));

        res.json({
            success: true,
            data: {
                events: formattedEvents,
                count: events.length,
                date: today.toISOString().split('T')[0],
                message: events.length === 0 ? 'No events scheduled for today' : `${events.length} event(s) scheduled for today`
            }
        });
    } catch (error) {
        next(error);
    }
};

// 7. Get Upcoming Events
const getUpcomingEvents = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const now = new Date();

        const events = await CalendarEvent.find({
            userId: req.user._id,
            date: { $gte: now },
            status: { $in: ['pending', 'confirmed'] }
        })
            .sort({ date: 1, time: 1 })
            .limit(limit);

        const formattedEvents = events.map(event => ({
            _id: event._id,
            userId: event.userId,
            title: event.title,
            date: event.formattedDate,
            time: event.time,
            duration: event.duration,
            attendees: event.attendees.map(attendee => ({
                _id: attendee._id,
                name: attendee.name,
                email: attendee.email,
                status: attendee.status
            })),
            type: event.type,
            status: event.status,
            description: event.description || '',
            meetingLink: event.meetingLink || '',
            location: event.location,
            timezone: event.timezone,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }));

        res.json({
            success: true,
            data: {
                events: formattedEvents,
                count: events.length,
                message: events.length === 0 ? 'No upcoming events' : `${events.length} upcoming event(s)`
            }
        });
    } catch (error) {
        next(error);
    }
};

// 8. Update Event Status
const updateEventStatus = async (req, res, next) => {
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

        const event = await CalendarEvent.findOneAndUpdate(
            { _id: req.params.eventId, userId: req.user._id },
            { status },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.json({
            success: true,
            message: 'Event status updated successfully',
            data: {
                event: {
                    _id: event._id,
                    status: event.status,
                    updatedAt: event.updatedAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// 9. Add Attendee to Event
const addAttendees = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const event = await CalendarEvent.findOne({
            _id: req.params.eventId,
            userId: req.user._id
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Add new attendees
        req.body.attendees.forEach(attendee => {
            const existingAttendee = event.attendees.find(a => a.email === attendee.email);
            if (!existingAttendee) {
                event.attendees.push({
                    name: attendee.name,
                    email: attendee.email,
                    status: 'invited'
                });
            }
        });

        await event.save();

        res.json({
            success: true,
            message: 'Attendees added successfully',
            data: {
                event: {
                    _id: event._id,
                    attendees: event.attendees,
                    updatedAt: event.updatedAt
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// 10. Remove Attendee from Event
const removeAttendee = async (req, res, next) => {
    try {
        const event = await CalendarEvent.findOne({
            _id: req.params.eventId,
            userId: req.user._id
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const attendeeEmail = req.params.attendeeEmail;
        const attendeeExists = event.attendees.some(a => a.email === attendeeEmail);

        if (!attendeeExists) {
            return res.status(404).json({
                success: false,
                message: 'Attendee not found'
            });
        }

        event.attendees = event.attendees.filter(attendee => attendee.email !== attendeeEmail);
        await event.save();

        res.json({
            success: true,
            message: 'Attendee removed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// 11. Get Calendar Statistics
const getCalendarStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Total events
        const totalEvents = await CalendarEvent.countDocuments({ userId });

        // Today's events
        const today = new Date();
        const { startOfDay, endOfDay } = getDateRange(today.toISOString().split('T')[0]);
        const todaysEvents = await CalendarEvent.countDocuments({
            userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        // This week's events
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const thisWeekEvents = await CalendarEvent.countDocuments({
            userId,
            date: { $gte: weekStart, $lt: weekEnd }
        });

        // Upcoming events
        const upcomingEvents = await CalendarEvent.countDocuments({
            userId,
            date: { $gte: new Date() },
            status: { $in: ['pending', 'confirmed'] }
        });

        res.json({
            success: true,
            data: {
                statistics: [
                    {
                        title: "Total Events",
                        value: totalEvents.toString(),
                        icon: "FiCalendar",
                        color: "primary"
                    },
                    {
                        title: "Today's Events",
                        value: todaysEvents.toString(),
                        icon: "FiClock",
                        color: "success"
                    },
                    {
                        title: "This Week",
                        value: thisWeekEvents.toString(),
                        icon: "FiUsers",
                        color: "info"
                    },
                    {
                        title: "Upcoming",
                        value: upcomingEvents.toString(),
                        icon: "FiCalendar",
                        color: "warning"
                    }
                ]
            }
        });
    } catch (error) {
        next(error);
    }
};

// 12. Search Events
const searchEvents = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { q, type, startDate, endDate } = req.query;

        const filter = {
            userId: req.user._id,
            $text: { $search: q }
        };

        // Add type filter
        if (type) {
            filter.type = type;
        }

        // Add date range filter
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) {
                filter.date.$gte = parseDate(startDate);
            }
            if (endDate) {
                const end = parseDate(endDate);
                end.setHours(23, 59, 59, 999);
                filter.date.$lte = end;
            }
        }

        const events = await CalendarEvent.find(filter)
            .sort({ score: { $meta: 'textScore' }, date: 1 });

        res.json({
            success: true,
            data: {
                events,
                count: events.length
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsByDateRange,
    getTodaysEvents,
    getUpcomingEvents,
    updateEventStatus,
    addAttendees,
    removeAttendee,
    getCalendarStats,
    searchEvents
};
