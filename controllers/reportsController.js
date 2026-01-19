const { poolPromise, sql } = require('../config/db');

// 1. Monthly Summary
const monthlySummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    const pool = await poolPromise;
    
    // Uses distinct aggregation to avoid adding duplicates
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('month', sql.Int, parseInt(month))
      .input('year', sql.Int, parseInt(year))
      .query(`
        WITH UniqueEarnings AS (
            SELECT 
                TotalEarnings, FuelCost, MaintenanceCost, OwnerShare, DriverShare, NetProfit,
                ROW_NUMBER() OVER(PARTITION BY Date, DriverID, VehicleID ORDER BY EarningID DESC) as RowNum
            FROM Earnings
            WHERE UserID=@userId AND MONTH(Date)=@month AND YEAR(Date)=@year
        )
        SELECT 
          ISNULL(SUM(TotalEarnings), 0) as TotalEarnings,
          ISNULL(SUM(FuelCost), 0) as TotalFuel,
          ISNULL(SUM(MaintenanceCost), 0) as TotalMaintenance,
          ISNULL(SUM(OwnerShare), 0) as TotalOwnerShare,
          ISNULL(SUM(DriverShare), 0) as TotalDriverShare,
          ISNULL(SUM(NetProfit), 0) as NetProfit
        FROM UniqueEarnings
        WHERE RowNum = 1
      `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating summary' });
  }
};

