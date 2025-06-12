const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationCodeSchema = new mongoose.Schema({
  code: {
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
  purpose: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true
});

// Index for efficient queries
verificationCodeSchema.index({ userId: 1, purpose: 1 });

// Generate verification code
verificationCodeSchema.statics.generateCode = function (userId, purpose, expiryMinutes = 60) {
  const code = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return this.create({
    code,
    userId,
    purpose,
    expiresAt
  });
};

// Check if code is valid
verificationCodeSchema.methods.isValid = function () {
  return !this.isUsed && this.expiresAt > new Date() && this.attempts < 3;
};

// Use code
verificationCodeSchema.methods.use = function () {
  this.isUsed = true;
  return this.save();
};

// Increment attempts
verificationCodeSchema.methods.incrementAttempts = function () {
  this.attempts += 1;
  return this.save();
};

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
