const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// RSVP validation rules
const validateRSVP = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('attending')
        .isBoolean()
        .withMessage('Attending must be true or false'),
    body('plusOne')
        .optional()
        .isBoolean()
        .withMessage('Plus one must be true or false'),
    body('plusOneName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Plus one name must be less than 100 characters'),
    body('message')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Message must be less than 500 characters'),
    body('phone')
        .optional()
        .trim()
        .isMobilePhone()
        .withMessage('Invalid phone number'),
    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),
    handleValidationErrors
];

// Timeline validation rules
const validateTimeline = [
    body('title')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Title must be between 2 and 200 characters'),
    body('time')
        .isISO8601()
        .withMessage('Invalid date format'),
    body('location')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Location must be between 2 and 200 characters'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 300 })
        .withMessage('Address must be less than 300 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    body('eventType')
        .optional()
        .isIn(['ceremony', 'reception', 'engagement', 'henna', 'photos', 'other'])
        .withMessage('Invalid event type'),
    body('googleMapsUrl')
        .optional()
        .trim()
        .isURL()
        .withMessage('Invalid Google Maps URL'),
    body('dressCode')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Dress code must be less than 200 characters'),
    body('isMainEvent')
        .optional()
        .isBoolean()
        .withMessage('Is main event must be true or false'),
    body('order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Order must be a positive integer'),
    handleValidationErrors
];

// Gift validation rules
const validateGift = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Gift name must be between 2 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    body('category')
        .optional()
        .isIn([
            'kitchen',
            'home',
            'bedroom',
            'bathroom',
            'feeding',
            'clothing',
            'nursery',
            'bath',
            'toys',
            'travel',
            'experience',
            'other'
        ])
        .withMessage('Invalid category'),
    body('priority')
        .optional()
        .isIn(['high', 'medium', 'low'])
        .withMessage('Priority must be high, medium, or low'),
    body('estimatedPrice')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Estimated price must be less than 50 characters'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Notes must be less than 200 characters'),
    body('order')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Order must be a positive integer'),
    body('isReceived')
        .optional()
        .isBoolean()
        .withMessage('Is received must be true or false'),
    body('receivedFrom')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Received from must be less than 100 characters'),
    handleValidationErrors
];

// Wedding configuration validation
const validateWeddingConfig = [
    body('coupleNames.groom')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Groom name must be between 2 and 100 characters'),
    body('coupleNames.bride')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Bride name must be between 2 and 100 characters'),
    body('weddingDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid wedding date format'),
    body('config.theme')
        .optional()
        .isIn(['gold', 'silver', 'rose', 'blue', 'green', 'purple'])
        .withMessage('Invalid theme'),
    body('config.bgMusicUrl')
        .optional()
        .trim()
        .isURL()
        .withMessage('Invalid background music URL'),
    body('config.isPrivate')
        .optional()
        .isBoolean()
        .withMessage('Is private must be true or false'),
    body('config.passcode')
        .optional()
        .trim()
        .isLength({ min: 4, max: 20 })
        .withMessage('Passcode must be between 4 and 20 characters'),
    body('config.customDomain')
        .optional()
        .trim()
        .isFQDN()
        .withMessage('Invalid domain name'),
    body('config.primaryColor')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('Primary color must be a valid hex color'),
    body('config.secondaryColor')
        .optional()
        .matches(/^#[0-9A-F]{6}$/i)
        .withMessage('Secondary color must be a valid hex color'),
    handleValidationErrors
];

module.exports = {
    validateRSVP,
    validateTimeline,
    validateGift,
    validateWeddingConfig,
    handleValidationErrors
}; 