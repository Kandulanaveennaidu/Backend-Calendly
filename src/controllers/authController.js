const { validationResult } = require('express-validator');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const tokenService = require('../services/tokenService');
const emailService = require('../services/emailService');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({ firstName, lastName, email, password });

    // Generate email verification code
    const verificationCode = await VerificationCode.generateCode(
      user._id,
      'email_verification',
      1440 // 24 hours
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationCode.code);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password and refresh token
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;
    const { accessToken, refreshToken } = await tokenService.generateTokenPair(
      user._id,
      userAgent,
      ipAddress
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      },
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const tokenData = await tokenService.verifyRefreshToken(refreshToken);

    // Generate new token pair
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;
    const tokens = await tokenService.generateTokenPair(
      tokenData.userId._id,
      userAgent,
      ipAddress
    );

    res.json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        avatar: req.user.avatar,
        isEmailVerified: req.user.isEmailVerified,
        role: req.user.role,
        createdAt: req.user.createdAt,
        lastLoginAt: req.user.lastLoginAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/v1/auth/update-profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, avatar },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens to force re-login
    await tokenService.revokeAllUserTokens(user._id);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send verification email
// @route   POST /api/v1/auth/send-verification-email
// @access  Private
const sendVerificationEmail = async (req, res, next) => {
  try {
    if (req.user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Delete existing verification codes
    await VerificationCode.deleteMany({
      userId: req.user._id,
      purpose: 'email_verification'
    });

    // Generate new verification code
    const verificationCode = await VerificationCode.generateCode(
      req.user._id,
      'email_verification',
      1440 // 24 hours
    );

    // Send email
    await emailService.sendVerificationEmail(req.user, verificationCode.code);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   POST /api/v1/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    // Find verification code
    const verificationCode = await VerificationCode.findOne({
      code,
      purpose: 'email_verification',
      isUsed: false
    }).populate('userId');

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Check if code is valid
    if (!verificationCode.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or been used'
      });
    }

    // Update user as verified
    const user = await User.findByIdAndUpdate(
      verificationCode.userId._id,
      { isEmailVerified: true },
      { new: true }
    );

    // Mark code as used
    await verificationCode.use();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Delete existing password reset codes
    await VerificationCode.deleteMany({
      userId: user._id,
      purpose: 'password_reset'
    });

    // Generate password reset code
    const resetCode = await VerificationCode.generateCode(
      user._id,
      'password_reset',
      60 // 1 hour
    );

    // Send password reset email
    await emailService.sendPasswordResetEmail(user, resetCode.code);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code, newPassword } = req.body;

    // Find reset code
    const resetCode = await VerificationCode.findOne({
      code,
      purpose: 'password_reset',
      isUsed: false
    }).populate('userId');

    if (!resetCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    // Check if code is valid
    if (!resetCode.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired or been used'
      });
    }

    // Update user password
    const user = await User.findById(resetCode.userId._id);
    user.password = newPassword;
    await user.save();

    // Mark code as used
    await resetCode.use();

    // Revoke all refresh tokens
    await tokenService.revokeAllUserTokens(user._id);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword
};
