const axios = require('axios');
require('dotenv').config();

async function quickTest() {
    console.log('🚀 Quick Zoom Test - New App');
    console.log('===============================');

    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');

    try {
        console.log('🔐 Testing authentication...');
        const response = await axios.post(
            'https://zoom.us/oauth/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('✅ Authentication SUCCESS!');
        console.log('📋 Token scopes:', response.data.scope);

        const scopes = response.data.scope.split(' ');
        const hasMeetingWrite = scopes.some(s => s.includes('meeting:write'));
        const hasMeetingRead = scopes.some(s => s.includes('meeting:read'));
        const hasUserRead = scopes.some(s => s.includes('user:read'));

        console.log('\n🎯 Scope Check:');
        console.log('Meeting Write:', hasMeetingWrite ? '✅ YES' : '❌ NO');
        console.log('Meeting Read:', hasMeetingRead ? '✅ YES' : '❌ NO');
        console.log('User Read:', hasUserRead ? '✅ YES' : '❌ NO');

        if (hasMeetingWrite && hasMeetingRead && hasUserRead) {
            console.log('\n🎉 SUCCESS! All required scopes are available!');
            console.log('✅ Your Zoom integration is ready to create meetings!');
        } else {
            console.log('\n⏳ WAIT: Scopes may still be propagating...');
            console.log('Try again in 2-3 minutes.');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

quickTest();
