const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Multer setup for bill uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/bills'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'bill_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

const billsDir = path.join(__dirname, '../uploads/bills');
if (!fs.existsSync(billsDir)) {
  fs.mkdirSync(billsDir, { recursive: true });
}

exports.createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only farmers can create bookings
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can create bookings' });
    }

    const { vehicleId, cropName, requiredCapacity, pickupLocation, deliveryLocation, bookingDate, dispatchDate } = req.body;

    // Validate and format booking date
    const formattedBookingDate = new Date(bookingDate);
    if (isNaN(formattedBookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid booking date format' });
    }

    // Validate and format dispatch date
    const formattedDispatchDate = dispatchDate ? new Date(dispatchDate) : null;
    if (dispatchDate && isNaN(formattedDispatchDate.getTime())) {
      return res.status(400).json({ error: 'Invalid dispatch date format' });
    }

    // Find the vehicle with populated owner and driver information
    const vehicle = await Vehicle.findById(vehicleId)
      .populate('ownerId', 'name mobileNumber paymentPhone upiId')
      .populate('driverId', 'name mobileNumber _id');

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Format vehicle dispatch date
    const vehicleDispatchDate = vehicle.dispatchDateTime ? 
      new Date(vehicle.dispatchDateTime).toISOString() : null;

    console.log('Current vehicle state:', {
      vehicleId: vehicle._id,
      remainingCapacity: vehicle.remainingCapacity,
      requiredWeight: requiredCapacity.weight,
      dispatchDate: formattedDispatchDate,
      vehicleDispatchDate: vehicleDispatchDate
    });

    // Check if vehicle has enough remaining capacity
    if (vehicle.remainingCapacity < requiredCapacity.weight) {
      return res.status(400).json({ 
        error: `Vehicle does not have enough remaining capacity. Available: ${vehicle.remainingCapacity}kg, Required: ${requiredCapacity.weight}kg` 
      });
    }

    // Create the booking
    const booking = new Booking({
      vehicleId,
      farmerId: req.user._id,
      cropName,
      requiredCapacity,
      pickupLocation,
      deliveryLocation,
      bookingDate: formattedBookingDate,
      dispatchDate: formattedDispatchDate,
      status: 'pending',
      createdAt: new Date()
    });

    // Save the booking first
    await booking.save();

    console.log('Booking created:', {
      bookingId: booking._id,
      weight: requiredCapacity.weight,
      bookingDate: formattedBookingDate,
      dispatchDate: formattedDispatchDate
    });

    // Add booking to vehicle and update capacity
    await vehicle.addBooking(booking._id, requiredCapacity.weight);

    // Add to booking history
    booking.history = booking.history || [];
    booking.history.push({
      action: 'booking created',
      by: req.user._id,
      role: req.user.role,
      amount: vehicle.advance,
      to: vehicle.ownerId,
      date: new Date()
    });

    await booking.save();

    // Get updated vehicle info with populated fields
    const updatedVehicle = await Vehicle.findById(vehicleId)
      .populate('ownerId', 'name mobileNumber paymentPhone upiId')
      .populate('driverId', 'name mobileNumber _id');

    console.log('Final vehicle state:', {
      vehicleId: updatedVehicle._id,
      remainingCapacity: updatedVehicle.remainingCapacity,
      status: updatedVehicle.status,
      dispatchDateTime: updatedVehicle.dispatchDateTime
    });

    res.status(201).json({
      booking: {
        ...booking.toObject(),
        bookingDate: formattedBookingDate,
        dispatchDate: formattedDispatchDate,
        createdAt: booking.createdAt
      },
      vehicle: {
        ...updatedVehicle.toObject(),
        remainingCapacity: updatedVehicle.remainingCapacity,
        status: updatedVehicle.status,
        dispatchDateTime: updatedVehicle.dispatchDateTime ? 
          new Date(updatedVehicle.dispatchDateTime).toISOString() : null,
        owner: updatedVehicle.ownerId,
        driver: updatedVehicle.driverId
      }
    });
  } catch (error) {
    console.error('Error in createBooking:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === 'farmer') {
      query.farmerId = req.user._id;
    } else if (req.user.role === 'driver') {
      const vehicles = await Vehicle.find({ driverId: req.user._id });
      query.vehicleId = { $in: vehicles.map(v => v._id) };
    } else if (req.user.role === 'owner') {
      const vehicles = await Vehicle.find({ ownerId: req.user._id });
      query.vehicleId = { $in: vehicles.map(v => v._id) };
    }

    console.log('Debug - User Role:', req.user.role);
    console.log('Debug - User ID:', req.user._id);
    console.log('Debug - Query:', query);

    const bookings = await Booking.find(query)
      .populate('farmerId', 'name mobileNumber')
      .populate({
        path: 'vehicleId',
        populate: [
          { path: 'ownerId', select: 'name mobileNumber paymentPhone upiId' },
          { path: 'driverId', select: 'name mobileNumber _id' }
        ]
      })
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    // Format dates in the response
    const formattedBookings = bookings.map(booking => ({
      ...booking.toObject(),
      bookingDate: booking.bookingDate ? new Date(booking.bookingDate).toISOString() : null,
      dispatchDate: booking.dispatchDate ? new Date(booking.dispatchDate).toISOString() : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt).toISOString() : null,
      history: booking.history.map(entry => ({
        ...entry,
        date: entry.date ? new Date(entry.date).toISOString() : null
      })),
      vehicle: booking.vehicleId ? {
        ...booking.vehicleId.toObject(),
        dispatchDateTime: booking.vehicleId.dispatchDateTime ? 
          new Date(booking.vehicleId.dispatchDateTime).toISOString() : null
      } : null
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error('Error in getBookings:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check authorization: only driver can update status
    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (!vehicle || req.user.role !== 'driver' || vehicle.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the assigned driver can update booking status' });
    }

    // Allowed status transitions
    const allowedTransitions = {
      'pending': 'bringing',
      'bringing': 'pending_market'
    };

    const currentStatus = booking.status;
    const nextAllowed = allowedTransitions[currentStatus];

    if (!nextAllowed || status !== nextAllowed) {
      return res.status(400).json({ 
        error: `Invalid status transition from '${currentStatus}' to '${status}'. Allowed next status: '${nextAllowed}'` 
      });
    }

    // Update the status
    booking.status = status;
    
    // Add to history
    booking.history = booking.history || [];
    booking.history.push({
      action: `status updated to ${status}`,
      by: req.user._id,
      role: req.user.role,
      date: new Date()
    });

    await booking.save();
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.uploadBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, fileUrl } = req.body;

    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/bills/')) {
      return res.status(400).json({ error: 'Bill file is required and must be a valid upload path.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only driver can upload bill
    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (req.user.role !== 'driver' || 
        vehicle.driverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only assigned driver can upload bill' });
    }

    // Only allow bill upload if status is 'pending_market'
    if (booking.status !== 'pending_market') {
      return res.status(400).json({ error: "Bill can only be uploaded when status is 'pending_market'" });
    }

    // Calculate final settlement
    let numericRent = 0;
    if (typeof vehicle.rent === 'string') {
      const match = vehicle.rent.match(/\d+(\.\d+)?/);
      if (match) numericRent = parseFloat(match[0]);
    } else if (typeof vehicle.rent === 'number') {
      numericRent = vehicle.rent;
    }
    const advance = vehicle.advance || 0;
    const billAmount = amount;
    const finalSettlement = billAmount - advance - numericRent;
    let settlementInfo = {};
    if (finalSettlement > 0) {
      settlementInfo = {
        farmerGets: finalSettlement,
        farmerPays: 0,
        message: `Owner/driver pays farmer ₹${finalSettlement}`
      };
    } else if (finalSettlement < 0) {
      settlementInfo = {
        farmerGets: 0,
        farmerPays: Math.abs(finalSettlement),
        message: `Farmer pays owner/driver ₹${Math.abs(finalSettlement)}`
      };
    } else {
      settlementInfo = {
        farmerGets: 0,
        farmerPays: 0,
        message: 'No further payment needed'
      };
    }

    // Update booking with bill and payment info
    booking.bill = {
      amount: billAmount,
      fileUrl,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      advance,
      rent: numericRent,
      finalSettlement: settlementInfo
    };

    // Add payment tracking
    booking.paymentStatus = {
      driverConfirmed: false,
      ownerConfirmed: false
    };

    booking.status = 'pending_payment';

    // Add to history
    booking.history = booking.history || [];
    booking.history.push({
      action: 'bill uploaded',
      by: req.user._id,
      role: req.user.role,
      amount: billAmount,
      date: new Date()
    });

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    let query = {};

    // Filter based on user role
    if (req.user.role === 'farmer') {
      query.farmerId = req.user._id;
    } else if (req.user.role === 'driver') {
      const vehicles = await Vehicle.find({ driverId: req.user._id });
      query.vehicleId = { $in: vehicles.map(v => v._id) };
    } else if (req.user.role === 'owner') {
      const vehicles = await Vehicle.find({ ownerId: req.user._id });
      query.vehicleId = { $in: vehicles.map(v => v._id) };
    }

    const bookings = await Booking.find(query)
      .populate('farmerId', 'name mobileNumber')
      .populate({
        path: 'vehicleId',
        populate: [
          { path: 'ownerId', select: 'name mobileNumber paymentPhone upiId' },
          { path: 'driverId', select: 'name mobileNumber' }
        ]
      });

    // Ensure bill is always included in the response
    const formattedBookings = bookings.map(booking => ({
      ...booking.toObject(),
      bill: booking.bill || null
    }));

    res.json(formattedBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only farmer can cancel their booking
    if (booking.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    // Find the vehicle and reset its remaining capacity
    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (vehicle) {
      await vehicle.resetRemainingCapacity(booking.requiredCapacity.weight);
      // Remove booking from vehicle's bookings array
      vehicle.bookings = vehicle.bookings.filter(b => b.toString() !== booking._id.toString());
      await vehicle.save();
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bill upload handler for route
exports.uploadBillHandler = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      // Only driver can upload bill
      const vehicle = await Vehicle.findById(booking.vehicleId);
      if (req.user.role !== 'driver' || vehicle.driverId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Only assigned driver can upload bill' });
      }
      // Only allow bill upload if status is 'pending_market'
      if (booking.status !== 'pending_market') {
        return res.status(400).json({ error: "Bill can only be uploaded when status is 'pending_market'" });
      }
      // File handling
      let fileUrl = '';
      if (req.file) {
        fileUrl = `/uploads/bills/${req.file.filename}`;
      }
      // Calculate final settlement
      // Extract numeric value from rent string (e.g., '20 rup per kg' -> 20)
      let numericRent = 0;
      if (typeof vehicle.rent === 'string') {
        const match = vehicle.rent.match(/\d+(\.\d+)?/);
        if (match) numericRent = parseFloat(match[0]);
      } else if (typeof vehicle.rent === 'number') {
        numericRent = vehicle.rent;
      }
      const advance = vehicle.advance || 0;
      const billAmount = amount;
      const finalSettlement = billAmount - advance - numericRent;
      let settlementInfo = {};
      if (finalSettlement > 0) {
        settlementInfo = {
          farmerGets: finalSettlement,
          farmerPays: 0,
          message: `Owner/driver pays farmer ₹${finalSettlement}`
        };
      } else if (finalSettlement < 0) {
        settlementInfo = {
          farmerGets: 0,
          farmerPays: Math.abs(finalSettlement),
          message: `Farmer pays owner/driver ₹${Math.abs(finalSettlement)}`
        };
      } else {
        settlementInfo = {
          farmerGets: 0,
          farmerPays: 0,
          message: 'No further payment needed'
        };
      }
      booking.bill = {
        amount: billAmount,
        fileUrl,
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
        advance,
        rent: numericRent,
        finalSettlement: settlementInfo
      };
      booking.status = 'pending_payment';
      await booking.save();
      console.log('Booking saved:', booking);

      // After bill upload
      booking.history = booking.history || [];
      booking.history.push({
        action: 'bill uploaded',
        by: req.user._id,
        role: req.user.role,
        amount: amount,
        to: vehicle.ownerId,
        date: new Date()
      });

      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];

// Add new function to handle payment confirmation
exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if booking is in pending_payment status
    if (booking.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Booking is not in pending payment status' });
    }

    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Always initialize paymentStatus if missing or not an object
    if (
      !booking.paymentStatus ||
      typeof booking.paymentStatus !== 'object' ||
      Array.isArray(booking.paymentStatus)
    ) {
      booking.paymentStatus = { driverConfirmed: false, ownerConfirmed: false };
    }

    // Verify user role and authorization
    let isAuthorized = false;
    if (req.user.role === 'driver' && vehicle.driverId.toString() === req.user._id.toString()) {
      isAuthorized = true;
      booking.paymentStatus.driverConfirmed = true;
    } else if (req.user.role === 'owner' && vehicle.ownerId.toString() === req.user._id.toString()) {
      isAuthorized = true;
      booking.paymentStatus.ownerConfirmed = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to confirm payment' });
    }

    // Add to history
    booking.history.push({
      action: `${req.user.role} confirmed payment`,
      by: req.user._id,
      role: req.user.role,
      date: new Date()
    });

    // DEBUG: Log paymentStatus before status check
    console.log('Before check:', booking.paymentStatus);
    if (booking.paymentStatus.driverConfirmed && booking.paymentStatus.ownerConfirmed) {
      booking.status = 'completed';
      booking.deliveryDate = new Date();
      booking.readyForRating = true;
      booking.history.push({
        action: 'booking completed - all payments confirmed',
        by: req.user._id,
        role: req.user.role,
        date: new Date()
      });
      console.log('Booking marked as completed!');
    }

    await booking.save();
    // DEBUG: Log status after save
    console.log('Booking status after confirmation:', booking.status, booking.paymentStatus);
    res.json(booking);
  } catch (error) {
    console.error('Error in confirmPayment:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.rateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverRating, ownerRating, review } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Only farmer can rate
    if (booking.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the farmer can rate this booking' });
    }

    booking.ratings = {
      driverRating,
      ownerRating,
      review,
      ratedAt: new Date()
    };
    booking.readyForRating = false; // Hide the form after rating

    await booking.save();
    res.json({ message: 'Rating submitted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 