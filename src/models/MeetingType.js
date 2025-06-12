const mongoose = require('mongoose');

const meetingTypeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Meeting type name is required'],
        trim: true,
        maxlength: [100, 'Meeting type name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [5, 'Minimum duration is 5 minutes'],
        max: [480, 'Maximum duration is 8 hours (480 minutes)']
    },
    color: {
        type: String,
        required: true,
        default: '#006bff',
        validate: {
            validator: function (color) {
                return /^#([0-9A-F]{3}){1,2}$/i.test(color);
            },
            message: 'Color must be a valid hex color code'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    bookingLink: {
        type: String,
        unique: true,
        sparse: true
    },
    totalBookings: {
        type: Number,
        default: 0,
        min: 0
    },
    settings: {
        bufferTimeBefore: {
            type: Number,
            default: 0,
            min: 0,
            max: 60
        },
        bufferTimeAfter: {
            type: Number,
            default: 0,
            min: 0,
            max: 60
        },
        allowRescheduling: {
            type: Boolean,
            default: true
        },
        allowCancellation: {
            type: Boolean,
            default: true
        },
        requireApproval: {
            type: Boolean,
            default: false
        },
        maxAdvanceBooking: {
            type: Number,
            default: 30,
            min: 1
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
meetingTypeSchema.index({ userId: 1, isActive: 1 });
meetingTypeSchema.index({ userId: 1, createdAt: -1 });

// Generate booking link before saving
meetingTypeSchema.pre('save', function (next) {
    if (!this.bookingLink) {
        const slug = this.name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        this.bookingLink = `scheduleme.com/${this.userId}/${slug}-${this._id.toString().slice(-6)}`;
    }
    next();
});

// Method to increment booking count
meetingTypeSchema.methods.incrementBookings = async function () {
    this.totalBookings += 1;
    return this.save();
};

// Method to decrement booking count
meetingTypeSchema.methods.decrementBookings = async function () {
    if (this.totalBookings > 0) {
        this.totalBookings -= 1;
        return this.save();
    }
};

module.exports = mongoose.model('MeetingType', meetingTypeSchema);
