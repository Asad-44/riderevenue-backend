// backend/routes/vehicles.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createVehicle, listVehicles, getVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');

router.post('/', authenticate, createVehicle);
router.get('/', authenticate, listVehicles);
router.get('/:id', authenticate, getVehicle);
router.put('/:id', authenticate, updateVehicle);
router.delete('/:id', authenticate, deleteVehicle);

module.exports = router;
