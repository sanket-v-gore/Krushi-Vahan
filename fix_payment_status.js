const mongoose = require('mongoose');
const Booking = require('./models/Booking');
require('dotenv').config();

async function fixPaymentStatus() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await Booking.updateMany(
    { paymentStatus: { $exists: false } },
    { $set: { paymentStatus: { driverConfirmed: false, ownerConfirmed: false } } }
  );
  console.log('Updated bookings:', result.modifiedCount);
  await mongoose.disconnect();
}

fixPaymentStatus().catch(err => {
  console.error('Error updating bookings:', err);
  process.exit(1);
}); 