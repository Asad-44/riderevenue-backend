// backend/controllers/shiftController.js
const { poolPromise, sql } = require('../config/db');

const createShift = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { driverId, date, shiftType, breakMinutes } = req.body;

    if (!driverId || !date || !shiftType) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    let startTime, endTime;
    if (shiftType === 'Morning') {
        startTime = date + ' 06:00:00';
        endTime = date + ' 14:00:00';
    } else if (shiftType === 'Evening') {
        startTime = date + ' 14:00:00';
        endTime = date + ' 22:00:00';
    } else if (shiftType === 'Night') {
        startTime = date + ' 22:00:00';
        endTime = date + ' 06:00:00';
    } else {
        return res.status(400).json({ message: 'Invalid shift type' });
    }

    const pool = await poolPromise;

    await pool.request()
      .input('userId', sql.Int, userId)
      .input('driverId', sql.Int, driverId)
      .input('date', sql.Date, date)
      .input('startTime', sql.DateTime, startTime)
      .input('endTime', sql.DateTime, endTime)
      .input('breakMinutes', sql.Int, breakMinutes || 0)
      .query(`
        INSERT INTO Shifts (UserID, DriverID, Date, StartTime, EndTime, BreakMinutes)
        VALUES (@userId, @driverId, @date, @startTime, @endTime, @breakMinutes)
      `);

    res.json({ message: 'Shift recorded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving shift', error: err.message });
  }
};



const listShifts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId)
      .query('SELECT s.*, d.Name as DriverName FROM Shifts s LEFT JOIN Drivers d ON s.DriverID = d.DriverID WHERE s.UserID=@userId ORDER BY s.Date DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error listing shifts' });
  }
};

const getShift = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('id', sql.Int, id)
      .query('SELECT s.*, d.Name as DriverName FROM Shifts s LEFT JOIN Drivers d ON s.DriverID = d.DriverID WHERE s.UserID=@userId AND s.ShiftID=@id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching shift' });
  }
};

module.exports = { createShift, listShifts, getShift };
