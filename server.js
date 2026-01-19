// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/mileage', require('./routes/mileage'));
app.use('/api/earnings', require('./routes/earnings'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/reports', require('./routes/reports'));
app.use("/api/summary", require("./routes/summary"));


const dailyLogRoutes = require("./routes/dailyLogRoutes");

app.use("/api/dailylogs", dailyLogRoutes);

// health
app.get('/', (req, res) => res.send('RideRevenue Tracker API running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
