const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
require("dotenv").config();

const { sql, connectDB } = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

connectDB();

// -------------------- USER LOGIN ---------------------
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await sql.query`SELECT * FROM Users WHERE email=${email}`;

        if (result.recordset.length === 0)
            return res.status(400).json({ message: "User not found" });

        const user = result.recordset[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: "Wrong Password" });

        const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET);

        res.json({ token, name: user.name });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// -------------------- ADD RIDE --------------------
app.post("/ride/add", async (req, res) => {
    const { driver_name, date, distance, fare } = req.body;

    try {
        await sql.query`
            INSERT INTO Rides (driver_name, date, distance, fare)
            VALUES (${driver_name}, ${date}, ${distance}, ${fare})
        `;

        res.json({ message: "Ride Added Successfully" });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// -------------------- LIST ALL RIDES --------------------
app.get("/rides", async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Rides ORDER BY date DESC`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// -------------------- MONTHLY REVENUE --------------------
app.get("/revenue/:month/:year", async (req, res) => {
    const { month, year } = req.params;

    try {
        const result = await sql.query`
            SELECT SUM(fare) as total_revenue
            FROM Rides
            WHERE MONTH(date) = ${month} AND YEAR(date) = ${year}
        `;

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// -------------------- DRIVER REPORT --------------------
app.get("/driver/:name", async (req, res) => {
    const { name } = req.params;

    try {
        const result = await sql.query`
            SELECT * FROM Rides WHERE driver_name=${name}
        `;

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// -------------------- START SERVER --------------------
app.listen(process.env.PORT, () => {
    console.log("Backend running on port " + process.env.PORT);
});
