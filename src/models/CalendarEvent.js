const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        default: ''
    },
    date: {
        type: Date,
        required: [true, 'Event date is required'],
        index: true
    },
    time: {
        type: String,
        required: [true, 'Event time is required'],
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [5, 'Minimum duration is 5 minutes'],
        max: [1440, 'Maximum duration is 24 hours (1440 minutes)']
    },
    type: {
        type: String,
        enum: ['meeting', 'presentation', 'review', 'interview'],
        required: [true, 'Event type is required']
    },
    status: {
        type: String,
        enum: ['confirmed', 'pending', 'cancelled'],
        default: 'pending'
    },
    attendees: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
        },
        status: {
            type: String,
            enum: ['invited', 'confirmed', 'declined'],
            default: 'invited'
        }
    }],
    location: {
        type: {
            type: String,
            enum: ['in-person', 'video-call', 'phone'],
            default: 'video-call'
        },
        details: {
            type: String,
            trim: true,
            default: ''
        }
    },
    meetingLink: {
        type: String,
        trim: true,
        default: ''
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    reminderSettings: {
        emailReminder: {
            type: Boolean,
            default: true
        },
        reminderTime: {
            type: Number,
            default: 15,
            min: 0
        }
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            required: function () {
                return this.isRecurring === true;
            }
        },
        interval: {
            type: Number,
            min: 1,
            required: function () {
                return this.isRecurring === true;
            }
        },
        endDate: {
            type: Date,
            required: function () {
                return this.isRecurring === true;
            }
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
calendarEventSchema.index({ userId: 1, date: 1 });
calendarEventSchema.index({ userId: 1, status: 1 });
calendarEventSchema.index({ userId: 1, type: 1 });
calendarEventSchema.index({ userId: 1, date: 1, time: 1 });
calendarEventSchema.index({ 'attendees.email': 1 });

// Text index for search functionality
calendarEventSchema.index({
    title: 'text',
    description: 'text',
    'attendees.name': 'text'
});

// Virtual for formatted date
calendarEventSchema.virtual('formattedDate').get(function () {
    return this.date ? this.date.toISOString().split('T')[0] : null;
});

// Virtual for attendee count
calendarEventSchema.virtual('attendeeCount').get(function () {
    return this.attendees ? this.attendees.length : 0;
});

// Virtual for confirmed attendees count
calendarEventSchema.virtual('confirmedAttendeeCount').get(function () {
    return this.attendees ? this.attendees.filter(attendee => attendee.status === 'confirmed').length : 0;
});

// Virtual for full datetime
calendarEventSchema.virtual('fullDateTime').get(function () {
    if (!this.date || !this.time) return null;
    const [hours, minutes] = this.time.split(':');
    const dateTime = new Date(this.date);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return dateTime;
});

// Pre-save middleware to handle recurring pattern
calendarEventSchema.pre('save', function (next) {
    // If not recurring, remove the recurring pattern
    if (!this.isRecurring) {
        this.recurringPattern = undefined;
    }

    // Generate meeting link for video calls
    if (this.location.type === 'video-call' && !this.meetingLink) {
        this.meetingLink = `https://meet.calendly-clone.com/${this._id}`;
    }

    next();
});

// Method to check if event is upcoming
calendarEventSchema.methods.isUpcoming = function () {
    const now = new Date();
    return this.fullDateTime > now && ['pending', 'confirmed'].includes(this.status);
};

// Method to check if event is today
calendarEventSchema.methods.isToday = function () {
    const today = new Date();
    const eventDate = new Date(this.date);
    return eventDate.toDateString() === today.toDateString();
};

// Method to add attendee
calendarEventSchema.methods.addAttendee = function (attendee) {
    const existingAttendee = this.attendees.find(a => a.email === attendee.email);
    if (!existingAttendee) {
        this.attendees.push({
            name: attendee.name,
            email: attendee.email,
            status: 'invited'
        });
    }
    return this.save();
};

// Method to remove attendee
calendarEventSchema.methods.removeAttendee = function (email) {
    this.attendees = this.attendees.filter(attendee => attendee.email !== email);
    return this.save();
};

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
