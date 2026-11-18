const express = require("express");

const employeeController = require("../controllers/employeeController");
const authMiddleware = require("../middleware/authMiddleware");
const managerMiddleware = require("../middleware/managerMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  managerMiddleware,
  employeeController.createEmployee
);

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

router.patch(
  "/:userId",
  authMiddleware,
  managerMiddleware,
  employeeController.updateEmployee
);

router.delete(
  "/:userId",
  authMiddleware,
  managerMiddleware,
  employeeController.deleteEmployee
);

module.exports = router;
