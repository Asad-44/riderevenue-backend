const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { poolPromise, sql } = require('../config/db');
const { sendEmail } = require('../utils/email');
require('dotenv').config();

// 1. REGISTER (Send OTP instead of Token)
// 1. REGISTER (Saves to PendingUsers, NOT Users)
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const pool = await poolPromise;

        // Check if user already exists in REAL table
        const realUser = await pool.request().input('email', sql.NVarChar, email).query('SELECT UserID FROM Users WHERE Email=@email');
        if (realUser.recordset.length > 0) return res.status(400).json({ message: 'Email already registered.' });

        // Hash Password
        const hash = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        // Check if pending entry exists, delete it (cleanup old attempts)
        await pool.request().input('email', sql.NVarChar, email).query("DELETE FROM PendingUsers WHERE Email=@email");

        // Insert into PENDING table
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || '')
            .input('hash', sql.NVarChar, hash)
            .input('otp', sql.NVarChar, otp)
            .input('expiry', sql.DateTime, expiry)
            .query(`
                INSERT INTO PendingUsers (Name, Email, Phone, PasswordHash, OtpCode, OtpExpiry) 
                VALUES (@name, @email, @phone, @hash, @otp, @expiry)
            `);

        // Send Email
        await sendEmail(email, "Verify Your Account", `Your OTP code is: ${otp}`);

        res.status(201).json({ message: 'OTP sent. Please verify to complete registration.' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. VERIFY EMAIL (Moves data from Pending -> Users)
const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const pool = await poolPromise;

        // Look in PENDING table
        const pending = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query("SELECT * FROM PendingUsers WHERE Email=@email AND OtpCode=@otp AND OtpExpiry > GETDATE()");

        if (pending.recordset.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const userData = pending.recordset[0];

        // MOVE data to Real USERS table (Mark IsVerified = 1 immediately)
        await pool.request()
            .input('name', sql.NVarChar, userData.Name)
            .input('email', sql.NVarChar, userData.Email)
            .input('phone', sql.NVarChar, userData.Phone)
            .input('hash', sql.NVarChar, userData.PasswordHash)
            .query(`
                INSERT INTO Users (Name, Email, Phone, PasswordHash, IsVerified) 
                VALUES (@name, @email, @phone, @hash, 1)
            `);

        // Delete from Pending table
        await pool.request().input('email', sql.NVarChar, email).query("DELETE FROM PendingUsers WHERE Email=@email");

        res.json({ message: 'Account created successfully! Please Login.' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3. LOGIN (Check Verification)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await poolPromise;
        const result = await pool.request().input('email', sql.NVarChar, email).query('SELECT * FROM Users WHERE Email=@email');

        if (!result.recordset.length) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.recordset[0];

        // CHECK VERIFICATION
        if (!user.IsVerified) return res.status(403).json({ message: 'Email not verified. Please verify first.' });

        const valid = await bcrypt.compare(password, user.PasswordHash);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.UserID, email: user.Email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token, userId: user.UserID });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. FORGOT PASSWORD (Send OTP)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const pool = await poolPromise;

        // Generate Reset Token (OTP for simplicity)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        // Update DB
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiry', sql.DateTime, expiry)
            .query("UPDATE Users SET ResetToken=@otp, ResetExpiry=@expiry WHERE Email=@email");

        if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Email not found' });

        await sendEmail(email, "Reset Password", `Your Password Reset Code is: ${otp}`);
        res.json({ message: 'Reset code sent to email' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 5. RESET PASSWORD
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const pool = await poolPromise;

        // Check Token
        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query("SELECT UserID FROM Users WHERE Email=@email AND ResetToken=@otp AND ResetExpiry > GETDATE()");

        if (!check.recordset.length) return res.status(400).json({ message: 'Invalid or expired code' });

        // Update Password
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('hash', sql.NVarChar, hash)
            .query("UPDATE Users SET PasswordHash=@hash, ResetToken=NULL WHERE Email=@email");

        res.json({ message: 'Password reset successful. Login now.' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Add this new function to authController.js

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const pool = await poolPromise;

        // Check if user exists
        const user = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT UserID, IsVerified FROM Users WHERE Email=@email");

        if (user.recordset.length === 0) return res.status(404).json({ message: 'User not found' });
        if (user.recordset[0].IsVerified) return res.status(400).json({ message: 'Account already verified. Please login.' });

        // Generate New OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        // Update DB
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiry', sql.DateTime, expiry)
            .query("UPDATE Users SET OtpCode=@otp, OtpExpiry=@expiry WHERE Email=@email");

        // Send Email
        await sendEmail(email, "New Verification Code", `Your new OTP code is: ${otp}`);

        res.json({ message: 'New OTP sent successfully' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Don't forget to export it at the bottom:
module.exports = { register, verifyEmail, login, forgotPassword, resetPassword, resendOtp };
