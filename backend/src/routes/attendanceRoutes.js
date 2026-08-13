const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/check-in",
  authMiddleware,
  attendanceController.checkIn
);

router.post(
  "/check-out",
  authMiddleware,
  attendanceController.checkOut
);

router.get(
  "/today",
  authMiddleware,
  attendanceController.getTodayAttendance
);
router.get(
  "/weekly",
  authMiddleware,
  attendanceController.getWeeklyAttendance
);
router.get(
  "/monthly-summary",
  authMiddleware,
  attendanceController.getMonthlySummary
);
router.get(
  "/monthly",
  authMiddleware,
  attendanceController.getMonthlyAttendance
);
module.exports = router;