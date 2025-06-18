const nodemailer = require('nodemailer');
require('dotenv').config();

const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
    EMAIL_USE_TLS
} = require('./src/config/config');

console.log('🔧 Gmail SMTP Configuration Test');
console.log('=================================');
console.log('📧 Email Host:', EMAIL_HOST);
console.log('📧 Email Port:', EMAIL_PORT);
console.log('📧 Email User:', EMAIL_USER);
console.log('📧 Email From:', EMAIL_FROM);
console.log('📧 Use TLS:', EMAIL_USE_TLS);
console.log('📧 Password Set:', EMAIL_PASS ? 'Yes (hidden)' : 'No');
console.log('=================================');

async function testGmailConnection() {
    try {
        // Create Gmail transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
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

        console.log('🔄 Testing Gmail SMTP connection...');

        // Verify connection
        const verification = await transporter.verify();
        console.log('✅ Gmail SMTP connection successful!');
        console.log('📧 Server response:', verification);

        // Send test email
        console.log('🔄 Sending test email...');
        const testEmail = {
            from: EMAIL_FROM,
            to: EMAIL_USER, // Send to yourself
            subject: '✅ ATTPL Email System Test - Successful Setup',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Email System Active!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd;">
            <h2 style="color: #333;">Gmail SMTP Configuration Successful</h2>
            <p>Great news! Your ATTPL email system is now properly configured and working.</p>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #155724; margin: 0 0 10px 0;">✅ What's Working:</h3>
              <ul style="color: #155724; margin: 0;">
                <li>Gmail SMTP connection established</li>
                <li>Email authentication successful</li>
                <li>Professional email templates loaded</li>
                <li>Contact sales notifications active</li>
                <li>Meeting booking confirmations ready</li>
              </ul>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <p><strong>Configuration Details:</strong></p>
              <ul>
                <li>Email Service: Gmail SMTP</li>
                <li>Host: ${EMAIL_HOST}</li>
                <li>Port: ${EMAIL_PORT}</li>
                <li>Security: STARTTLS</li>
                <li>From Address: ${EMAIL_FROM}</li>
              </ul>
            </div>
            
            <p style="margin-top: 20px;">
              Your contact sales forms and meeting booking system will now send professional email notifications automatically.
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              This test email was sent automatically by the ATTPL Email System.<br>
              Generated on: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `
        };

        const info = await transporter.sendMail(testEmail);
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);

        console.log('\n🎉 SUCCESS: Gmail email system is fully operational!');
        console.log('📧 Check your inbox:', EMAIL_USER);

    } catch (error) {
        console.error('❌ Gmail SMTP test failed:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);

        if (error.code === 'EAUTH') {
            console.log('\n💡 SOLUTION: Authentication failed');
            console.log('1. Make sure you have enabled 2-factor authentication on your Gmail account');
            console.log('2. Generate an App Password from Google Account settings');
            console.log('3. Use the App Password (not your regular Gmail password)');
            console.log('4. Remove spaces from the App Password');
        }
    }
}

// Run the test
testGmailConnection();
