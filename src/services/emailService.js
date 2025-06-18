const nodemailer = require('nodemailer');
const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  EMAIL_USE_TLS,
  FRONTEND_URL,
  NODE_ENV
} = require('../config/config');

class EmailService {
  constructor() {
    // Only create transporter if email credentials are provided
    if (EMAIL_USER && EMAIL_PASS) {
      // Gmail-optimized configuration
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Use Gmail service for better reliability
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: false, // Use STARTTLS
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify the transporter configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ SMTP Configuration Error:', error);
        } else {
          console.log('✅ Gmail SMTP Server is ready to send emails');
        }
      });
    } else {
      console.warn('⚠️ Email credentials not provided. Email functionality will be disabled.');
      this.transporter = null;
    }
  }
  async sendEmail(to, subject, html) {
    try {
      // Skip email sending in development if no transporter
      if (!this.transporter) {
        console.log('⚠️ Email would be sent in production:');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('Email sending skipped (no email configuration)');
        return { messageId: 'development-mode' };
      }

      console.log(`📧 Attempting to send email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 From: ${EMAIL_FROM}`);

      const mailOptions = {
        from: EMAIL_FROM,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Response:', info.response);
      return info;
    } catch (error) {
      console.error('❌ Email sending failed:');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('SMTP Response:', error.response);
      console.error('Full error:', error);

      // In development, don't throw error to prevent app crashes
      if (NODE_ENV === 'development') {
        console.log('⚠️ Email error ignored in development mode');
        return { messageId: 'development-mode-error' };
      }

      throw new Error(`Failed to send email: ${error.message}`);
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
    `; return this.sendEmail(user.email, 'Welcome to Calendly Clone!', html);
  }

  // Contact Sales Inquiry Email
  async sendContactSalesInquiry(contactData) {
    const { name, email, company, phone, message, source } = contactData;
    // Email to sales team (internal notification)
    const salesHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚀 New Sales Inquiry - ATTPL</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #ddd;">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
            <strong>Action Required:</strong> New potential customer inquiry received!
          </p>
          
          <h3 style="color: #333; margin-bottom: 20px;">Contact Details:</h3>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Source:</strong> ${source || 'Website'}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${message ? `
            <h3 style="color: #333; margin-bottom: 10px;">Customer Message:</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p style="margin: 0; line-height: 1.6; font-style: italic;">"${message}"</p>
            </div>
          ` : ''}
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffeaa7;">
            <p style="margin: 0; color: #856404;">
              <strong>⏰ Response Required:</strong> Please respond within 24 hours to maintain our service level agreement.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:${email}?subject=Re: Your inquiry to ATTPL&body=Hi ${name},%0A%0AThank you for your interest in ATTPL services..." 
               style="background: #28a745; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
              📧 Reply to Customer
            </a>
            <a href="tel:${phone || ''}" 
               style="background: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              📞 Call Customer
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          This is an automated notification from ATTPL Sales System
        </div>
      </div>
    `;// Email confirmation to customer
    const customerHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Thank You for Your Interest!</h1>
        </div>
        
        <div style="background: white; padding: 30px; margin: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi ${name},</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Thank you for reaching out to ATTPL (Ashoka Today Technology Pvt Ltd)! We've received your inquiry and our team will get back to you within 24 hours.
          </p>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin: 0 0 15px 0;">What happens next?</h3>
            <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
              <li>Our sales team will review your inquiry</li>
              <li>We'll contact you within 24 hours to discuss your needs</li>
              <li>We'll schedule a personalized demo if needed</li>
              <li>Our team will provide a custom quote based on your requirements</li>
            </ul>
          </div>

          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bee5eb;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">🔥 Why Choose Our Platform?</h4>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Advanced scheduling and calendar management</li>
              <li>Seamless integration with popular tools</li>
              <li>Automated notifications and reminders</li>
              <li>Customizable booking experiences</li>
              <li>24/7 professional support</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Explore Our Platform
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Have urgent questions? Feel free to reply to this email or contact us directly.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">
            Best regards,<br>
            <strong>ATTPL Sales Team</strong><br>
            Ashoka Today Technology Pvt Ltd
          </p>
        </div>

        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #ccc;">
            This email was sent from ATTPL. You can unsubscribe at any time.
          </p>
        </div>
      </div>
    `;// Send email to sales team (your email)
    await this.sendEmail('kandulanaveennaidu017@gmail.com', `New Sales Inquiry from ${name}`, salesHtml);

    // Send confirmation to customer
    return this.sendEmail(email, 'Thank you for your interest in our platform!', customerHtml);
  }

  // Booking Confirmation Email
  async sendBookingConfirmation(bookingData) {
    const { guestInfo, title, date, time, timezone, duration, meetingName, organizer } = bookingData;

    const formatTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
        </div>
        
        <div style="background: white; padding: 30px; margin: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi ${guestInfo.name},</p>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Great news! Your meeting has been successfully scheduled. We're looking forward to connecting with you.
          </p>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">📅 Meeting Details</h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div><span style="font-weight: bold; color: #667eea;">Meeting:</span> ${title || meetingName}</div>
              <div><span style="font-weight: bold; color: #667eea;">Date:</span> ${formatDate(date)}</div>
              <div><span style="font-weight: bold; color: #667eea;">Time:</span> ${formatTime(time)} ${timezone ? `(${timezone})` : ''}</div>
              <div><span style="font-weight: bold; color: #667eea;">Duration:</span> ${duration} minutes</div>
              ${organizer ? `<div><span style="font-weight: bold; color: #667eea;">Host:</span> ${organizer.name} (${organizer.email})</div>` : ''}
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bee5eb;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">💡 What's Next?</h4>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>You'll receive a calendar invitation shortly</li>
              <li>Meeting link will be provided before the scheduled time</li>
              <li>Please be ready 5 minutes before the meeting starts</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              View Dashboard
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Need to reschedule or have questions? Simply reply to this email or contact our support team.
          </p>
        </div>

        <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 12px; color: #ccc;">
            This email was sent from Calendly Clone. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(guestInfo.email, `Meeting Confirmed: ${title || meetingName}`, html);
  }

  // Host notification when someone books a meeting
  async sendBookingNotificationToHost(bookingData, hostEmail) {
    const { guestInfo, title, date, time, timezone, duration, meetingName } = bookingData;

    const formatTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📅 New Booking Alert</h1>
        </div>
        
        <div style="background: white; padding: 30px; margin: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">You have a new booking!</p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Meeting Details:</h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div><strong>Meeting:</strong> ${title || meetingName}</div>
              <div><strong>Date:</strong> ${formatDate(date)}</div>
              <div><strong>Time:</strong> ${formatTime(time)} ${timezone ? `(${timezone})` : ''}</div>
              <div><strong>Duration:</strong> ${duration} minutes</div>
            </div>
          </div>

          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bee5eb;">
            <h4 style="color: #0c5460; margin: 0 0 15px 0;">Guest Information:</h4>
            <div><strong>Name:</strong> ${guestInfo.name}</div>
            <div><strong>Email:</strong> ${guestInfo.email}</div>
            ${guestInfo.phone ? `<div><strong>Phone:</strong> ${guestInfo.phone}</div>` : ''}
            ${guestInfo.notes ? `<div><strong>Notes:</strong> ${guestInfo.notes}</div>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" 
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              View in Dashboard
            </a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(hostEmail, `New Booking: ${title || meetingName}`, html);
  }
}

module.exports = new EmailService();
