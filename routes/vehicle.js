const express = require('express');
const router = express.Router();
const { addVehicle, getVehicles, assignDriver, searchVehicles, getAllDrivers, deleteVehicle, editVehicle, getVehicleById } = require('../controllers/vehicleController');
const { validateVehicle } = require('../middleware/validators');
const auth = require('../middleware/auth');

// Add a new vehicle (owner only)
router.post('/', auth, validateVehicle, addVehicle);

// Get all vehicles (filtered by role)
router.get('/', auth, getVehicles);

// Search vehicles (for farmers)
router.get('/search', auth, searchVehicles);

// Get all drivers (for owner)
router.get('/drivers', auth, getAllDrivers);

// Get single vehicle details
router.get('/:id', auth, getVehicleById);

// Assign driver to vehicle (owner only)
router.put('/:id/driver', auth, assignDriver);

// Edit vehicle (owner only)
router.put('/:id', auth, validateVehicle, editVehicle);

// Delete vehicle (owner only)
router.delete('/:id', auth, deleteVehicle);

module.exports = router; 