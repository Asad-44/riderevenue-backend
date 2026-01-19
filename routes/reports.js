const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reportsController = require('../controllers/reportsController');

// Route 1: Monthly Summary
router.get('/monthly-summary', authenticate, reportsController.monthlySummary);

// Route 2: Driver Performance
// Note: You have two functions in your controller. 
// Use 'driverPerformance' for the simple one, or 'getDriverPerformanceReport' for the detailed one.
router.get('/driver-performance', authenticate, reportsController.getDriverPerformanceReport);

// Route 3: Vehicle Performance
router.get('/vehicle-performance', authenticate, reportsController.getVehiclePerformanceReport);

module.exports = router;