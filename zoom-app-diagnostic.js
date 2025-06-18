const axios = require('axios');
require('dotenv').config();

async function diagnoseZoomApp() {
    console.log('🔍 Zoom App Configuration Diagnostic');
    console.log('=====================================');

    // Check if credentials exist
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;

    console.log('📋 Current Credentials Check:');
    console.log(`Client ID: ${clientId ? '✅ Present' : '❌ Missing'}`);
    console.log(`Client Secret: ${clientSecret ? '✅ Present' : '❌ Missing'}`);
    console.log(`Account ID: ${accountId ? '✅ Present' : '❌ Missing'}`);

    if (!clientId || !clientSecret || !accountId) {
        console.log('❌ Missing required Zoom credentials in .env file');
        return;
    }

    try {
        // Get access token to check scopes
        console.log('\n🔐 Getting Access Token...');
        const tokenResponse = await axios.post('https://zoom.us/oauth/token',
            `grant_type=account_credentials&account_id=${accountId}`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = tokenResponse.data.access_token;
        const scope = tokenResponse.data.scope;

        console.log('✅ Access token obtained successfully');
        console.log(`📋 Current scopes: ${scope}`);

        // Check if we have meeting scopes
        const requiredScopes = ['meeting:write', 'meeting:read', 'user:read'];
        const currentScopes = scope.split(' ');

        console.log('\n🎯 Scope Analysis:');
        requiredScopes.forEach(requiredScope => {
            const hasScope = currentScopes.some(s => s.includes(requiredScope.split(':')[0]));
            console.log(`${requiredScope}: ${hasScope ? '✅ Available' : '❌ Missing'}`);
        });

        // Try to make a meeting API call to confirm
        console.log('\n🧪 Testing Meeting API Access...');
        try {
            const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ User API call successful');
            console.log(`📧 Account Email: ${userResponse.data.email}`);
            console.log(`👤 Account Type: ${userResponse.data.type === 1 ? 'Basic' : userResponse.data.type === 2 ? 'Pro' : 'Enterprise'}`);
        } catch (error) {
            console.log(`❌ User API call failed: ${error.response?.data?.message || error.message}`);
        }

        // Try to list meetings (this will fail with current scopes)
        try {
            const meetingsResponse = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Meetings API call successful - you have the right scopes!');
        } catch (error) {
            console.log(`❌ Meetings API call failed: ${error.response?.data?.message || error.message}`);
            if (error.response?.data?.code === 124) {
                console.log('🔧 This confirms the scope issue - you need meeting API scopes');
            }
        }

    } catch (error) {
        console.log(`❌ Failed to get access token: ${error.response?.data?.message || error.message}`);
        if (error.response?.data?.error === 'unsupported_grant_type') {
            console.log('🔧 Your app type might be incorrect - ensure it\'s Server-to-Server OAuth');
        }
    }

    console.log('\n📖 Next Steps:');
    console.log('1. Go to https://marketplace.zoom.us/');
    console.log('2. Navigate to Develop → Build App');
    console.log('3. Edit your existing app or create a new Server-to-Server OAuth app');
    console.log('4. Add these scopes: meeting:write, meeting:read, user:read');
    console.log('5. Submit for review if required');
    console.log('6. Once approved, regenerate credentials and update your .env file');
    console.log('7. Re-run this diagnostic to confirm the fix');
}

diagnoseZoomApp().catch(console.error);
