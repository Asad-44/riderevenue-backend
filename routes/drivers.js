// backend/routes/drivers.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createDriver, listDrivers, getDriver, updateDriver, deleteDriver } = require('../controllers/driverController');

router.post('/', authenticate, createDriver);
router.get('/', authenticate, listDrivers);
router.get('/:id', authenticate, getDriver);
router.put('/:id', authenticate, updateDriver);
router.delete('/:id', authenticate, deleteDriver);

module.exports = router;
