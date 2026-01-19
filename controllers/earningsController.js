// backend/controllers/earningsController.js
const { poolPromise, sql } = require('../config/db');

const createEarning = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { driverId, vehicleId, date, totalEarnings, fuelCost, maintenanceCost } = req.body;
    if (!driverId || !vehicleId || !date || totalEarnings == null) return res.status(400).json({ message: 'Missing fields' });

    const pool = await poolPromise;
    // ensure driver belongs to user
    const checkDriver = await pool.request().input('driverId', sql.Int, driverId).input('userId', sql.Int, userId)
      .query('SELECT * FROM Drivers WHERE DriverID=@driverId AND UserID=@userId');
    if (!checkDriver.recordset.length) return res.status(400).json({ message: 'Driver not found' });

    const driver = checkDriver.recordset[0];
    let driverShare = 0, ownerShare = 0;
    if (driver.CompensationType === 'Salary') {
      driverShare = 0; ownerShare = totalEarnings;
    } else {
      const dPercent = parseFloat(driver.DriverPercent) || 0;
      const oPercent = parseFloat(driver.OwnerPercent) || (100 - dPercent);
      driverShare = (totalEarnings * dPercent) / 100.0;
      ownerShare = (totalEarnings * oPercent) / 100.0;
    }
    const netProfit = parseFloat(totalEarnings) - (parseFloat(fuelCost || 0) + parseFloat(maintenanceCost || 0));

    await pool.request()
      .input('userId', sql.Int, userId)
      .input('driverId', sql.Int, driverId)
      .input('vehicleId', sql.Int, vehicleId)
      .input('date', sql.Date, date)
      .input('totalEarnings', sql.Decimal(12,2), totalEarnings)
      .input('fuelCost', sql.Decimal(12,2), fuelCost || 0)
      .input('maintenanceCost', sql.Decimal(12,2), maintenanceCost || 0)
      .input('driverShare', sql.Decimal(12,2), driverShare)
      .input('ownerShare', sql.Decimal(12,2), ownerShare)
      .input('netProfit', sql.Decimal(12,2), netProfit)
      .query(`INSERT INTO Earnings (UserID, DriverID, VehicleID, Date, TotalEarnings, FuelCost, MaintenanceCost, DriverShare, OwnerShare, NetProfit)
              VALUES (@userId,@driverId,@vehicleId,@date,@totalEarnings,@fuelCost,@maintenanceCost,@driverShare,@ownerShare,@netProfit)`);

    res.json({ message: 'Earnings recorded', driverShare, ownerShare, netProfit });
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error saving earnings' });
  }
};

const listEarnings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.query;

    const pool = await poolPromise;

    // DAILY REPORT
    if (date) {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('date', sql.Date, date)
        .query(`
          SELECT e.*, d.Name as DriverName, v.NumberPlate
          FROM Earnings e
          LEFT JOIN Drivers d ON e.DriverID=d.DriverID
          LEFT JOIN Vehicles v ON e.VehicleID=v.VehicleID
          WHERE e.UserID=@userId AND e.Date=@date
          ORDER BY e.Date DESC
        `);
      return res.json(result.recordset);
    }

    // ORIGINAL - ALL EARNINGS
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT e.*, d.Name as DriverName, v.NumberPlate
        FROM Earnings e
        LEFT JOIN Drivers d ON e.DriverID=d.DriverID
        LEFT JOIN Vehicles v ON e.VehicleID=v.VehicleID
        WHERE e.UserID=@userId
        ORDER BY e.Date DESC
      `);

    res.json(result.recordset);

  } catch (err) {
    console.error(err); 
    res.status(500).json({ message: 'Error listing earnings' });
  }
};


const getEarningsRange = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to } = req.query;
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('from', sql.Date, from).input('to', sql.Date, to)
      .query('SELECT e.*, d.Name as DriverName, v.NumberPlate FROM Earnings e LEFT JOIN Drivers d ON e.DriverID=d.DriverID LEFT JOIN Vehicles v ON e.VehicleID=v.VehicleID WHERE e.UserID=@userId AND e.Date BETWEEN @from AND @to ORDER BY e.Date DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching earnings range' });
  }
};

module.exports = { createEarning, listEarnings, getEarningsRange };
