// backend/routes/shifts.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createShift, listShifts, getShift } = require('../controllers/shiftController');

router.post('/', authenticate, createShift);
router.get('/', authenticate, listShifts);
router.get('/:id', authenticate, getShift);

module.exports = router;
