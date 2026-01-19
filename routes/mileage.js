// backend/routes/mileage.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createMileage, listMileageByUser, listMileageByVehicle, getMileage } = require('../controllers/mileageController');

router.post('/', authenticate, createMileage);
router.get('/', authenticate, listMileageByUser);
router.get('/vehicle/:id', authenticate, listMileageByVehicle);
router.get('/:id', authenticate, getMileage);

module.exports = router;
