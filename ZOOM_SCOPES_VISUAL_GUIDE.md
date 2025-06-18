# How to Find and Add Scopes in Zoom App - Visual Guide

## Step-by-Step Instructions with Screenshots

### Step 1: Go to Zoom Marketplace

1. Open your web browser
2. Go to: **https://marketplace.zoom.us/**
3. Sign in with your Zoom account

### Step 2: Access Your Apps

1. Look for a **"Develop"** menu at the top of the page
2. Click on **"Develop"**
3. Select **"Build App"** from the dropdown

### Step 3: Find Your App

1. You'll see a list of your apps
2. Look for your app (it might be named something like "My App" or have your company name)
3. Click on your app name to open it

### Step 4: Navigate to Scopes Section

Once you're inside your app, you'll see a sidebar on the left with several options:

- **App Credentials** (where you got your Client ID and Secret)
- **Information**
- **Features**
- **Scopes** ← **THIS IS WHAT YOU'RE LOOKING FOR**
- **Activation**

**Click on "Scopes"** in the left sidebar.

### Step 5: Understanding the Scopes Page

On the Scopes page, you'll see:

#### Current Scopes (What you have now - WRONG):

- ☑️ `marketplace:delete:event_subscription`
- ☑️ `marketplace:read:list_event_subscriptions`
- ☑️ `marketplace:update:client_secret`
- ☑️ `marketplace:update:event_subscription`
- ☑️ `marketplace:write:event_subscription`
- ☑️ `marketplace:write:websocket_connection`

#### What You Need to Do:

1. **UNCHECK** all the marketplace scopes above
2. **CHECK** these new scopes:
   - ☑️ `meeting:write` or `meeting:write:meeting`
   - ☑️ `meeting:read` or `meeting:read:meeting`
   - ☑️ `user:read` or `user:read:user`

### Step 6: Finding the Meeting Scopes

The scopes are usually organized by category. Look for:

#### Meeting Category:

- `meeting:read` - Allows reading meeting information
- `meeting:write` - Allows creating and updating meetings

#### User Category:

- `user:read` - Allows reading user profile information

### Step 7: Save Changes

1. After selecting the correct scopes, scroll down
2. Click **"Save"** or **"Continue"** button
3. You might see a message saying "App needs to be activated" or "Changes saved"

## Visual Clues to Look For

### In the Left Sidebar:

```
📱 App Credentials
ℹ️  Information
⚡ Features
🔐 Scopes        ← CLICK HERE
✅ Activation
```

### In the Scopes Section:

Look for checkboxes next to scope names like:

```
☐ marketplace:delete:event_subscription     ← UNCHECK THESE
☐ marketplace:read:list_event_subscriptions ← UNCHECK THESE
☐ marketplace:update:client_secret          ← UNCHECK THESE

☑️ meeting:read                              ← CHECK THESE
☑️ meeting:write                             ← CHECK THESE
☑️ user:read                                 ← CHECK THESE
```

## Alternative: If You Can't Find Scopes

### Option 1: Check App Type

Your app might be the wrong type. Look at the top of your app page:

- If it says **"JWT App"** → You need to create a new **"Server-to-Server OAuth"** app
- If it says **"OAuth App"** → You need to create a new **"Server-to-Server OAuth"** app
- If it says **"Server-to-Server OAuth"** → You're in the right place, look harder for "Scopes"

### Option 2: Create New App

If you can't find the scopes or your app is the wrong type:

1. Go back to "Build App"
2. Click **"Create"**
3. Choose **"Server-to-Server OAuth"**
4. Fill in the details
5. In the Scopes section, add the meeting scopes

## What If Scopes Look Different?

Different versions of Zoom Marketplace might show scopes differently:

### Version 1 (Checkboxes):

```
☑️ meeting:read:meeting
☑️ meeting:write:meeting
☑️ user:read:user
```

### Version 2 (Dropdown or Search):

- Search for "meeting" and select "read" and "write"
- Search for "user" and select "read"

### Version 3 (Categories):

- Expand "Meeting" category → select "read" and "write"
- Expand "User" category → select "read"

## Need Help?

If you still can't find the Scopes section:

1. Take a screenshot of your Zoom app page
2. Look for any menu that says "Permissions", "API Access", or "Scopes"
3. Check if there's a "Settings" or "Configuration" section

## After Adding Scopes

1. **Save** your changes
2. Your app might need **approval** (this can take a few hours)
3. You'll get an email when it's approved
4. Then test again with: `node debug-zoom-credentials.js`

## Expected Result After Fix

When you run the debug script, you should see:

```
✅ Authentication successful!
✅ Required permissions found:
   - meeting:write:meeting ✅
   - meeting:read:meeting ✅
   - user:read:user ✅
```
