// backend/controllers/vehicleController.js
const { poolPromise, sql } = require('../config/db');

const createVehicle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { numberPlate, model, registrationExpiry, fitnessExpiry, engineType, currentMileage, driverId } = req.body;
    const pool = await poolPromise;

    // DUPLICATE CHECK
    const dupCheck = await pool.request()
      .input('numberPlate', sql.NVarChar, numberPlate)
      .query(`
    SELECT TOP 1 VehicleID 
    FROM Vehicles 
    WHERE NumberPlate = @numberPlate
  `);

    if (dupCheck.recordset.length > 0) {
      return res.status(400).json({
        message: "A vehicle with this number plate already exists"
      });
    }


    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('driverId', sql.Int, driverId || null)
      .input('numberPlate', sql.NVarChar, numberPlate)
      .input('model', sql.NVarChar, model || null)
      .input('registrationExpiry', sql.Date, registrationExpiry || null)
      .input('fitnessExpiry', sql.Date, fitnessExpiry || null)
      .input('engineType', sql.NVarChar, engineType || null)
      .input('currentMileage', sql.Int, currentMileage || null)
      .query(`INSERT INTO Vehicles (UserID, DriverID, NumberPlate, Model, RegistrationExpiry, FitnessExpiry, EngineType, CurrentMileage)
              OUTPUT INSERTED.VehicleID VALUES (@userId,@driverId,@numberPlate,@model,@registrationExpiry,@fitnessExpiry,@engineType,@currentMileage)`);
    res.json({ vehicleId: result.recordset[0].VehicleID });
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error creating vehicle' });
  }
};

const listVehicles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId)
      .query('SELECT v.*, d.Name as DriverName FROM Vehicles v LEFT JOIN Drivers d ON v.DriverID=d.DriverID WHERE v.UserID = @userId');
    res.json(result.recordset);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching vehicles' });
  }
};

const getVehicle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('id', sql.Int, id)
      .query('SELECT * FROM Vehicles WHERE UserID = @userId AND VehicleID = @id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching vehicle' });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const { numberPlate, model, registrationExpiry, fitnessExpiry, engineType, currentMileage, driverId } = req.body;
    const pool = await poolPromise;

    // DUPLICATE CHECK (exclude current vehicle)
    const dupCheck = await pool.request()
      .input('numberPlate', sql.NVarChar, numberPlate)
      .input('id', sql.Int, id)
      .query(`
    SELECT TOP 1 VehicleID 
    FROM Vehicles 
    WHERE NumberPlate = @numberPlate
      AND VehicleID <> @id
  `);

    if (dupCheck.recordset.length > 0) {
      return res.status(400).json({
        message: "Another vehicle already uses this number plate"
      });
    }


    await pool.request()
      .input('userId', sql.Int, userId)
      .input('id', sql.Int, id)
      .input('numberPlate', sql.NVarChar, numberPlate)
      .input('model', sql.NVarChar, model || null)
      .input('registrationExpiry', sql.Date, registrationExpiry || null)
      .input('fitnessExpiry', sql.Date, fitnessExpiry || null)
      .input('engineType', sql.NVarChar, engineType || null)
      .input('currentMileage', sql.Int, currentMileage || null)
      .input('driverId', sql.Int, driverId || null)
      .query(`UPDATE Vehicles SET NumberPlate=@numberPlate, Model=@model, RegistrationExpiry=@registrationExpiry,
              FitnessExpiry=@fitnessExpiry, EngineType=@engineType, CurrentMileage=@currentMileage, DriverID=@driverId
              WHERE UserID=@userId AND VehicleID=@id`);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error updating vehicle' });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    await pool.request().input('userId', sql.Int, userId).input('id', sql.Int, id)
      .query('DELETE FROM Vehicles WHERE UserID=@userId AND VehicleID=@id');
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error deleting vehicle' });
  }
};

module.exports = { createVehicle, listVehicles, getVehicle, updateVehicle, deleteVehicle };
