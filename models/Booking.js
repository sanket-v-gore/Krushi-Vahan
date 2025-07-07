const mongoose = require('mongoose');
const Vehicle = require('./Vehicle');

const bookingSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  cropName: {
    type: String,
    required: true
  },
  requiredCapacity: {
    weight: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'bringing', 'pending_market', 'pending_payment', 'completed', 'cancelled'],
    default: 'pending'
  },
  bill: {
    amount: Number,
    fileUrl: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date
  },
  profit: {
    totalAmount: Number,
    advance: Number,
    rent: Number,
    remaining: Number,
    farmerShare: Number,
    driverShare: Number,
    ownerShare: Number
  },
  pickupLocation: {
    type: String,
    required: true
  },
  deliveryLocation: {
    type: String,
    required: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  deliveryDate: Date,
  history: [
    {
      action: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: String,
      amount: Number,
      to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: Date
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema); 