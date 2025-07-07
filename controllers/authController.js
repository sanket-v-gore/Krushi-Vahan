const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register a new user
const register = async (req, res) => {
  try {
    // Debug log for incoming request body
    console.log('req.body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, mobileNumber, address, username, password, role, licenseNumber, experience, email, upiId, paymentPhone } = req.body;

    // Check if user already exists (username)
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user (trim and check for empty strings)
    const user = new User({
      name: name && name.trim(),
      mobileNumber: mobileNumber && mobileNumber.trim(),
      address: address && address.trim(),
      username: username && username.trim(),
      password,
      role,
      email: email && email.trim(),
      upiId: upiId && upiId.trim(),
      paymentPhone: paymentPhone && paymentPhone.trim()
    });

    // Add role-specific fields
    if (role === 'driver') {
      user.licenseNumber = licenseNumber && licenseNumber.trim();
      user.experience = experience;
    }

    // Debug log
    console.log('User to be saved:', user);

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `The ${field} is already in use.` });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Set driver availability
const setAvailability = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can set availability' });
    }
    const { available } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { available: !!available },
      { new: true }
    ).select('-password');
    res.json({ message: 'Availability updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating availability' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  setAvailability
}; 