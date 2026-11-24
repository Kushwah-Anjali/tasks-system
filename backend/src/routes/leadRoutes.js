const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const csrfOriginMiddleware = require("../middleware/csrfOriginMiddleware");
const controller = require("../controllers/leadController");

const router = express.Router();
const manager = roleMiddleware("manager");
const employee = roleMiddleware("employee");

router.use(authMiddleware);
router.get("/mine", employee, controller.mine);
router.get("/mine/history", employee, controller.mineHistory);
router.get("/:id/history/:assignmentId", employee, controller.mineHistoryDetail);
router.get("/assignees", manager, controller.assignees);
router.get("/sales-assignees", manager, controller.salesAssignees);
router.get("/execution-assignees", manager, controller.executionAssignees);
router.get("/", manager, controller.list);
router.get("/:id", roleMiddleware("manager", "employee"), controller.details);
router.get("/:id/history", roleMiddleware("manager", "employee"), controller.details);

router.post("/", manager, csrfOriginMiddleware, controller.create);
router.patch("/:id/business-details", manager, csrfOriginMiddleware, controller.businessDetails);
router.post("/:id/sales-assignment", manager, csrfOriginMiddleware, controller.salesAssignment);
router.post("/:id/execution", manager, csrfOriginMiddleware, controller.execution);
router.post("/:id/assignments/:assignmentId/review", manager, csrfOriginMiddleware, controller.assignmentReview);
router.post("/:id/assignments/:assignmentId/reassign", manager, csrfOriginMiddleware, controller.assignmentReassign);
router.post("/:id/assignments/:assignmentId/end", manager, csrfOriginMiddleware, controller.assignmentEnd);
router.post("/:id/update-submission", employee, csrfOriginMiddleware, controller.employeeSubmission);
router.post("/:id/update-review", manager, csrfOriginMiddleware, controller.employeeUpdateReview);
router.post("/:id/status", manager, csrfOriginMiddleware, controller.managerStatus);
router.post("/:id/return-to-sales", manager, csrfOriginMiddleware, controller.returnFinalToSales);
router.post("/:id/complete", manager, csrfOriginMiddleware, controller.complete);
router.post("/:id/manager-remark", manager, csrfOriginMiddleware, controller.managerRemark);

module.exports = router;
