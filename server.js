const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sql, poolPromise } = require('./config/db');
require('dotenv').config();

const app = express();

// 1. CRITICAL: Trust Proxy for Render
app.set('trust proxy', 1);

// 2. CRITICAL: Manual CORS to force access
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(bodyParser.json());

// 3. DIAGNOSTIC ROUTE (Click this in browser to test DB)
app.get('/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT 1 as number");
        res.status(200).json({ 
            status: "SUCCESS", 
            message: "Database is connected and responding!", 
            data: result.recordset 
        });
    } catch (err) {
        console.error("DB TEST FAILED:", err);
        res.status(500).json({ 
            status: "ERROR", 
            message: "Database connection failed.", 
            error: err.message 
        });
    }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/mileage', require('./routes/mileage'));
app.use('/api/earnings', require('./routes/earnings'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/reports', require('./routes/reports'));
app.use("/api/dailylogs", require("./routes/dailyLogRoutes"));

app.get('/', (req, res) => res.send('API is Live'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));