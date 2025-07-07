const Vehicle = require('../models/Vehicle');
const { validationResult } = require('express-validator');
const User = require('../models/User');

exports.addVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only transport owners can add vehicles
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Only transport owners can add vehicles' });
    }

    // Ensure route is an array of at least two stops
    let { route, dispatchDateTime, extraInfo, type } = req.body;
    if (!Array.isArray(route)) {
      route = [route];
    }
    route = route.filter(stop => stop && stop.trim());
    if (route.length < 2) {
      return res.status(400).json({ error: 'Route must have at least two stops (from and to)' });
    }

    const vehicleData = {
      ...req.body,
      route,
      ownerId: req.user._id,
      type: type || 'Truck' // Set default type if not provided
    };
    if (dispatchDateTime) vehicleData.dispatchDateTime = dispatchDateTime;
    if (extraInfo) vehicleData.extraInfo = extraInfo;

    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    let query = {};
    
    // If user is an owner, show only their vehicles
    if (req.user.role === 'owner') {
      query.ownerId = req.user._id;
    }
    // If user is a driver, show only assigned vehicles
    else if (req.user.role === 'driver') {
      query.driverId = req.user._id;
    }

    const vehicles = await Vehicle.find(query)
      .populate('ownerId', 'name mobileNumber')
      .populate('driverId', 'name mobileNumber');

    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchVehicles = async (req, res) => {
  try {
    let { delivery, cropName, weight } = req.query;
    delivery = (delivery || '').toLowerCase().trim();
    console.log('Search params:', { delivery, cropName, weight });

    // Base query for available vehicles with assigned drivers
    let query = {
      status: 'available',
      driverId: { $ne: null }
    };

    // Find all vehicles matching the base query
    const allVehicles = await Vehicle.find(query)
      .populate('ownerId', 'name mobileNumber')
      .populate('driverId', 'name mobileNumber');

    if (!delivery) {
      allVehicles.sort((a, b) => b.remainingCapacity - a.remainingCapacity);
      return res.json(allVehicles);
    }

    // Only include vehicles where the last stop matches the delivery input
    const matching = allVehicles.filter(vehicle => {
      if (!vehicle.route || vehicle.route.length === 0) return false;
      const destination = (vehicle.route[vehicle.route.length - 1] || '').toLowerCase().trim();
      // Debug log
      console.log(`Checking vehicle ${vehicle.vehicleNumber} destination:`, destination, 'against delivery:', delivery);
      return destination === delivery;
    });

    matching.sort((a, b) => b.remainingCapacity - a.remainingCapacity);

    // If no matches, return all vehicles
    if (matching.length === 0) {
      allVehicles.sort((a, b) => b.remainingCapacity - a.remainingCapacity);
      return res.json(allVehicles);
    }

    res.json(matching);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Only owner can update their vehicles
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this vehicle' });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    console.log('Assigning driver', driverId, 'to vehicle', id);

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      console.log('Vehicle not found for ID:', id);
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Only owner can assign drivers
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to assign drivers' });
    }

    // Check if driver exists and is actually a driver
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({ error: 'Invalid driver' });
    }

    vehicle.driverId = driverId;
    await vehicle.save();

    res.json({ message: 'Driver assigned successfully', vehicle });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
};

exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }, '-password');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    // Only owner can delete their vehicles
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this vehicle' });
    }
    await Vehicle.findByIdAndDelete(id);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.editVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    // Only owner can update their vehicles
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this vehicle' });
    }
    const updateData = { ...req.body };
    if (updateData.dispatchDateTime === '') delete updateData.dispatchDateTime;
    if (updateData.extraInfo === '') delete updateData.extraInfo;
    if (!updateData.type) updateData.type = 'Truck'; // Set default type if not provided
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    res.json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id)
      .populate('ownerId', 'name mobileNumber')
      .populate('driverId', 'name mobileNumber');

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 