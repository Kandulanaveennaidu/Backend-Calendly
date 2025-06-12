const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation for user ID parameter
const userIdValidation = [
  param('id').isMongoId().withMessage('Invalid user ID format')
];

// Validation for user update
const updateUserValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// All routes are protected
router.use(auth);

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private
router.get('/', userController.getUsers);

// @route   GET /api/v1/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', userIdValidation, userController.getUserById);

// @route   PUT /api/v1/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', [...userIdValidation, ...updateUserValidation], userController.updateUser);

// @route   DELETE /api/v1/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', userIdValidation, userController.deleteUser);

module.exports = router;
