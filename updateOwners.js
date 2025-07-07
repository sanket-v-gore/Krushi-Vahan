const mongoose = require('mongoose');
const User = require('./models/User');

async function updateOwners() {
  await mongoose.connect('mongodb://localhost:27017/krmini');
  const result = await User.updateMany(
    { role: 'owner' },
    { $set: { paymentPhone: '9876543210', upiId: 'owner@upi' } }
  );
  console.log('Owners updated:', result.modifiedCount);
  await mongoose.disconnect();
}

updateOwners(); 