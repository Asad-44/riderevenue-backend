const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. ENABLE CORS (Allow Netlify & Localhost)
app.use(cors({
    origin: '*', // Allow all origins (Easiest for testing)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable Preflight for all routes
app.options('*', cors());

// 2. Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 3. Database Connection
const { poolPromise } = require('./config/db');
poolPromise.then(() => {
    console.log("✅ Database Connected!");
}).catch(err => {
    console.error("❌ Database Connection Failed:", err);
});

// 4. Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/mileage', require('./routes/mileage'));
app.use('/api/earnings', require('./routes/earnings'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/reports', require('./routes/reports'));
app.use("/api/dailylogs", require("./routes/dailyLogRoutes"));

// 5. Global Error Handler (Prevents crashes from looking like CORS errors)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// 6. Health Check
app.get('/', (req, res) => res.send('RideRevenue API is Online'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));