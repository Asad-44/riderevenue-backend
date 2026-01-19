const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CORS MUST COME FIRST
app.use(cors({
  origin: true, // auto-allow requesting origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Explicit preflight handler (THIS FIXES RENDER)
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
