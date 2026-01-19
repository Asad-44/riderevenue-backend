const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { monthlySummary } = require("../controllers/summaryController");

router.get("/", authenticate, monthlySummary);

module.exports = router;
