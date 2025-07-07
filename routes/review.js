const express = require('express');
const router = express.Router();
const { addReview, getDriverReviews } = require('../controllers/reviewController');
const { validateReview } = require('../middleware/validators');
const auth = require('../middleware/auth');

// Add a review (farmer only)
router.post('/', auth, validateReview, addReview);

// Get driver reviews
router.get('/driver/:driverId', getDriverReviews);

module.exports = router; 