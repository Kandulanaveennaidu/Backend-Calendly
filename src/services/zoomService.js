const axios = require('axios');
const {
    ZOOM_BASE_URL,
    ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET,
    ZOOM_SECRET_TOKEN,
    NODE_ENV
} = require('../config/config');

class ZoomService {
    constructor() {
        this.baseURL = ZOOM_BASE_URL;
        this.accountId = ZOOM_ACCOUNT_ID;
        this.clientId = ZOOM_CLIENT_ID;
        this.clientSecret = ZOOM_CLIENT_SECRET;
        this.secretToken = ZOOM_SECRET_TOKEN;
        this.accessToken = null;
        this.tokenExpiry = null;
    }
    /**
     * Get OAuth access token for Zoom API
     */
    async getAccessToken() {
        try {
            // Check if we have a valid token
            if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.accessToken;
            }

            console.log('🔐 Getting new Zoom access token...');

            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const response = await axios.post(
                'https://zoom.us/oauth/token',
                `grant_type=client_credentials`,
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                // Set expiry time (token expires in 1 hour, refresh 5 minutes before)
                this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);

                console.log('✅ Zoom access token obtained successfully');
                console.log('📋 Token scopes:', response.data.scope);

                return this.accessToken;
            }

            throw new Error('Failed to obtain access token');

        } catch (error) {
            console.error('❌ Zoom authentication error:', error.response?.data || error.message);
            if (error.response?.data?.error === 'invalid_request') {
                throw new Error('Invalid Zoom credentials. Please check your Account ID, Client ID, and Client Secret.');
            }

            if (error.response?.data?.error === 'unsupported_grant_type') {
                throw new Error('Unsupported grant type. Please ensure your Zoom app is configured as a Server-to-Server OAuth app with the correct scopes (meeting:write:meeting, meeting:read:meeting, user:read:user).');
            }

            if (error.response?.status === 401) {
                throw new Error('Zoom authentication failed. Please verify your credentials in the .env file.');
            }

            throw new Error(`Failed to authenticate with Zoom API: ${error.response?.data?.error_description || error.message}`);
        }
    }

    /**
     * Create a Zoom meeting
     */
    async createMeeting(meetingData) {
        try {
            console.log('🎥 Creating Zoom meeting for:', meetingData.topic);

            const accessToken = await this.getAccessToken();

            // Format the meeting data for Zoom API
            const zoomMeetingData = {
                topic: meetingData.topic || 'Meeting',
                type: 2, // Scheduled meeting
                start_time: meetingData.startTime, // ISO 8601 format
                duration: meetingData.duration || 30, // in minutes
                timezone: meetingData.timezone || 'UTC',
                password: this.generateMeetingPassword(),
                agenda: meetingData.agenda || `Meeting with ${meetingData.guestName}`,
                settings: {
                    host_video: true,
                    participant_video: true,
                    cn_meeting: false,
                    in_meeting: false,
                    join_before_host: false,
                    mute_upon_entry: true,
                    watermark: false,
                    use_pmi: false,
                    approval_type: 0, // Automatically approve
                    audio: 'voip', // Voice over IP only
                    auto_recording: 'none',
                    enforce_login: false,
                    enforce_login_domains: '',
                    alternative_hosts: '',
                    close_registration: false,
                    show_share_button: true,
                    allow_multiple_devices: true,
                    registrants_email_notification: true,
                    meeting_authentication: false,
                    waiting_room: true
                }
            };

            const response = await axios.post(
                `${this.baseURL}users/me/meetings`,
                zoomMeetingData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const meeting = response.data;

            console.log('✅ Zoom meeting created successfully');
            console.log(`📅 Meeting ID: ${meeting.id}`);
            console.log(`🔗 Join URL: ${meeting.join_url}`);

            return {
                meetingId: meeting.id,
                meetingNumber: meeting.id,
                topic: meeting.topic,
                startTime: meeting.start_time,
                duration: meeting.duration,
                timezone: meeting.timezone,
                joinUrl: meeting.join_url,
                startUrl: meeting.start_url,
                password: meeting.password,
                hostId: meeting.host_id,
                hostEmail: meeting.host_email,
                status: meeting.status,
                createdAt: meeting.created_at
            };

        } catch (error) {
            console.error('❌ Zoom meeting creation error:', error.response?.data || error.message);

            if (error.response?.status === 401) {
                // Token might be expired, clear it and retry once
                this.accessToken = null;
                this.tokenExpiry = null;
                throw new Error('Zoom authentication failed. Please check your credentials.');
            }

            throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Update a Zoom meeting
     */
    async updateMeeting(meetingId, updateData) {
        try {
            console.log(`🔄 Updating Zoom meeting: ${meetingId}`);

            const accessToken = await this.getAccessToken();

            const response = await axios.patch(
                `${this.baseURL}meetings/${meetingId}`,
                updateData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Zoom meeting updated successfully');
            return response.data;

        } catch (error) {
            console.error('❌ Zoom meeting update error:', error.response?.data || error.message);
            throw new Error(`Failed to update Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Cancel/Delete a Zoom meeting
     */
    async cancelMeeting(meetingId) {
        try {
            console.log(`🗑️ Canceling Zoom meeting: ${meetingId}`);

            const accessToken = await this.getAccessToken();

            await axios.delete(
                `${this.baseURL}meetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            console.log('✅ Zoom meeting canceled successfully');
            return { success: true, message: 'Meeting canceled successfully' };

        } catch (error) {
            console.error('❌ Zoom meeting cancellation error:', error.response?.data || error.message);
            throw new Error(`Failed to cancel Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get meeting details
     */
    async getMeeting(meetingId) {
        try {
            const accessToken = await this.getAccessToken();

            const response = await axios.get(
                `${this.baseURL}meetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ Zoom get meeting error:', error.response?.data || error.message);
            throw new Error(`Failed to get Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Generate a secure meeting password
     */
    generateMeetingPassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 6; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Validate Zoom webhook signature
     */
    validateWebhookSignature(payload, timestamp, signature) {
        const crypto = require('crypto');
        const message = `v0:${timestamp}:${payload}`;
        const hashForVerify = crypto
            .createHmac('sha256', this.secretToken)
            .update(message, 'utf8')
            .digest('hex');
        const computedSignature = `v0=${hashForVerify}`;

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'utf8'),
            Buffer.from(computedSignature, 'utf8')
        );
    }

    /**
     * Format meeting data for email templates
     */
    formatMeetingForEmail(zoomMeeting, bookingData) {
        return {
            meetingId: zoomMeeting.meetingId,
            meetingNumber: zoomMeeting.meetingNumber,
            topic: zoomMeeting.topic,
            joinUrl: zoomMeeting.joinUrl,
            password: zoomMeeting.password,
            startTime: zoomMeeting.startTime,
            duration: zoomMeeting.duration,
            timezone: zoomMeeting.timezone,
            guestName: bookingData.guestInfo?.name,
            guestEmail: bookingData.guestInfo?.email,
            hostEmail: zoomMeeting.hostEmail
        };
    }

    /**
     * Health check for Zoom service
     */
    async healthCheck() {
        try {
            const accessToken = await this.getAccessToken();

            // Test API access by getting user info
            const response = await axios.get(
                `${this.baseURL}users/me`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            return {
                status: 'healthy',
                accountId: response.data.account_id,
                email: response.data.email,
                type: response.data.type,
                tokenValid: true
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                tokenValid: false
            };
        }
    }
}

module.exports = new ZoomService();
