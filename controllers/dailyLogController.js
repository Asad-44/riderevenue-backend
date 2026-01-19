const { sql, poolPromise } = require("../config/db");

exports.createFullDailyEntry = async (req, res) => {
    const {
        driverId, vehicleId, date,
        startReading, endReading,
        totalEarnings, fuelCost = 0
    } = req.body;

    if (!driverId || !vehicleId || !date) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const netProfit = totalEarnings - fuelCost;

    let tx;
    try {
        const pool = await poolPromise;
        tx = new sql.Transaction(pool);
        await tx.begin();

        const r = new sql.Request(tx);

        r.input("date", sql.Date, date);
        r.input("did", sql.Int, driverId);
        r.input("vid", sql.Int, vehicleId);
        r.input("start", sql.Int, startReading);
        r.input("end", sql.Int, endReading);
        r.input("earnings", sql.Decimal(12, 2), totalEarnings);
        r.input("fuel", sql.Decimal(12, 2), fuelCost);
        r.input("net", sql.Decimal(12, 2), netProfit);

        // Shift
        await r.query(`
            INSERT INTO Shifts (UserID, DriverID, Date, StartTime, EndTime)
            VALUES (1, @did, @date, '08:00', '17:00')
        `);

        // Mileage
        await r.query(`
            INSERT INTO MileageLogs (UserID, VehicleID, DriverID, Date, StartReading, EndReading)
            VALUES (1, @vid, @did, @date, @start, @end)
        `);

        // Earnings
        await r.query(`
            INSERT INTO Earnings (UserID, DriverID, VehicleID, Date, TotalEarnings, FuelCost, NetProfit)
            VALUES (1, @did, @vid, @date, @earnings, @fuel, @net)
        `);

        await tx.commit();
        res.json({ message: "Saved successfully" });

    } catch (err) {
        if (tx) await tx.rollback();

        if (err.number === 2627) {
            return res.status(400).json({ message: "Entry already exists" });
        }

        res.status(500).json({ message: err.message });
    }
};

exports.getCombinedLogs = async (req, res) => {
    const { from, to } = req.query;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("from", sql.Date, from)
            .input("to", sql.Date, to)
            .query(`
                SELECT 
                    m.Date,
                    d.Name AS DriverName,
                    v.NumberPlate,
                    m.StartReading,
                    m.EndReading,
                    m.Distance,
                    e.TotalEarnings,
                    e.FuelCost,
                    e.NetProfit
                FROM MileageLogs m
                JOIN Earnings e 
                    ON e.Date = m.Date AND e.DriverID = m.DriverID AND e.VehicleID = m.VehicleID
                JOIN Drivers d ON d.DriverID = m.DriverID
                JOIN Vehicles v ON v.VehicleID = m.VehicleID
                WHERE m.Date BETWEEN @from AND @to
                ORDER BY m.Date DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.updateLog = async (req, res) => {
    const {
        driverId, vehicleId, date,
        startReading, endReading,
        totalEarnings, fuelCost
    } = req.body;

    const netProfit = totalEarnings - fuelCost;
    let tx;

    try {
        const pool = await poolPromise;
        tx = new sql.Transaction(pool);
        await tx.begin();

        const r = new sql.Request(tx);
        r.input("date", sql.Date, date);
        r.input("did", sql.Int, driverId);
        r.input("vid", sql.Int, vehicleId);
        r.input("start", sql.Int, startReading);
        r.input("end", sql.Int, endReading);
        r.input("earnings", sql.Decimal(12, 2), totalEarnings);
        r.input("fuel", sql.Decimal(12, 2), fuelCost);
        r.input("net", sql.Decimal(12, 2), netProfit);

        await r.query(`
            UPDATE MileageLogs
            SET StartReading=@start, EndReading=@end
            WHERE Date=@date AND DriverID=@did AND VehicleID=@vid
        `);

        await r.query(`
            UPDATE Earnings
            SET TotalEarnings=@earnings, FuelCost=@fuel, NetProfit=@net
            WHERE Date=@date AND DriverID=@did AND VehicleID=@vid
        `);

        await tx.commit();
        res.json({ message: "Updated successfully" });

    } catch (err) {
        if (tx) await tx.rollback();
        res.status(500).json({ message: err.message });
    }
};

exports.deleteLog = async (req, res) => {
    const { date, driverId, vehicleId } = req.body;
    let tx;

    try {
        const pool = await poolPromise;
        tx = new sql.Transaction(pool);
        await tx.begin();

        const r = new sql.Request(tx);
        r.input("date", sql.Date, date);
        r.input("did", sql.Int, driverId);
        r.input("vid", sql.Int, vehicleId);

        await r.query(`DELETE FROM Earnings WHERE Date=@date AND DriverID=@did AND VehicleID=@vid`);
        await r.query(`DELETE FROM MileageLogs WHERE Date=@date AND DriverID=@did AND VehicleID=@vid`);
        await r.query(`DELETE FROM Shifts WHERE Date=@date AND DriverID=@did`);

        await tx.commit();
        res.json({ message: "Deleted successfully" });

    } catch (err) {
        if (tx) await tx.rollback();
        res.status(500).json({ message: err.message });
    }
};
