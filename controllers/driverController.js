const { poolPromise, sql } = require('../config/db');

// 1. CREATE DRIVER
const createDriver = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name, cnic, phone, licenseNumber, licenseExpiry,
      compensationType, monthlySalary, driverPercent, ownerPercent
    } = req.body;

    // Basic Validations
    if (!cnic || cnic.length !== 15) return res.status(400).json({ message: "Invalid CNIC format" });
    if (phone && !/^03\d{2}-\d{7}$/.test(phone)) return res.status(400).json({ message: "Invalid Phone format" });
    if (!name || !compensationType) return res.status(400).json({ message: 'Missing fields' });

    const pool = await poolPromise;

    // --- DUPLICATE CHECK (Your Logic) ---
    const duplicateCheck = await pool.request()
      .input('cnic', sql.NVarChar, cnic)
      .input('phone', sql.NVarChar, phone)
      .input('license', sql.NVarChar, licenseNumber)
      .query(`
        SELECT TOP 1 DriverID 
        FROM Drivers
        WHERE 
          (CNIC = @cnic AND @cnic IS NOT NULL)
          OR (Phone = @phone AND @phone IS NOT NULL)
          OR (LicenseNumber = @license AND @license IS NOT NULL)
      `);

    if (duplicateCheck.recordset.length > 0) {
      return res.status(400).json({ message: "Driver already exists with same CNIC, Phone, or License Number" });
    }
    // ------------------------------------

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('name', sql.NVarChar, name)
      .input('cnic', sql.NVarChar, cnic)
      .input('phone', sql.NVarChar, phone || null)
      .input('licenseNumber', sql.NVarChar, licenseNumber || null)
      .input('licenseExpiry', sql.Date, licenseExpiry || null)
      .input('compType', sql.NVarChar, compensationType)
      .input('monthlySalary', sql.Decimal(12, 2), monthlySalary || null)
      .input('driverPercent', sql.Decimal(5, 2), driverPercent || null)
      .input('ownerPercent', sql.Decimal(5, 2), ownerPercent || null)
      .query(`INSERT INTO Drivers (UserID, Name, CNIC, Phone, LicenseNumber, LicenseExpiry, CompensationType, MonthlySalary, DriverPercent, OwnerPercent)
             OUTPUT INSERTED.DriverID VALUES (@userId,@name,@cnic,@phone,@licenseNumber,@licenseExpiry,@compType,@monthlySalary,@driverPercent,@ownerPercent)`);

    res.json({ driverId: result.recordset[0].DriverID });
  } catch (err) {
    console.error(err);
    // Fallback if DB constraint hits (race condition)
    if (err.number === 2601 || err.number === 2627) {
      return res.status(400).json({ message: "Duplicate entry detected." });
    }
    res.status(500).json({ message: 'Error creating driver' });
  }
};

// 2. LIST DRIVERS
const listDrivers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).query('SELECT * FROM Drivers WHERE UserID = @userId');
    res.json(result.recordset);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching drivers' });
  }
};

// 3. GET SINGLE DRIVER
const getDriver = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    const result = await pool.request().input('userId', sql.Int, userId).input('id', sql.Int, id).query('SELECT * FROM Drivers WHERE UserID = @userId AND DriverID = @id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error fetching driver' });
  }
};

// 4. UPDATE DRIVER
const updateDriver = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const {
      name, cnic, phone, licenseNumber, licenseExpiry,
      compensationType, monthlySalary, driverPercent, ownerPercent, status
    } = req.body;

    if (!cnic || cnic.length !== 15) return res.status(400).json({ message: "Invalid CNIC format" });
    if (phone && !/^03\d{2}-\d{7}$/.test(phone)) return res.status(400).json({ message: "Invalid Phone format" });

    const pool = await poolPromise;

    // --- DUPLICATE CHECK (Ignore Current ID) ---
    const duplicateCheck = await pool.request()
      .input('id', sql.Int, id)
      .input('cnic', sql.NVarChar, cnic)
      .input('phone', sql.NVarChar, phone)
      .input('license', sql.NVarChar, licenseNumber)
      .query(`
    SELECT TOP 1 DriverID 
    FROM Drivers
    WHERE DriverID <> @id
      AND (
        (CNIC = @cnic AND @cnic IS NOT NULL)
        OR (Phone = @phone AND @phone IS NOT NULL)
        OR (LicenseNumber = @license AND @license IS NOT NULL)
      )
  `);

    if (duplicateCheck.recordset.length > 0) {
      return res.status(400).json({
        message: "Another driver already uses this CNIC, Phone, or License Number"
      });
    }

    // -------------------------------------------

    await pool.request()
      .input('userId', sql.Int, userId)
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('cnic', sql.NVarChar, cnic)
      .input('phone', sql.NVarChar, phone || null)
      .input('licenseNumber', sql.NVarChar, licenseNumber || null)
      .input('licenseExpiry', sql.Date, licenseExpiry || null)
      .input('compType', sql.NVarChar, compensationType)
      .input('monthlySalary', sql.Decimal(12, 2), monthlySalary || null)
      .input('driverPercent', sql.Decimal(5, 2), driverPercent || null)
      .input('ownerPercent', sql.Decimal(5, 2), ownerPercent || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`UPDATE Drivers SET Name=@name, CNIC=@cnic, Phone=@phone, LicenseNumber=@licenseNumber, LicenseExpiry=@licenseExpiry,
              CompensationType=@compType, MonthlySalary=@monthlySalary, DriverPercent=@driverPercent, OwnerPercent=@ownerPercent, Status=@status
              WHERE UserID=@userId AND DriverID=@id`);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error(err);
    if (err.number === 2601 || err.number === 2627) return res.status(400).json({ message: "Duplicate entry detected." });
    res.status(500).json({ message: 'Error updating driver' });
  }
};

// 5. DELETE DRIVER
const deleteDriver = async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = parseInt(req.params.id);
    const pool = await poolPromise;
    await pool.request().input('userId', sql.Int, userId).input('id', sql.Int, id).query('DELETE FROM Drivers WHERE UserID=@userId AND DriverID=@id');
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ message: 'Error deleting driver' });
  }
};

module.exports = { createDriver, listDrivers, getDriver, updateDriver, deleteDriver };