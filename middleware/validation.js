const { body, validationResult } = require('express-validator');

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const habitValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Habit name is required')
        .isLength({ max: 100 })
        .withMessage('Habit name cannot exceed 100 characters'),

    body('category')
        .optional()
        .isIn(['health', 'learning', 'productivity', 'social'])
        .withMessage('Invalid category')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    habitValidation,
    handleValidationErrors
};