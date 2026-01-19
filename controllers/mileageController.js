// backend/controllers/mileageController.js
const { poolPromise, sql } = require('../config/db');

const createMileage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleId, driverId, date, startReading, endReading, notes } = req.body;
    if (!vehicleId || !driverId || !date || startReading == null || endReading == null) return res.status(400).json({ message: 'Missing fields' });
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('vehicleId', sql.Int, vehicleId)
      .input('driverId', sql.Int, driverId)
      .input('date', sql.Date, date)
      .input('startReading', sql.Int, startReading)
      .input('endReading', sql.Int, endReading)
      .input('notes', sql.NVarChar, notes || null)
      .query(`INSERT INTO MileageLogs (UserID, VehicleID, DriverID, Date, StartReading, EndReading, Notes)
              OUTPUT INSERTED.MileageID VALUES (@userId,@vehicleId,@driverId,@date,@startReading,@endReading,@notes)`);
    await pool.request().input('vehicleId', sql.Int, vehicleId).input('endReading', sql.Int, endReading)
      .query(`UPDATE Vehicles SET CurrentMileage = CASE WHEN CurrentMileage IS NULL OR @endReading > CurrentMileage THEN @endReading ELSE CurrentMileage END WHERE VehicleID = @vehicleId`);
    res.json({ mileageId: result.recordset[0].MileageID });
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error creating mileage' });
  }
};

const listMileageByUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, from, to } = req.query;

    const pool = await poolPromise;

    // DAILY REPORT
    if (date) {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('date', sql.Date, date)
        .query(`
          SELECT m.*, v.NumberPlate, d.Name as DriverName
          FROM MileageLogs m
          LEFT JOIN Vehicles v ON m.VehicleID = v.VehicleID
          LEFT JOIN Drivers d ON m.DriverID = d.DriverID
          WHERE m.UserID = @userId AND m.Date = @date
          ORDER BY m.Date DESC
        `);
      return res.json(result.recordset);
    }

    // RANGE REPORT
    if (from && to) {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('from', sql.Date, from)
        .input('to', sql.Date, to)
        .query(`
          SELECT m.*, v.NumberPlate, d.Name as DriverName
          FROM MileageLogs m
          LEFT JOIN Vehicles v ON m.VehicleID = v.VehicleID
          LEFT JOIN Drivers d ON m.DriverID = d.DriverID
          WHERE m.UserID = @userId AND m.Date BETWEEN @from AND @to
          ORDER BY m.Date DESC
        `);
      return res.json(result.recordset);
    }

    // ALL MILEAGE (default)
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT m.*, v.NumberPlate, d.Name as DriverName
        FROM MileageLogs m
        LEFT JOIN Vehicles v ON m.VehicleID=v.VehicleID
        LEFT JOIN Drivers d ON m.DriverID=d.DriverID
        WHERE m.UserID=@userId
        ORDER BY m.Date DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching mileage logs' });
  }
};


const listMileageByVehicle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const vehicleId = parseInt(req.params.id);
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('vehicleId', sql.Int, vehicleId)
      .query('SELECT * FROM MileageLogs WHERE UserID=@userId AND VehicleID=@vehicleId ORDER BY Date DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching mileage logs' });
  }
};

const getMileage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('id', sql.Int, id)
      .query('SELECT * FROM MileageLogs WHERE UserID=@userId AND MileageID=@id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching mileage entry' });
  }
};

module.exports = { createMileage, listMileageByUser, listMileageByVehicle, getMileage };
