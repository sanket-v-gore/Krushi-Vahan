const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getBookings, 
    updateBookingStatus, 
    uploadBill,
    uploadBillHandler,
    getHistory,
    confirmPayment,
    rateBooking
} = require('../controllers/bookingController');
const { validateBooking } = require('../middleware/validators');
const auth = require('../middleware/auth');
const Vehicle = require('../models/Vehicle');

// Create a new booking (farmer only)
router.post('/', auth, validateBooking, createBooking);

// Get all bookings (filtered by user role)
router.get('/', auth, getBookings);

// Update booking status (driver only)
router.put('/:id/status', auth, updateBookingStatus);

// Upload bill (driver only)
router.post('/:id/bill', auth, uploadBill);

// Confirm payment (driver/owner/farmer)
router.post('/:id/confirm-payment', auth, confirmPayment);

// Rate booking (farmer only)
router.post('/:id/rate', auth, rateBooking);

// Get booking history
router.get('/history', auth, getHistory);

module.exports = router; 