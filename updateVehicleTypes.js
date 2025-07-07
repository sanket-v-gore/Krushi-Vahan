const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

// Update this to your actual MongoDB connection string if needed
const MONGO_URI = 'mongodb://localhost:27017/your_database_name';

async function updateVehicleTypes() {
  await mongoose.connect(MONGO_URI);

  // Update all vehicles that do not have a type set
  const result = await Vehicle.updateMany(
    { type: { $exists: false } },
    { $set: { type: 'Truck' } } // Change 'Truck' to your desired default type
  );

  console.log(`Updated ${result.modifiedCount || result.nModified} vehicles.`);
  await mongoose.disconnect();
}

updateVehicleTypes(); 