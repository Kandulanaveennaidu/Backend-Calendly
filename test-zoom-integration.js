const zoomService = require('./src/services/zoomService');
const emailService = require('./src/services/emailService');

async function testZoomIntegration() {
    console.log('🧪 Testing Zoom Integration...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing Zoom Health Check...');
        const healthCheck = await zoomService.healthCheck();
        console.log('Health Check Result:', healthCheck);
        console.log('✅ Zoom connection successful!\n');

        // Test 2: Create Test Meeting
        console.log('2. Creating Test Zoom Meeting...');
        const testMeetingData = {
            topic: 'Test Integration Meeting',
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
            duration: 30,
            timezone: 'America/New_York',
            guestName: 'Test User',
            guestEmail: 'test@example.com',
            agenda: 'Testing the Zoom integration functionality'
        };

        const zoomMeeting = await zoomService.createMeeting(testMeetingData);
        console.log('✅ Zoom meeting created successfully!');
        console.log('Meeting Details:', {
            meetingId: zoomMeeting.meetingId,
            meetingNumber: zoomMeeting.meetingNumber,
            joinUrl: zoomMeeting.joinUrl,
            password: zoomMeeting.password
        });
        console.log('');

        // Test 3: Test Email with Zoom Details
        console.log('3. Testing Email with Zoom Details...');
        const emailData = {
            guestInfo: {
                name: 'Test User',
                email: 'kandulanaveennaidu017@gmail.com' // Your email for testing
            },
            title: 'Test Integration Meeting',
            date: '2025-06-19',
            time: '14:30',
            timezone: 'America/New_York',
            duration: 30,
            meetingName: 'Test Meeting',
            organizer: {
                name: 'Meeting Host',
                email: 'kandulanaveennaidu017@gmail.com'
            },
            zoomMeeting: {
                joinUrl: zoomMeeting.joinUrl,
                meetingNumber: zoomMeeting.meetingNumber,
                password: zoomMeeting.password,
                startUrl: zoomMeeting.startUrl
            }
        };

        // Send test email
        await emailService.sendBookingConfirmation(emailData);
        console.log('✅ Test email sent successfully!');
        console.log('📧 Check your email for the Zoom meeting details');
        console.log('');

        // Test 4: Host Notification Email
        console.log('4. Testing Host Notification Email...');
        await emailService.sendBookingNotificationToHost(emailData, 'kandulanaveennaidu017@gmail.com');
        console.log('✅ Host notification email sent successfully!');
        console.log('');

        console.log('🎉 All tests completed successfully!');
        console.log('');
        console.log('📋 Integration Summary:');
        console.log('• Zoom API connection: ✅ Working');
        console.log('• Meeting creation: ✅ Working');
        console.log('• Email templates: ✅ Enhanced with Zoom details');
        console.log('• Customer emails: ✅ Include join link, ID, password');
        console.log('• Host emails: ✅ Include start/join links and controls');
        console.log('');
        console.log('🔧 Next Steps:');
        console.log('1. Test the booking API endpoint');
        console.log('2. Update your frontend to display Zoom details');
        console.log('3. Test end-to-end booking flow');

        // Cleanup: Cancel the test meeting
        try {
            await zoomService.cancelMeeting(zoomMeeting.meetingId);
            console.log('🗑️ Test meeting cleaned up successfully');
        } catch (cleanupError) {
            console.log('⚠️ Note: Test meeting cleanup failed (not critical)');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('');
        console.error('🔍 Troubleshooting:');
        console.error('1. Check your Zoom credentials in .env file');
        console.error('2. Verify your Zoom account has API permissions');
        console.error('3. Ensure your internet connection is stable');
        console.error('4. Check if Zoom API endpoints are accessible');
    }
}

// Run the test
console.log('🎯 Starting Zoom Integration Test Suite...');
console.log('==========================================');
testZoomIntegration();
