const nodemailer = require('nodemailer');
const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  FRONTEND_URL,
  NODE_ENV
} = require('../config/config');

class EmailService {
  constructor() {
    // Only create transporter if email credentials are provided
    if (EMAIL_USER && EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS
        }
      });
    } else {
      console.warn('Email credentials not provided. Email functionality will be disabled.');
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, html) {
    try {
      // Skip email sending in development if no transporter
      if (!this.transporter) {
        console.log('Email would be sent in production:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Email sending skipped (no email configuration)');
        return { messageId: 'development-mode' };
      }

      const mailOptions = {
        from: EMAIL_FROM,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending failed:', error);

      // In development, don't throw error to prevent app crashes
      if (NODE_ENV === 'development') {
        console.log('Email error ignored in development mode');
        return { messageId: 'development-mode-error' };
      }

      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(user, verificationCode) {
    const verificationUrl = `${FRONTEND_URL}/verify-email?code=${verificationCode}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Calendly Clone!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for registering with us. Please verify your email address by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent from Calendly Clone. Please do not reply to this email.
        </p>
      </div>
    `;

    return this.sendEmail(user.email, 'Verify Your Email Address', html);
  }

  async sendPasswordResetEmail(user, resetCode) {
    const resetUrl = `${FRONTEND_URL}/reset-password?code=${resetCode}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent from Calendly Clone. Please do not reply to this email.
        </p>
      </div>
    `;

    return this.sendEmail(user.email, 'Reset Your Password', html);
  }

  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Calendly Clone!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your email has been successfully verified! You can now start using all features of Calendly Clone.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <p>Thank you for joining us!</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent from Calendly Clone. Please do not reply to this email.
        </p>
      </div>
    `;

    return this.sendEmail(user.email, 'Welcome to Calendly Clone!', html);
  }
}

module.exports = new EmailService();
