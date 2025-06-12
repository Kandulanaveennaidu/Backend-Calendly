const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide a first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please provide a last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function (password) {
        // Password must contain at least one uppercase, one lowercase, and one number
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    },
    select: false
  },
  avatar: {
    type: String,
    default: function () {
      // Generate a default avatar URL using the user's initials
      return `https://ui-avatars.com/api/?name=${this.firstName}+${this.lastName}&background=007bff&color=fff&size=200&rounded=true`;
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  phone: {
    type: String,
    validate: {
      validator: function (phone) {
        if (!phone) return true; // Optional field
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
      },
      message: 'Please provide a valid phone number'
    },
    default: ''
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  refreshToken: {
    type: String,
    default: null,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update avatar when name changes
userSchema.pre('save', function (next) {
  if (this.isModified('firstName') || this.isModified('lastName')) {
    if (!this.avatar || this.avatar.includes('ui-avatars.com')) {
      this.avatar = `https://ui-avatars.com/api/?name=${this.firstName}+${this.lastName}&background=007bff&color=fff&size=200&rounded=true`;
    }
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Handle login attempts
userSchema.methods.incLoginAttempts = function () {
  // Check if previous lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after max attempts
  if (this.loginAttempts + 1 >= process.env.MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + (process.env.LOCKOUT_TIME * 60 * 1000) // 15 minutes
    };
  }

  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Convert to JSON (remove sensitive fields)
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

module.exports = mongoose.model('User', userSchema);
