const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    userAgent: {
        type: String,
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient cleanup
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });

// Check if token is valid
refreshTokenSchema.methods.isValid = function () {
    return !this.isRevoked && this.expiresAt > new Date();
};

// Revoke token
refreshTokenSchema.methods.revoke = function () {
    this.isRevoked = true;
    return this.save();
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
