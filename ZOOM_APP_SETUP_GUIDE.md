# Zoom App Setup Guide

## Current Issue

Your Zoom app is configured with **marketplace scopes** instead of **meeting API scopes**, which is why you're getting the error "This API does not support client credentials for authorization."

## Required Scopes

Your app needs these specific scopes to create meetings:

- `meeting:write:meeting` (Create meetings)
- `meeting:read:meeting` (Read meeting details)
- `user:read:user` (Access user info)

## Current Incorrect Scopes

Your app currently has these marketplace scopes (which need to be removed):

- `marketplace:delete:event_subscription`
- `marketplace:read:list_event_subscriptions`
- `marketplace:update:client_secret`
- `marketplace:update:event_subscription`
- `marketplace:write:event_subscription`
- `marketplace:write:websocket_connection`

## Step-by-Step Fix

### 1. Access Zoom Marketplace

- Go to [https://marketplace.zoom.us/](https://marketplace.zoom.us/)
- Sign in with your Zoom account
- Navigate to **"Develop"** → **"Build App"**

### 2. Find Your App

- Look for your existing app in the list
- Click on it to open the settings

### 3. Update App Type (if needed)

- Ensure your app is set as **"Server-to-Server OAuth"**
- If it's not, you may need to create a new app with the correct type

### 4. Configure Scopes

- Go to the **"Scopes"** section
- **Remove** all marketplace-related scopes
- **Add** the required meeting scopes:
  - `meeting:write:meeting`
  - `meeting:read:meeting`
  - `user:read:user`

### 5. App Information

Make sure your app has:

- **App Name**: Your Meeting App
- **Description**: App for creating Zoom meetings
- **Developer Contact**: Your email
- **Company Name**: Your company

### 6. Save and Activate

- Save all changes
- If this is the first time adding meeting scopes, your app may need approval
- Once approved, your credentials will work

## Testing After Fix

Run this command to verify the fix:

```bash
node debug-zoom-credentials.js
```

You should see:

- ✅ Authentication successful
- ✅ All required scopes available
- ✅ Meeting creation test passes

## Credentials Configuration

Your `.env` file should have:

```
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

## Common Issues

### "unsupported_grant_type"

- Fixed: Use `client_credentials` instead of `account_credentials`

### "This API does not support client credentials"

- Fix: Add correct meeting scopes to your app

### Authentication works but meeting creation fails

- Fix: Ensure your app has `meeting:write:meeting` scope

## Next Steps

1. Fix the Zoom app scopes as described above
2. Wait for approval if required
3. Test with `node debug-zoom-credentials.js`
4. Test full integration with `node test-zoom-integration.js`
5. Test booking flow with Zoom meeting creation

## Support

If you need help with the Zoom Marketplace configuration, you can:

1. Check the Zoom Developer Documentation
2. Contact Zoom Developer Support
3. Ensure your Zoom account has API access enabled
