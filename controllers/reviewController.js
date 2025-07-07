const Booking = require('../models/Booking');
const User = require('../models/User');
const { validationResult } = require('express-validator');

exports.addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingId, rating, comment } = req.body;

    // Only farmers can add reviews
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can add reviews' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('vehicleId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if the farmer is the one who made the booking
    if (booking.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to review this booking' });
    }

    // Check if the booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    // Check if bill is uploaded
    if (!booking.bill || !booking.bill.amount) {
      return res.status(400).json({ error: 'Bill must be uploaded before reviewing' });
    }

    // Add review to driver
    if (booking.vehicleId.driverId) {
      const driver = await User.findById(booking.vehicleId.driverId);
      if (driver) {
        driver.reviews.push({
          farmerId: req.user._id,
          rating,
          comment,
          date: new Date()
        });
        driver.totalReviews = driver.reviews.length;
        driver.rating = driver.reviews.reduce((sum, r) => sum + r.rating, 0) / driver.totalReviews;
        await driver.save();
      }
    }

    // Add review to owner
    if (booking.vehicleId.ownerId) {
      const owner = await User.findById(booking.vehicleId.ownerId);
      if (owner) {
        owner.reviews.push({
          farmerId: req.user._id,
          rating,
          comment,
          date: new Date()
        });
        owner.totalReviews = owner.reviews.length;
        owner.rating = owner.reviews.reduce((sum, r) => sum + r.rating, 0) / owner.totalReviews;
        await owner.save();
      }
    }

    res.status(201).json({
      message: 'Review added successfully',
      rating,
      comment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDriverReviews = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await User.findById(driverId)
      .populate('reviews.farmerId', 'name')
      .select('reviews rating');

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({
      rating: driver.rating,
      reviews: driver.reviews
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 