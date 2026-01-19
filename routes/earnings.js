// backend/routes/earnings.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createEarning, listEarnings, getEarningsRange } = require('../controllers/earningsController');

router.post('/', authenticate, createEarning);
router.get('/', authenticate, listEarnings);
router.get('/range', authenticate, getEarningsRange);

module.exports = router;
