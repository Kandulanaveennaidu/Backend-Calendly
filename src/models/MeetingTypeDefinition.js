const mongoose = require('mongoose');

const meetingTypeDefinitionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Meeting type name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    defaultDuration: {
        type: Number,
        required: true,
        min: [5, 'Minimum duration is 5 minutes'],
        max: [1440, 'Maximum duration is 24 hours']
    },
    color: {
        type: String,
        default: '#006bff',
        match: [/^#([0-9A-F]{3}){1,2}$/i, 'Color must be a valid hex color']
    },
    icon: {
        type: String,
        default: 'FiCalendar'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Calendar Integration Fields
    availableDays: [{
        type: Number,
        min: 0,
        max: 6,
        default: [1, 2, 3, 4, 5] // Monday to Friday
    }],
    availableTimeSlots: [{
        start: {
            type: String,
            required: true,
            match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
        },
        end: {
            type: String,
            required: true,
            match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
        }
    }],
    timezone: {
        type: String,
        default: 'UTC'
    },
    bufferTime: {
        type: Number,
        default: 0,
        min: 0,
        max: 60 // minutes
    },
    maxBookingsPerDay: {
        type: Number,
        default: 10,
        min: 1
    },
    advanceBookingDays: {
        type: Number,
        default: 30,
        min: 1
    },
    minimumNotice: {
        type: Number,
        default: 24,
        min: 1 // hours
    },
    recurringSchedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        pattern: {
            type: String,
            enum: ['weekly', 'biweekly', 'monthly'],
            default: 'weekly'
        },
        specificDates: [{
            type: Date
        }]
    },
    totalBookings: {
        type: Number,
        default: 0,
        min: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
meetingTypeDefinitionSchema.index({ isActive: 1 });
meetingTypeDefinitionSchema.index({ createdBy: 1 });
meetingTypeDefinitionSchema.index({ availableDays: 1 });

// Method to check if meeting type is available on a specific day
meetingTypeDefinitionSchema.methods.isAvailableOnDay = function(dayOfWeek) {
    return this.availableDays.includes(dayOfWeek);
};

// Method to get available time slots for a specific day
meetingTypeDefinitionSchema.methods.getAvailableSlots = function(date, existingMeetings = []) {
    const dayOfWeek = new Date(date).getDay();
    
    if (!this.isAvailableOnDay(dayOfWeek)) {
        return [];
    }
    
    const slots = [];
    
    this.availableTimeSlots.forEach(timeSlot => {
        const [startHour, startMin] = timeSlot.start.split(':').map(Number);
        const [endHour, endMin] = timeSlot.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        for (let time = startTime; time + this.defaultDuration <= endTime; time += this.defaultDuration + this.bufferTime) {
            const slotStart = `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;
            const slotEnd = `${Math.floor((time + this.defaultDuration) / 60).toString().padStart(2, '0')}:${((time + this.defaultDuration) % 60).toString().padStart(2, '0')}`;
            
            const isBooked = existingMeetings.some(meeting => {
                return meeting.time === slotStart && meeting.date === date;
            });
            
            slots.push({
                start: slotStart,
                end: slotEnd,
                available: !isBooked,
                reason: isBooked ? 'Already booked' : null
            });
        }
    });
    
    return slots;
};

module.exports = mongoose.model('MeetingTypeDefinition', meetingTypeDefinitionSchema);