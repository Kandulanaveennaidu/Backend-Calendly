const axios = require('axios');
require('dotenv').config();

const {
    ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET
} = process.env;

async function testZoomCredentials() {
    console.log('🔧 Testing Zoom Credentials & Permissions...\n');

    console.log('📋 Credentials Check:');
    console.log('Account ID:', ZOOM_ACCOUNT_ID ? '✅ Set' : '❌ Missing');
    console.log('Client ID:', ZOOM_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('Client Secret:', ZOOM_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('');

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
        console.error('❌ Missing Zoom credentials in .env file');
        return;
    }

    try {
        // Step 1: Get Access Token
        console.log('1. Testing Authentication...');
        const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await axios.post(
            'https://zoom.us/oauth/token',
            `grant_type=client_credentials`,
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;
        const scopes = tokenResponse.data.scope;

        console.log('✅ Authentication successful!');
        console.log('🔑 Access token obtained');
        console.log('📋 Available scopes:', scopes);
        console.log('');

        // Step 2: Check Required Scopes
        console.log('2. Checking Required Permissions...');
        const requiredScopes = [
            'meeting:write:meeting',
            'meeting:read:meeting',
            'user:read:user'
        ];

        const availableScopes = scopes.split(' ');
        const missingScopes = requiredScopes.filter(scope => !availableScopes.includes(scope));

        if (missingScopes.length === 0) {
            console.log('✅ All required permissions available!');
        } else {
            console.log('❌ Missing required permissions:');
            missingScopes.forEach(scope => {
                console.log(`   - ${scope}`);
            });
            console.log('');
            console.log('🛠️ To fix this:');
            console.log('1. Go to https://marketplace.zoom.us/');
            console.log('2. Navigate to your app settings');
            console.log('3. Go to "Scopes" section');
            console.log('4. Add the missing scopes listed above');
            console.log('5. Save and try again');
            return;
        }
        console.log('');

        // Step 3: Test User API Access
        console.log('3. Testing API Access...');
        const userResponse = await axios.get(
            'https://api.zoom.us/v2/users/me',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ User API access successful!');
        console.log('👤 Account:', userResponse.data.email);
        console.log('🏢 Account Type:', userResponse.data.type);
        console.log('');

        // Step 4: Test Meeting Creation (Simple)
        console.log('4. Testing Meeting Creation...');
        const testMeeting = {
            topic: 'API Test Meeting',
            type: 2,
            start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            duration: 30,
            timezone: 'UTC',
            settings: {
                host_video: true,
                participant_video: true,
                waiting_room: true
            }
        };

        const meetingResponse = await axios.post(
            'https://api.zoom.us/v2/users/me/meetings',
            testMeeting,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Meeting creation successful!');
        console.log('🎥 Meeting ID:', meetingResponse.data.id);
        console.log('🔗 Join URL:', meetingResponse.data.join_url);
        console.log('🔑 Password:', meetingResponse.data.password);
        console.log('');

        // Cleanup: Delete test meeting
        try {
            await axios.delete(
                `https://api.zoom.us/v2/meetings/${meetingResponse.data.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            console.log('🗑️ Test meeting cleaned up');
        } catch (cleanupError) {
            console.log('⚠️ Cleanup warning (not critical)');
        }

        console.log('');
        console.log('🎉 All tests passed! Your Zoom integration is ready.');
        console.log('');
        console.log('📋 Summary:');
        console.log('• Authentication: ✅ Working');
        console.log('• Permissions: ✅ Correct');
        console.log('• API Access: ✅ Working');
        console.log('• Meeting Creation: ✅ Working');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.log('');

        if (error.response?.status === 401) {
            console.log('🔍 Authentication Issue:');
            console.log('1. Verify your Zoom credentials in .env file');
            console.log('2. Check if Account ID, Client ID, and Client Secret are correct');
            console.log('3. Ensure your Zoom app is properly configured');
        } else if (error.response?.data?.code === 4711) {
            console.log('🔍 Permission Issue:');
            console.log('1. Go to https://marketplace.zoom.us/');
            console.log('2. Open your app settings');
            console.log('3. Go to "Scopes" section');
            console.log('4. Add these required scopes:');
            console.log('   - meeting:write:meeting');
            console.log('   - meeting:read:meeting');
            console.log('   - user:read:user');
            console.log('5. Save changes and try again');
        } else {
            console.log('🔍 Other Issues:');
            console.log('1. Check your internet connection');
            console.log('2. Verify Zoom API endpoints are accessible');
            console.log('3. Try again in a few minutes');
        }
    }
}

testZoomCredentials();
