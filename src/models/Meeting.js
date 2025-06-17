const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    meetingOwnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    meetingTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MeetingType',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Meeting title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        default: ''
    },
    scheduledAt: {
        type: Date,
        required: [true, 'Scheduled date and time is required'],
        index: true
    }, date: {
        type: String, // Store date in YYYY-MM-DD format
        required: true,
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    }, time: {
        type: String, // Store time in HH:MM format (in meeting type's timezone)
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    originalTime: {
        type: String, // Store original time from guest's timezone
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    originalDate: {
        type: String, // Store original date from guest's timezone
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [5, 'Minimum duration is 5 minutes']
    }, attendees: [{
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
        phone: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'declined'],
            default: 'pending'
        }
    }],
    guestInfo: {
        name: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
        },
        phone: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    },
    organizer: {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'],
        default: 'scheduled'
    },
    location: {
        type: {
            type: String,
            enum: ['in-person', 'video-call', 'phone-call', 'custom'],
            default: 'video-call'
        },
        details: {
            type: String,
            trim: true
        }
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    timezone: {
        type: String,
        default: 'UTC'
    }
}, {
    timestamps: true
});

// Virtual for attendee count
meetingSchema.virtual('attendeeCount').get(function () {
    return this.attendees ? this.attendees.length : 0;
});

// Virtual for confirmed attendees count
meetingSchema.virtual('confirmedAttendeeCount').get(function () {
    return this.attendees ? this.attendees.filter(attendee => attendee.status === 'confirmed').length : 0;
});

// Virtual for formatted date
meetingSchema.virtual('formattedDate').get(function () {
    return this.scheduledAt ? this.scheduledAt.toISOString().split('T')[0] : null;
});

// Virtual for formatted time
meetingSchema.virtual('formattedTime').get(function () {
    if (!this.scheduledAt) return null;
    return this.scheduledAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
});

module.exports = mongoose.model('Meeting', meetingSchema);
