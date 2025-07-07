const express = require('express');
const router = express.Router();
const { register, login, getProfile, setAvailability } = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validators');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', validateRegistration, register);

// Login user
router.post('/login', validateLogin, login);

// Get user profile
router.get('/profile', auth, getProfile);

// Set driver availability
router.post('/availability', auth, setAvailability);

module.exports = router; 