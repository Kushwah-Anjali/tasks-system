const express = require("express");

const attendanceController = require("../controllers/attendanceController");
const authMiddleware = require("../middleware/authMiddleware");
const attendanceManagerMiddleware = require(
  "../middleware/attendanceManagerMiddleware"
);
const attendanceViewerMiddleware = require(
  "../middleware/attendanceViewerMiddleware"
);
const attendanceUserMiddleware = require("../middleware/roleMiddleware")(
  "manager",
  "employee"
);

const router = express.Router();


// Mark or update attendance
router.post(
  "/",
  authMiddleware,
  attendanceUserMiddleware,
  attendanceManagerMiddleware,
  attendanceController.markAttendance
);


// Get all employees + attendance for selected date
router.get(
  "/daily",
  authMiddleware,
  attendanceUserMiddleware,
  attendanceViewerMiddleware,
  attendanceController.getDailyAttendance
);
router.get(
  "/employee/:employeeId/summary",
  authMiddleware,
  attendanceUserMiddleware,
  attendanceViewerMiddleware,
  attendanceController.getEmployeeAttendanceSummary
);

// Get one employee's attendance history
router.get(
  "/employee/:employeeId",
  authMiddleware,
  attendanceUserMiddleware,
  attendanceViewerMiddleware,
  attendanceController.getEmployeeAttendance
);


module.exports = router;
