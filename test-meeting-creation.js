// Test meeting creation directly
const ZoomService = require('./src/services/zoomService');

async function testMeetingCreation() {
    console.log('🎥 Testing Zoom Meeting Creation...');
    console.log('====================================');

    try {
        // Test data for meeting creation
        const meetingData = {
            topic: 'Test Meeting - Zoom Integration',
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
            duration: 30,
            timezone: 'UTC',
            guestName: 'Test User'
        };

        console.log('📅 Creating test meeting...');
        const result = await ZoomService.createMeeting(meetingData);

        console.log('✅ SUCCESS! Meeting created:');
        console.log('🆔 Meeting ID:', result.meetingId);
        console.log('🔗 Join URL:', result.joinUrl);
        console.log('🔐 Password:', result.password);
        console.log('📊 All Details:', JSON.stringify(result, null, 2));

        console.log('\n🎉 ZOOM INTEGRATION IS WORKING!');

    } catch (error) {
        console.error('❌ Error creating meeting:', error.message);

        if (error.message.includes('Invalid access token')) {
            console.log('🔍 This might be a scope issue or the app is still activating...');
        }
    }
}

testMeetingCreation();
