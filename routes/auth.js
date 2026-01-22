const express = require('express');
const router = express.Router();
const { register, verifyEmail, login, forgotPassword, resetPassword,resendOtp } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify', verifyEmail); // New
router.post('/login', login);
router.post('/forgot-password', forgotPassword); // New
router.post('/reset-password', resetPassword); // New
router.post('/resend-otp', resendOtp);

module.exports = router;