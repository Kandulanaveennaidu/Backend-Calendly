const nodemailer = require('nodemailer');
require('dotenv').config();

// Debug email configuration
console.log('🔍 EMAIL CONFIGURATION DEBUG');
console.log('============================');

console.log('Environment Variables:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***HIDDEN***' : 'NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_USE_TLS:', process.env.EMAIL_USE_TLS);
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log('\n📧 Config values:');
const config = require('./src/config/config');
console.log('EMAIL_HOST:', config.EMAIL_HOST);
console.log('EMAIL_PORT:', config.EMAIL_PORT);
console.log('EMAIL_USER:', config.EMAIL_USER);
console.log('EMAIL_PASS:', config.EMAIL_PASS ? '***HIDDEN***' : 'NOT SET');
console.log('EMAIL_FROM:', config.EMAIL_FROM);
console.log('EMAIL_USE_TLS:', config.EMAIL_USE_TLS);
console.log('NODE_ENV:', config.NODE_ENV);

console.log('\n🔧 Testing SMTP Connection...');

// Test SMTP connection
const testTransporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465,
    requireTLS: config.EMAIL_USE_TLS,
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

testTransporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Failed:');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('Response:', error.response);
    } else {
        console.log('✅ SMTP Connection Successful!');
        console.log('Server is ready to send emails');

        // Test sending a real email
        console.log('\n📧 Sending test email...');

        const mailOptions = {
            from: config.EMAIL_FROM,
            to: 'kandulanaveennaidu017@gmail.com', // Your email
            subject: 'VitelGlobal SMTP Test Email',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">SMTP Test Email</h2>
          <p>This is a test email to verify VitelGlobal SMTP configuration.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: ${config.EMAIL_HOST}</li>
            <li>Port: ${config.EMAIL_PORT}</li>
            <li>TLS: ${config.EMAIL_USE_TLS}</li>
            <li>From: ${config.EMAIL_FROM}</li>
          </ul>
          <p>If you receive this email, the SMTP configuration is working correctly!</p>
        </div>
      `
        };

        testTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ Test email failed:');
                console.error('Error:', error.message);
                console.error('Code:', error.code);
                console.error('Response:', error.response);
            } else {
                console.log('✅ Test email sent successfully!');
                console.log('Message ID:', info.messageId);
                console.log('Response:', info.response);
            }

            process.exit(0);
        });
    }
});
