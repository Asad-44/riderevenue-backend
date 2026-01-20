// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Wrapper to log Register requests
router.post('/register', (req, res, next) => {
    console.log("👉 Register Request Received from:", req.ip);
    console.log("📦 Body:", req.body); 
    register(req, res, next);
});

// Wrapper to log Login requests
router.post('/login', (req, res, next) => {
    console.log("👉 Login Request Received from:", req.ip);
    login(req, res, next);
});

module.exports = router;