const nodemailer = require('nodemailer');
require('dotenv').config();

const {
    EMAIL_HOST,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM
} = process.env;

console.log('🔧 VitelGlobal SMTP Configuration Tester');
console.log('=====================================');

const testConfigurations = [
    {
        name: 'STARTTLS Port 587',
        config: {
            host: EMAIL_HOST,
            port: 587,
            secure: false,
            requireTLS: true,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        }
    },
    {
        name: 'SSL Port 465',
        config: {
            host: EMAIL_HOST,
            port: 465,
            secure: true,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        }
    },
    {
        name: 'STARTTLS Port 25',
        config: {
            host: EMAIL_HOST,
            port: 25,
            secure: false,
            requireTLS: true,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        }
    },
    {
        name: 'No TLS Port 587',
        config: {
            host: EMAIL_HOST,
            port: 587,
            secure: false,
            requireTLS: false,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        }
    }
];

async function testConfiguration(name, config) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Secure: ${config.secure}, RequireTLS: ${config.requireTLS}`);

    try {
        const transporter = nodemailer.createTransport(config);

        // Verify connection
        await transporter.verify();
        console.log(`   ✅ Connection successful!`);

        // Try sending a test email
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: 'kandulanaveennaidu017@gmail.com', // Your email
            subject: `VitelGlobal SMTP Test - ${name}`,
            html: `
        <h2>✅ SMTP Configuration Test Successful!</h2>
        <p>Configuration: <strong>${name}</strong></p>
        <p>Host: ${config.host}:${config.port}</p>
        <p>Secure: ${config.secure}</p>
        <p>RequireTLS: ${config.requireTLS}</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
        });

        console.log(`   ✅ Email sent successfully!`);
        console.log(`   📧 Message ID: ${info.messageId}`);
        console.log(`   📨 Response: ${info.response}`);

        return { success: true, config: name };

    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        console.log(`   🔍 Error Code: ${error.code}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log(`📧 Email Host: ${EMAIL_HOST}`);
    console.log(`👤 Email User: ${EMAIL_USER}`);
    console.log(`📮 Email From: ${EMAIL_FROM}`);
    console.log(`🔑 Password: ${EMAIL_PASS ? '***CONFIGURED***' : 'NOT SET'}`);

    let workingConfig = null;

    for (const test of testConfigurations) {
        const result = await testConfiguration(test.name, test.config);
        if (result.success) {
            workingConfig = test;
            break; // Stop at first working configuration
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
    }

    console.log('\n🏁 Test Results Summary');
    console.log('========================');

    if (workingConfig) {
        console.log(`✅ Working Configuration Found: ${workingConfig.name}`);
        console.log('\n📋 Use this configuration in your emailService.js:');
        console.log(JSON.stringify(workingConfig.config, null, 2));

        console.log('\n🔧 Update your .env file:');
        console.log(`EMAIL_HOST=${workingConfig.config.host}`);
        console.log(`EMAIL_PORT=${workingConfig.config.port}`);
        console.log(`EMAIL_USE_TLS=${workingConfig.config.requireTLS || false}`);
    } else {
        console.log('❌ No working configuration found');
        console.log('🔍 Possible issues:');
        console.log('   - Check your VitelGlobal SMTP credentials');
        console.log('   - Verify the hostname: mail.vitelglobal.com');
        console.log('   - Contact VitelGlobal support for correct SMTP settings');
        console.log('   - Check if firewall is blocking SMTP ports');
    }
}

// Run the tests
console.log('🚀 Starting VitelGlobal SMTP tests...\n');
runTests().catch(console.error);
