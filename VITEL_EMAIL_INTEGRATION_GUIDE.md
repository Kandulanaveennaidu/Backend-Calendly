# VitelGlobal Email Integration Guide

## 🚀 Overview

This guide provides complete integration instructions for the VitelGlobal SMTP email system in your Node.js backend. The system sends professional emails for both Contact Sales inquiries and Meeting Bookings.

## 📧 Email Configuration

### SMTP Credentials (VitelGlobal)

```env
EMAIL_HOST=mail.vitelglobal.com
EMAIL_PORT=465
EMAIL_USER=no.reply
EMAIL_PASS=YRP1vfJIHQ8CDiWH
EMAIL_FROM=no.reply@vitelglobal.com
EMAIL_USE_TLS=true
```

### Configuration Files Updated

- `.env` - Production credentials
- `.env.example` - Template for other developers
- `src/config/config.js` - Application configuration
- `src/services/emailService.js` - Email service with VitelGlobal SMTP

## 🔗 API Endpoints

### 1. Contact Sales API

**Endpoint:** `POST /api/v1/contact/sales`

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/v1/contact/sales \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "company": "Tech Solutions Inc",
    "phone": "+1234567890",
    "message": "I am interested in your scheduling platform for our team of 50+ employees. Could you provide more information about enterprise features and pricing?",
    "source": "Website Contact Form"
  }'
```

### 2. Demo Request API

**Endpoint:** `POST /api/v1/contact/demo`

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/v1/contact/demo \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@company.com",
    "company": "Business Corp",
    "phone": "+1987654321",
    "message": "We would like to schedule a demo to see how your platform can help streamline our appointment booking process."
  }'
```

### 3. Meeting Booking API

**Endpoint:** `POST /api/v1/meetings/book/:meetingTypeId`

**cURL Example:**

```bash
curl -X POST http://localhost:5000/api/v1/meetings/book/YOUR_MEETING_TYPE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-06-25",
    "time": "14:30",
    "timezone": "America/New_York",
    "guestInfo": {
      "name": "Alex Johnson",
      "email": "alex.johnson@email.com",
      "phone": "+1122334455",
      "notes": "Looking forward to discussing the integration possibilities."
    }
  }'
```

## 📧 Email Features

### Contact Sales Emails

- **Customer Confirmation**: Professional thank you email with next steps
- **Sales Team Notification**: Internal alert with all contact details
- **24-hour Response Promise**: Commitment to quick follow-up

### Meeting Booking Emails

- **Booking Confirmation**: Detailed meeting information for the guest
- **Host Notification**: Alert to meeting organizer about new booking
- **Calendar Integration**: Ready for calendar invites

## 🎨 Email Templates

### Professional Design Features

- Modern gradient backgrounds
- Responsive design for all devices
- Clear call-to-action buttons
- Company branding consistency
- Professional typography

### Template Types

1. **Contact Sales Confirmation** - Customer-facing
2. **Sales Team Notification** - Internal
3. **Booking Confirmation** - Guest-facing
4. **Host Notification** - Organizer-facing

## 🔧 Frontend Integration

### JavaScript/React Example

```javascript
// Contact Sales Form Submission
const submitContactForm = async (formData) => {
  try {
    const response = await fetch("/api/v1/contact/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      // Show success message
      alert("Thank you! Our sales team will contact you within 24 hours.");
    } else {
      // Handle validation errors
      console.error("Validation errors:", result.errors);
    }
  } catch (error) {
    console.error("Submit error:", error);
  }
};

// Meeting Booking
const bookMeeting = async (meetingTypeId, bookingData) => {
  try {
    const response = await fetch(`/api/v1/meetings/book/${meetingTypeId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();

    if (result.success) {
      alert("Meeting booked successfully! Check your email for confirmation.");
    }
  } catch (error) {
    console.error("Booking error:", error);
  }
};
```

## 🚦 Testing the Integration

### 1. Test Contact Sales

```bash
# Test with valid data
curl -X POST http://localhost:5000/api/v1/contact/sales \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "company": "Test Company",
    "message": "This is a test inquiry"
  }'
```

### 2. Test Demo Request

```bash
# Test demo request
curl -X POST http://localhost:5000/api/v1/contact/demo \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Tester",
    "email": "demo@example.com",
    "company": "Demo Company"
  }'
```

### 3. Check Email Delivery

- Monitor server logs for email sending status
- Check spam folders if emails don't arrive
- Verify SMTP credentials are correct
- Test with real email addresses

## 📊 Response Formats

### Successful Contact Response

```json
{
  "success": true,
  "message": "Thank you for your interest! Our sales team will contact you within 24 hours.",
  "data": {
    "submittedAt": "2025-06-18T10:30:00.000Z",
    "confirmationSent": true
  }
}
```

### Successful Booking Response

```json
{
  "success": true,
  "message": "Meeting booked successfully!",
  "data": {
    "meetingId": "60d5ecb54b24a70d2c8b4567",
    "confirmationSent": true,
    "hostNotified": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## 🔒 Security Features

### Rate Limiting

- Contact forms: 5 submissions per 15 minutes per IP
- Meeting bookings: 50 bookings per 15 minutes per IP

### Validation

- Email format validation
- Phone number format validation
- Input length limits
- XSS protection through input sanitization

### Error Handling

- Graceful error responses
- Detailed logging for debugging
- User-friendly error messages

## 🎯 Next Steps

1. **Test the endpoints** using the provided cURL commands
2. **Update frontend forms** to use the new API endpoints
3. **Monitor email delivery** and adjust templates if needed
4. **Configure sales email** recipient (currently set to sales@vitelglobal.com)
5. **Set up monitoring** for email delivery failures

## 📞 Support

For technical support or questions about the email integration:

- Check server logs for detailed error messages
- Verify SMTP credentials are correct
- Test email connectivity using the nodemailer test utilities
- Contact your system administrator if emails aren't being delivered

---

✅ **Integration Complete!** Your VitelGlobal email system is now ready for production use.
