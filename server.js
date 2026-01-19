const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. NUCLEAR CORS FIX (Manual Headers - Must be first)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow ANY frontend
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  // Handle Preflight (OPTIONS) requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).send({});
  }
  next();
});

// 2. Standard Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 3. Database Check (Debugging)
const { poolPromise } = require('./config/db');
// We don't await here to not block startup, but we log status
poolPromise.then(() => {
    console.log("✅ Database connection established in server.js");
}).catch(err => {
    console.error("❌ Database connection FAILED in server.js:", err);
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

// 5. Health Check (Test this in browser!)
app.get('/', (req, res) => res.send('RideRevenue API is Live & CORS is fixed!'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));