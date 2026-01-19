const { poolPromise, sql } = require("../config/db");

exports.monthlySummary = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month, year } = req.query;

        const pool = await poolPromise;

        const result = await pool.request()
            .input("userId", sql.Int, userId)
            .input("month", sql.Int, parseInt(month))
            .input("year", sql.Int, parseInt(year))
            .query(`
                SELECT 
                    SUM(TotalEarnings) AS TotalEarnings,
                    SUM(FuelCost) AS TotalFuel,
                    SUM(MaintenanceCost) AS TotalMaintenance,
                    SUM(OwnerShare) AS TotalOwnerShare,
                    SUM(DriverShare) AS TotalDriverShare,
                    SUM(NetProfit) AS NetProfit
                FROM Earnings
                WHERE UserID=@userId 
                AND MONTH(Date)=@month 
                AND YEAR(Date)=@year
            `);

        // fetch total mileage for the month
        const mileageResult = await pool.request()
            .input("userId", sql.Int, userId)
            .input("month", sql.Int, parseInt(month))
            .input("year", sql.Int, parseInt(year))
            .query(`
                SELECT SUM(EndReading - StartReading) AS TotalMileage
                FROM MileageLogs
                WHERE UserID=@userId 
                AND MONTH(Date)=@month 
                AND YEAR(Date)=@year
            `);

        res.json({
            ...result.recordset[0],
            TotalMileage: mileageResult.recordset[0].TotalMileage || 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating monthly summary" });
    }
};
