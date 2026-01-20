// backend/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');
require('dotenv').config();

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const pool = await poolPromise;
    const existing = await pool.request().input('email', sql.NVarChar, email).query('SELECT UserID FROM Users WHERE Email=@email');
    
    if (existing.recordset.length) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone || '')
      .input('passwordHash', sql.NVarChar, hash)
      .query('INSERT INTO Users (Name, Email, Phone, PasswordHash) VALUES (@name, @email, @phone, @passwordHash); SELECT @@IDENTITY AS UserID');
    
    const userId = result.recordset[0].UserID;
    const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ message: 'Registered successfully', token, userId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT UserID, Email, PasswordHash FROM Users WHERE Email=@email');
    
    if (!result.recordset.length) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(password, user.PasswordHash);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.UserID, email: user.Email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(200).json({ message: 'Login successful', token, userId: user.UserID });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

module.exports = { register, login };


