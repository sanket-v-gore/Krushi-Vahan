const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Truck', 'Tractor', 'Tempo', 'Mini Truck', 'Other']
  },
  capacity: {
    weight: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  route: [{
    type: String,
    required: true
  }],
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['available', 'booked', 'in-transit', 'maintenance', 'full'],
    default: 'available'
  },
  rent: {
    type: String,
    required: true
  },
  advance: {
    type: Number,
    required: true
  },
  dispatchDateTime: {
    type: Date
  },
  extraInfo: {
    type: String
  },
  remainingCapacity: {
    type: Number,
    required: true,
    default: function() {
      return this.capacity.weight;
    }
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }]
}, {
  timestamps: true
});

// Method to calculate remaining capacity from active bookings
vehicleSchema.methods.calculateRemainingCapacity = async function() {
  const Booking = mongoose.model('Booking');
  const activeBookings = await Booking.find({
    vehicleId: this._id,
    status: { $in: ['pending', 'bringing', 'pending_market', 'pending_payment'] }
  });
  
  const totalBookedWeight = activeBookings.reduce((sum, booking) => 
    sum + (booking.requiredCapacity?.weight || 0), 0);
  
  return Math.max(0, this.capacity.weight - totalBookedWeight);
};

// Method to add booking and update capacity
vehicleSchema.methods.addBooking = async function(bookingId, weight) {
  try {
    // Add booking to array
    this.bookings.push(bookingId);
    
    // Calculate new remaining capacity
    const newRemainingCapacity = Math.max(0, this.remainingCapacity - weight);
    
    // Update remaining capacity
    this.remainingCapacity = newRemainingCapacity;
    
    // Update status based on remaining capacity
    this.status = newRemainingCapacity <= 0 ? 'full' : 'available';
    
    // Save changes to database
    await this.save();
    
    console.log('Vehicle updated:', {
      vehicleId: this._id,
      newRemainingCapacity,
      status: this.status,
      bookings: this.bookings.length
    });
    
    return this;
  } catch (error) {
    console.error('Error in addBooking:', error);
    throw error;
  }
};

// Method to remove booking and update capacity
vehicleSchema.methods.removeBooking = async function(bookingId, weight) {
  try {
    // Remove booking from array
    this.bookings = this.bookings.filter(b => b.toString() !== bookingId.toString());
    
    // Calculate new remaining capacity
    const newRemainingCapacity = Math.min(this.capacity.weight, this.remainingCapacity + weight);
    
    // Update remaining capacity
    this.remainingCapacity = newRemainingCapacity;
    
    // Update status based on remaining capacity
    this.status = newRemainingCapacity <= 0 ? 'full' : 'available';
    
    // Save changes to database
    await this.save();
    
    console.log('Vehicle updated after booking removal:', {
      vehicleId: this._id,
      newRemainingCapacity,
      status: this.status,
      bookings: this.bookings.length
    });
    
    return this;
  } catch (error) {
    console.error('Error in removeBooking:', error);
    throw error;
  }
};

// Initialize remaining capacity for new vehicles
vehicleSchema.pre('save', async function(next) {
  if (this.isNew) {
    this.remainingCapacity = this.capacity.weight;
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema); 