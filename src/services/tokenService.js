const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const {
  JWT_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRE
} = require('../config/config');

class TokenService {
  // Generate access token
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRE
    });
  }

  // Generate refresh token
  async generateRefreshToken(userId, userAgent = null, ipAddress = null) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.parseExpiry(JWT_REFRESH_EXPIRE));

    // Revoke existing refresh tokens for this user
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );

    // Create new refresh token
    const refreshToken = await RefreshToken.create({
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress
    });

    return refreshToken.token;
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  async verifyRefreshToken(token) {
    const refreshToken = await RefreshToken.findOne({ token }).populate('userId');

    if (!refreshToken || !refreshToken.isValid()) {
      throw new Error('Invalid refresh token');
    }

    return refreshToken;
  }

  // Generate token pair
  async generateTokenPair(userId, userAgent = null, ipAddress = null) {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = await this.generateRefreshToken(userId, userAgent, ipAddress);

    return {
      accessToken,
      refreshToken
    };
  }

  // Revoke refresh token
  async revokeRefreshToken(token) {
    const refreshToken = await RefreshToken.findOne({ token });
    if (refreshToken) {
      await refreshToken.revoke();
    }
  }

  // Revoke all user tokens
  async revokeAllUserTokens(userId) {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  // Parse expiry string to milliseconds
  parseExpiry(expiry) {
    const unit = expiry.slice(-1);
    const time = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's': return time * 1000;
      case 'm': return time * 60 * 1000;
      case 'h': return time * 60 * 60 * 1000;
      case 'd': return time * 24 * 60 * 60 * 1000;
      default: return time;
    }
  }
}

module.exports = new TokenService();
