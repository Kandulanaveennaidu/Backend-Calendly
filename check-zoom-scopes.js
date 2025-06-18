const axios = require('axios');
require('dotenv').config();

async function testScopes() {
    console.log('🔍 Testing Zoom App Configuration...\n');

    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');

    try {
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

        const scopes = response.data.scope.split(' ');
        console.log('🎯 Your App Currently Has These Scopes:');
        scopes.forEach(scope => {
            if (scope.includes('meeting')) {
                console.log(`✅ ${scope} (GOOD - Meeting scope)`);
            } else if (scope.includes('user') || scope.includes('account')) {
                console.log(`✅ ${scope} (GOOD - User/Account scope)`);
            } else {
                console.log(`❌ ${scope} (REMOVE - Not needed)`);
            }
        });

        console.log('\n🎯 Required Scopes (Must Have):');
        console.log('✅ meeting:write:meeting:admin');
        console.log('✅ meeting:read:meeting:admin');
        console.log('✅ user:read:user:admin (or similar)');

        const hasRequiredScopes = scopes.some(s => s.includes('meeting:write')) &&
            scopes.some(s => s.includes('meeting:read')) &&
            scopes.some(s => s.includes('user:read'));

        if (hasRequiredScopes) {
            console.log('\n🎉 SUCCESS: You have the required scopes!');
        } else {
            console.log('\n❌ MISSING: You need to add the meeting scopes in your Zoom app settings.');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testScopes();
