const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const emailService = require('../services/emailService');

const router = express.Router();

// Rate limiting for contact form
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 contact form submissions per windowMs
    message: {
        success: false,
        message: 'Too many contact form submissions, please try again later'
    }
});

// Validation for contact form
const contactValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),
    body('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    body('message')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Message cannot exceed 1000 characters'),
    body('source')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Source cannot exceed 50 characters')
];

// @route   POST /api/v1/contact/sales
// @desc    Handle contact sales form submission
// @access  Public
router.post('/sales', contactLimiter, contactValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, company, phone, message, source } = req.body;

        // Prepare contact data
        const contactData = {
            name,
            email,
            company,
            phone,
            message,
            source: source || 'Website Contact Form',
            submittedAt: new Date()
        };

        // Send email notifications
        try {
            console.log('📧 Sending contact sales email for:', name, email);
            await emailService.sendContactSalesInquiry(contactData);
            console.log('✅ Contact sales emails sent successfully');
        } catch (emailError) {
            console.error('❌ Failed to send contact sales emails:', emailError);
            // Continue with response even if email fails
        }

        // Log the contact for analytics (optional)
        console.log('New contact sales inquiry:', {
            name,
            email,
            company,
            source,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: 'Thank you for your interest! Our sales team will contact you within 24 hours.',
            data: {
                submittedAt: contactData.submittedAt,
                confirmationSent: true
            }
        });

    } catch (error) {
        console.error('Contact sales error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process contact request. Please try again later.'
        });
    }
});

// @route   POST /api/v1/contact/demo
// @desc    Handle demo request form submission
// @access  Public
router.post('/demo', contactLimiter, contactValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, company, phone, message } = req.body;

        const contactData = {
            name,
            email,
            company,
            phone,
            message,
            source: 'Demo Request',
            submittedAt: new Date()
        };

        // Send email notifications
        await emailService.sendContactSalesInquiry(contactData);

        res.status(200).json({
            success: true,
            message: 'Demo request submitted successfully! We\'ll schedule a demo with you soon.',
            data: {
                submittedAt: contactData.submittedAt,
                confirmationSent: true
            }
        });

    } catch (error) {
        console.error('Demo request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process demo request. Please try again later.'
        });
    }
});

module.exports = router;
