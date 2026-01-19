const express = require("express");
const router = express.Router();
const { addRide, getAllRides, deleteRide, updateRide, filterRide } = require("../controllers/rideController");

router.post("/add", addRide);
router.get("/all", getAllRides);
router.delete("/delete/:id", deleteRide);
router.put("/update/:id", updateRide);
router.post("/filter", filterRide);

module.exports = router;
