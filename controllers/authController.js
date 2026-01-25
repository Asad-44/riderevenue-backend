const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { poolPromise, sql } = require('../config/db');
const { sendEmail } = require('../utils/email');
require('dotenv').config();

// --- HELPER: HTML EMAIL TEMPLATE GENERATOR ---
const getEmailHtml = (title, message, code) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e8dcc8; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
    <div style="background: #3d3530; color: #c4a880; padding: 25px; text-align: center;">
    <img src="https://img.icons8.com/ios-filled/100/c4a880/car.png" alt="RideRevenue" width="50" height="50" style="display: block; margin: 0 auto 10px;">
    <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">RideRevenue</h2>
</div>
    <div style="padding: 30px; text-align: center; color: #3d3530;">
        <h3 style="margin-top: 0; color: #3d3530;">${title}</h3>
        <p style="font-size: 16px; color: #666; margin-bottom: 25px;">${message}</p>
        
        <div style="background: #f5f0e8; color: #3d3530; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; margin: 0 auto; display: inline-block; border: 1px dashed #c4a880;">
            ${code}
        </div>
        
        <p style="font-size: 12px; color: #999; margin-top: 25px;">This code expires in 15 minutes.<br>If you did not request this, please ignore this email.</p>
    </div>
    <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 11px; color: #aaa;">
        &copy; 2026 RideRevenue Tracker
    </div>
</div>
`;

// 1. REGISTER (Saves to PendingUsers)
const register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const pool = await poolPromise;

        const realUser = await pool.request().input('email', sql.NVarChar, email).query('SELECT UserID FROM Users WHERE Email=@email');
        if (realUser.recordset.length > 0) return res.status(400).json({ message: 'Email already registered.' });

        const hash = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        await pool.request().input('email', sql.NVarChar, email).query("DELETE FROM PendingUsers WHERE Email=@email");

        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || '')
            .input('hash', sql.NVarChar, hash)
            .input('otp', sql.NVarChar, otp)
            .input('expiry', sql.DateTime, expiry)
            .query(`INSERT INTO PendingUsers (Name, Email, Phone, PasswordHash, OtpCode, OtpExpiry) VALUES (@name, @email, @phone, @hash, @otp, @expiry)`);

        // Send Professional HTML Email
        const html = getEmailHtml("Verify Your Account", "Please use the verification code below to activate your account.", otp);
        await sendEmail(email, "Verify Your Account", html);

        res.status(201).json({ message: 'OTP sent. Please verify to complete registration. (Also check Spam Folder)' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. VERIFY EMAIL
const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const pool = await poolPromise;

        const pending = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query("SELECT * FROM PendingUsers WHERE Email=@email AND OtpCode=@otp AND OtpExpiry > GETDATE()");

        if (pending.recordset.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP' });

        const userData = pending.recordset[0];

        await pool.request()
            .input('name', sql.NVarChar, userData.Name)
            .input('email', sql.NVarChar, userData.Email)
            .input('phone', sql.NVarChar, userData.Phone)
            .input('hash', sql.NVarChar, userData.PasswordHash)
            .query(`INSERT INTO Users (Name, Email, Phone, PasswordHash, IsVerified) VALUES (@name, @email, @phone, @hash, 1)`);

        await pool.request().input('email', sql.NVarChar, email).query("DELETE FROM PendingUsers WHERE Email=@email");

        res.json({ message: 'Account created successfully! Please Login.' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3. LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await poolPromise;
        const result = await pool.request().input('email', sql.NVarChar, email).query('SELECT * FROM Users WHERE Email=@email');

        if (!result.recordset.length) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.recordset[0];
        if (!user.IsVerified) return res.status(403).json({ message: 'Email not verified. Please verify first.' });

        const valid = await bcrypt.compare(password, user.PasswordHash);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.UserID, email: user.Email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token, userId: user.UserID });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. FORGOT PASSWORD
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const pool = await poolPromise;

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiry', sql.DateTime, expiry)
            .query("UPDATE Users SET ResetToken=@otp, ResetExpiry=@expiry WHERE Email=@email");

        if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'Email not found' });

        // Send Professional HTML Email
        const html = getEmailHtml("Reset Password", "You requested to reset your password. Use the code below:", otp);
        await sendEmail(email, "Reset Password Request", html);

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

        const check = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .query("SELECT UserID FROM Users WHERE Email=@email AND ResetToken=@otp AND ResetExpiry > GETDATE()");

        if (!check.recordset.length) return res.status(400).json({ message: 'Invalid or expired code' });

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

// 6. RESEND OTP
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const pool = await poolPromise;

        const user = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT UserID, IsVerified FROM Users WHERE Email=@email");

        // If user is already verified (in Users table), don't resend
        if (user.recordset.length > 0 && user.recordset[0].IsVerified) {
            return res.status(400).json({ message: 'Account already verified. Please login.' });
        }

        // Logic: Update PendingUsers table for new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        // We check PendingUsers directly
        const pendingCheck = await pool.request().input('email', sql.NVarChar, email).query("SELECT PendingID FROM PendingUsers WHERE Email=@email");

        if (pendingCheck.recordset.length === 0) {
            return res.status(404).json({ message: 'No pending registration found. Please Register again.' });
        }

        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('otp', sql.NVarChar, otp)
            .input('expiry', sql.DateTime, expiry)
            .query("UPDATE PendingUsers SET OtpCode=@otp, OtpExpiry=@expiry WHERE Email=@email");

        // Send Professional HTML Email
        const html = getEmailHtml("New Verification Code", "Here is your new OTP code as requested.", otp);
        await sendEmail(email, "New Verification Code", html);

        res.json({ message: 'New OTP sent successfully' });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { register, verifyEmail, login, forgotPassword, resetPassword, resendOtp };