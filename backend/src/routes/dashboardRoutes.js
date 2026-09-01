const express = require("express");

const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");
const managerMiddleware = require("../middleware/managerMiddleware");

const router = express.Router();

router.get(
    "/stats",
    authMiddleware,
    managerMiddleware,
    dashboardController.getDashboardStats
);

router.get(
    "/recent-attendance",
    authMiddleware,
    managerMiddleware,
    dashboardController.getRecentAttendance
);

module.exports = router;
