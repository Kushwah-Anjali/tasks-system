const express = require("express");

const employeeController = require("../controllers/employeeController");
const authMiddleware = require("../middleware/authMiddleware");
const managerMiddleware = require("../middleware/managerMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  managerMiddleware,
  employeeController.getAllEmployees
);

router.patch(
  "/:userId/attendance-permission",
  authMiddleware,
  managerMiddleware,
  employeeController.updateAttendancePermission
);

module.exports = router;