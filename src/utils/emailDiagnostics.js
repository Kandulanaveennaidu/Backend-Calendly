const nodemailer = require('nodemailer');
require('dotenv').config();

// Email diagnostic tool
const diagnoseEmailIssue = async () => {
    console.log('🔍 EMAIL DIAGNOSTICS STARTING...\n');

    // 1. Check environment variables
    console.log('📧 CHECKING EMAIL CONFIGURATION:');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
    console.log('EMAIL_USE_TLS:', process.env.EMAIL_USE_TLS || 'NOT SET');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
    console.log('');

    // 2. Check if all required variables are present
    const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.log('❌ MISSING ENVIRONMENT VARIABLES:');
        missingVars.forEach(varName => console.log(`  - ${varName}`));
        console.log('');
        return;
    }

    // 3. Create transporter
    console.log('🔗 CREATING EMAIL TRANSPORTER...');
    let transporter;
    try {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: parseInt(process.env.EMAIL_PORT) === 465,
            requireTLS: process.env.EMAIL_USE_TLS === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true, // Enable debug mode
            logger: true // Enable logging
        });
        console.log('✅ Transporter created successfully');
    } catch (error) {
        console.log('❌ Failed to create transporter:', error.message);
        return;
    }

    // 4. Verify SMTP connection
    console.log('\n🔐 VERIFYING SMTP CONNECTION...');
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
    } catch (error) {
        console.log('❌ SMTP connection failed:');
        console.log('Error:', error.message);
        console.log('Code:', error.code);
        console.log('Command:', error.command);
        return;
    }

    // 5. Send test email
    console.log('\n📤 SENDING TEST EMAIL...');
    const testEmail = 'test@example.com'; // Replace with your actual email

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: testEmail,
            subject: '🧪 VitelGlobal SMTP Test Email',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ Email Test Successful!</h2>
          <p>This is a test email from your VitelGlobal SMTP configuration.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Configuration Details:</h4>
            <ul>
              <li><strong>SMTP Host:</strong> ${process.env.EMAIL_HOST}</li>
              <li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
              <li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
              <li><strong>TLS:</strong> ${process.env.EMAIL_USE_TLS}</li>
            </ul>
          </div>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <p><em>Sent at: ${new Date().toISOString()}</em></p>
        </div>
      `
        });

        console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log(`📧 Check your email at: ${testEmail}`);
    } catch (error) {
        console.log('❌ TEST EMAIL FAILED:');
        console.log('Error:', error.message);
        console.log('Code:', error.code);
        console.log('Response:', error.response);
    }

    console.log('\n🔍 DIAGNOSTICS COMPLETE\n');
};

// Run diagnostics
diagnoseEmailIssue().catch(console.error);
