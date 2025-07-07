const { body, validationResult } = require('express-validator');

// Registration validation
const validateRegistration = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long'),
    
    body('mobileNumber')
        .trim()
        .notEmpty()
        .withMessage('Mobile number is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must be 10 digits'),
    
    body('address')
        .trim()
        .notEmpty()
        .withMessage('Address is required'),
    
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    
    body('reenterPassword')
        .notEmpty()
        .withMessage('Re-enter password is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    body('role')
        .isIn(['farmer', 'owner', 'driver'])
        .withMessage('Invalid role'),
    
    // Driver specific validations
    body('licenseNumber')
        .if(body('role').equals('driver'))
        .trim()
        .notEmpty()
        .withMessage('License number is required for drivers'),
    
    body('experience')
        .if(body('role').equals('driver'))
        .isNumeric()
        .withMessage('Experience must be a number'),
    
    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Login validation
const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Vehicle validation
const validateVehicle = [
    body('vehicleNumber')
        .trim()
        .notEmpty()
        .withMessage('Vehicle number is required')
        .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/)
        .withMessage('Invalid vehicle number format. Use e.g. MH10K8755 or MH10KM8755'),
    
    body('type')
        .trim()
        .notEmpty()
        .withMessage('Vehicle type is required')
        .isIn(['Truck', 'Tractor', 'Tempo', 'Mini Truck', 'Other'])
        .withMessage('Invalid vehicle type'),
    
    body('capacity.weight')
        .isNumeric()
        .withMessage('Weight capacity must be a number')
        .isFloat({ min: 0 })
        .withMessage('Weight capacity must be positive'),
    
    body('capacity.height')
        .isNumeric()
        .withMessage('Height capacity must be a number')
        .isFloat({ min: 0 })
        .withMessage('Height capacity must be positive'),
    
    // Route validation: must be an array of at least two non-empty strings
    body('route')
        .isArray({ min: 2 })
        .withMessage('Route must have at least two stops (from and to)'),
    body('route.*')
        .trim()
        .notEmpty()
        .withMessage('Each route stop is required'),
    
    // Rent validation: must be a non-empty string
    body('rent')
        .trim()
        .notEmpty()
        .withMessage('Rent is required'),
    
    body('advance')
        .isNumeric()
        .withMessage('Advance amount must be a number')
        .isFloat({ min: 0 })
        .withMessage('Advance amount must be positive'),
    
    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Booking validation
const validateBooking = [
    body('vehicleId')
        .isMongoId()
        .withMessage('Invalid vehicle ID'),
    
    body('cropName')
        .trim()
        .notEmpty()
        .withMessage('Crop name is required'),
    
    body('requiredCapacity.weight')
        .isNumeric()
        .withMessage('Weight capacity must be a number')
        .isFloat({ min: 0 })
        .withMessage('Weight capacity must be positive'),
    
    body('requiredCapacity.height')
        .optional({ nullable: true })
        .isNumeric().withMessage('Height capacity must be a number')
        .isFloat({ min: 0 }).withMessage('Height capacity must be positive'),
    
    body('pickupLocation')
        .trim()
        .notEmpty()
        .withMessage('Pickup location is required'),
    
    body('deliveryLocation')
        .trim()
        .notEmpty()
        .withMessage('Delivery location is required'),
    
    body('bookingDate')
        .isISO8601()
        .withMessage('Invalid date format')
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error('Booking date cannot be in the past');
            }
            return true;
        }),
    
    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Review validation
const validateReview = [
    body('bookingId')
        .isMongoId()
        .withMessage('Invalid booking ID'),
    
    body('rating')
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    
    body('comment')
        .trim()
        .notEmpty()
        .withMessage('Comment is required')
        .isLength({ max: 500 })
        .withMessage('Comment must not exceed 500 characters'),
    
    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateVehicle,
    validateBooking,
    validateReview
}; 