// 2. Driver Performance Report (Fixed Totals)
const getDriverPerformanceReport = async (req, res) => {
  const { driverId, from, to } = req.query;

  if (!driverId || !from || !to) return res.status(400).json({ message: 'Missing params' });

  try {
    const pool = await poolPromise;

    // A. Driver Info
    const driverResult = await pool.request()
      .input('driverId', sql.Int, parseInt(driverId))
      .query('SELECT * FROM Drivers WHERE DriverID = @driverId');

    if (driverResult.recordset.length === 0) return res.status(404).json({ message: 'Driver not found' });

    // B. Overall Stats (FIX: sums only unique rows)
    const overallStats = await pool.request()
      .input('driverId', sql.Int, parseInt(driverId))
      .input('fromDate', sql.Date, from)
      .input('toDate', sql.Date, to)
      .query(`
        WITH CleanData AS (
            SELECT 
                m.Date, 
                m.Distance,
                (SELECT TOP 1 TotalEarnings FROM Earnings e WHERE e.DriverID = m.DriverID AND e.Date = m.Date AND e.VehicleID = m.VehicleID) as TotalEarnings,
                (SELECT TOP 1 FuelCost FROM Earnings e WHERE e.DriverID = m.DriverID AND e.Date = m.Date AND e.VehicleID = m.VehicleID) as FuelCost,
                (SELECT TOP 1 DriverShare FROM Earnings e WHERE e.DriverID = m.DriverID AND e.Date = m.Date AND e.VehicleID = m.VehicleID) as DriverShare,
                ROW_NUMBER() OVER(PARTITION BY m.Date, m.VehicleID ORDER BY m.MileageID DESC) as RowNum
            FROM MileageLogs m
            WHERE m.DriverID = @driverId AND m.Date BETWEEN @fromDate AND @toDate
        )
        SELECT 
            COUNT(Date) as TotalShifts,
            COUNT(DISTINCT Date) as TotalDays,
            ISNULL(SUM(Distance), 0) as TotalMileage,
            ISNULL(SUM(TotalEarnings), 0) as TotalEarnings,
            ISNULL(SUM(FuelCost), 0) as TotalFuelCost,
            ISNULL(SUM(DriverShare), 0) as TotalDriverShare
        FROM CleanData
        WHERE RowNum = 1
      `);

    // C. Daily Performance List
    const dailyPerformance = await pool.request()
      .input('driverId', sql.Int, parseInt(driverId))
      .input('fromDate', sql.Date, from)
      .input('toDate', sql.Date, to)
      .query(`
        WITH UniqueLogs AS (
            SELECT 
                m.Date, m.VehicleID, m.DriverID, m.Distance,
                ROW_NUMBER() OVER(PARTITION BY m.Date, m.VehicleID ORDER BY m.MileageID DESC) as RowNum
            FROM MileageLogs m
            WHERE m.DriverID = @driverId AND m.Date BETWEEN @fromDate AND @toDate
        )
        SELECT 
          u.Date,
          'Standard' as ShiftType,
          v.NumberPlate,
          u.Distance as Mileage,
          (SELECT TOP 1 TotalEarnings FROM Earnings e WHERE e.Date = u.Date AND e.DriverID = u.DriverID AND e.VehicleID = u.VehicleID) as TotalEarnings,
          (SELECT TOP 1 FuelCost FROM Earnings e WHERE e.Date = u.Date AND e.DriverID = u.DriverID AND e.VehicleID = u.VehicleID) as FuelCost,
          (SELECT TOP 1 DriverShare FROM Earnings e WHERE e.Date = u.Date AND e.DriverID = u.DriverID AND e.VehicleID = u.VehicleID) as DriverShare
        FROM UniqueLogs u
        JOIN Vehicles v ON u.VehicleID = v.VehicleID
        WHERE u.RowNum = 1 
        ORDER BY u.Date DESC
      `);
      
    const stats = overallStats.recordset[0];
    stats.AvgEarningsPerShift = stats.TotalShifts > 0 ? (stats.TotalEarnings / stats.TotalShifts) : 0;
    stats.AvgMileagePerShift = stats.TotalShifts > 0 ? (stats.TotalMileage / stats.TotalShifts) : 0;

    const shiftTypeStats = [{ ShiftType: "Total Logs", ShiftCount: stats.TotalShifts, TotalEarnings: stats.TotalEarnings }];

    res.json({
      driver: driverResult.recordset[0],
      overallStats: stats,
      shiftTypeStats: shiftTypeStats,
      vehicleStats: [], 
      dailyPerformance: dailyPerformance.recordset
    });

  } catch (err) {
    console.error('Error fetching driver performance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 3. Vehicle Performance Report (Fixed Totals)
const getVehiclePerformanceReport = async (req, res) => {
  const { vehicleId, from, to } = req.query;

  if (!vehicleId || !from || !to) return res.status(400).json({ message: 'Missing params' });

  try {
    const pool = await poolPromise;

    const vehicleResult = await pool.request()
      .input('vehicleId', sql.Int, parseInt(vehicleId))
      .query('SELECT * FROM Vehicles WHERE VehicleID = @vehicleId');

    if (vehicleResult.recordset.length === 0) return res.status(404).json({ message: 'Vehicle not found' });

    // B. Overall Stats (FIX: sums only unique rows)
    const overallStats = await pool.request()
      .input('vehicleId', sql.Int, parseInt(vehicleId))
      .input('fromDate', sql.Date, from)
      .input('toDate', sql.Date, to)
      .query(`
        WITH CleanData AS (
            SELECT 
                m.Date, m.DriverID, m.StartReading, m.EndReading, m.Distance,
                (SELECT TOP 1 TotalEarnings FROM Earnings e WHERE e.VehicleID = m.VehicleID AND e.Date = m.Date AND e.DriverID = m.DriverID) as TotalEarnings,
                (SELECT TOP 1 FuelCost FROM Earnings e WHERE e.VehicleID = m.VehicleID AND e.Date = m.Date AND e.DriverID = m.DriverID) as FuelCost,
                (SELECT TOP 1 NetProfit FROM Earnings e WHERE e.VehicleID = m.VehicleID AND e.Date = m.Date AND e.DriverID = m.DriverID) as NetProfit,
                ROW_NUMBER() OVER(PARTITION BY m.Date, m.DriverID ORDER BY m.MileageID DESC) as RowNum
            FROM MileageLogs m
            WHERE m.VehicleID = @vehicleId AND m.Date BETWEEN @fromDate AND @toDate
        )
        SELECT 
            COUNT(Date) as TotalShifts,
            COUNT(DISTINCT Date) as TotalDays,
            COUNT(DISTINCT DriverID) as TotalDrivers,
            ISNULL(SUM(Distance), 0) as TotalMileage,
            MIN(StartReading) as InitialReading,
            MAX(EndReading) as FinalReading,
            ISNULL(SUM(TotalEarnings), 0) as TotalEarnings,
            ISNULL(SUM(FuelCost), 0) as TotalFuelCost,
            ISNULL(SUM(NetProfit), 0) as TotalNetProfit
        FROM CleanData
        WHERE RowNum = 1
      `);

    // C. Daily List
    const dailyPerformance = await pool.request()
      .input('vehicleId', sql.Int, parseInt(vehicleId))
      .input('fromDate', sql.Date, from)
      .input('toDate', sql.Date, to)
      .query(`
        WITH UniqueLogs AS (
            SELECT 
                m.Date, m.VehicleID, m.DriverID, m.Distance, m.StartReading, m.EndReading,
                ROW_NUMBER() OVER(PARTITION BY m.Date, m.DriverID ORDER BY m.MileageID DESC) as RowNum
            FROM MileageLogs m
            WHERE m.VehicleID = @vehicleId AND m.Date BETWEEN @fromDate AND @toDate
        )
        SELECT 
          u.Date,
          'Standard' as ShiftType,
          d.Name as DriverName,
          u.StartReading,
          u.EndReading,
          u.Distance as Mileage,
          (SELECT TOP 1 TotalEarnings FROM Earnings e WHERE e.Date = u.Date AND e.DriverID = u.DriverID AND e.VehicleID = u.VehicleID) as TotalEarnings,
          (SELECT TOP 1 FuelCost FROM Earnings e WHERE e.Date = u.Date AND e.DriverID = u.DriverID AND e.VehicleID = u.VehicleID) as FuelCost,
          (SELECT TOP 1 NetProfit FROM Earnings e WHERE e.Date = u.Date AND e.DriverID = u.DriverID AND e.VehicleID = u.VehicleID) as NetProfit
        FROM UniqueLogs u
        JOIN Drivers d ON u.DriverID = d.DriverID
        WHERE u.RowNum = 1 
        ORDER BY u.Date DESC
      `);

    const stats = overallStats.recordset[0];
    
    const efficiency = {
      earningsPerKm: stats.TotalMileage > 0 ? (stats.TotalEarnings / stats.TotalMileage).toFixed(2) : '0.00',
      profitPerKm: stats.TotalMileage > 0 ? (stats.TotalNetProfit / stats.TotalMileage).toFixed(2) : '0.00',
      fuelCostPerKm: stats.TotalMileage > 0 ? (stats.TotalFuelCost / stats.TotalMileage).toFixed(2) : '0.00',
      utilizationRate: stats.TotalDays > 0 ? ((stats.TotalShifts / stats.TotalDays) * 100).toFixed(1) : '0.0'
    };
    stats.AvgEarningsPerShift = stats.TotalShifts > 0 ? (stats.TotalEarnings / stats.TotalShifts) : 0;

    res.json({
      vehicle: vehicleResult.recordset[0],
      overallStats: stats,
      efficiency,
      driverStats: [], 
      shiftTypeStats: [],
      dailyPerformance: dailyPerformance.recordset
    });

  } catch (err) {
    console.error('Error fetching vehicle performance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  monthlySummary,
  getDriverPerformanceReport,
  getVehiclePerformanceReport,
  driverPerformance: getDriverPerformanceReport 
};