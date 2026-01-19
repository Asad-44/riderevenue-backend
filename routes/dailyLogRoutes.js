// const express = require("express");
// const router = express.Router();
// const { addDailyLog, getDailyLogs } = require("../controllers/dailyLogController");

// router.post("/add", addDailyLog);
// router.get("/all", getDailyLogs);

// module.exports = router;


const express = require("express");
const router = express.Router(); // 1. Router must be initialized here

// 2. Import the NEW functions we created
const { 
    createFullDailyEntry, 
    getCombinedLogs, 
    deleteLog, 
    updateLog 
} = require("../controllers/dailyLogController");

// 3. Define the routes
// Notice we use "/" instead of "/add" so it matches the frontend fetch call
router.post("/", createFullDailyEntry);      // Create
router.get("/combined", getCombinedLogs);    // Read (For Reports)
router.delete("/", deleteLog);               // Delete
router.put("/", updateLog);                  // Update

module.exports = router;