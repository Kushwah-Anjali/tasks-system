const express =
    require("express");

const taskController =
    require("../controllers/taskController");

const authMiddleware =
    require("../middleware/authMiddleware");

const managerMiddleware =
    require("../middleware/managerMiddleware");

const router =
    express.Router();


// =====================================
// Create Task
// Any logged-in user
// =====================================

router.post(
    "/",
    authMiddleware,
    taskController.createTask
);


// =====================================
// Assignee List
// Any logged-in user
// =====================================

router.get(
    "/assignees",
    authMiddleware,
    taskController.getTaskAssignees
);


// =====================================
// Employee Task Lists
// Keep these BEFORE /:id routes
// =====================================

router.get(
    "/my",
    authMiddleware,
    taskController.getMyTasks
);

router.get(
    "/created-by-me",
    authMiddleware,
    taskController.getCreatedByMe
);


// =====================================
// Manager - View All Tasks
// =====================================

router.get(
    "/",
    authMiddleware,
    managerMiddleware,
    taskController.getAllTasks
);


// =====================================
// Manager - Task Details
// =====================================

router.get(
    "/:id",
    authMiddleware,
    managerMiddleware,
    taskController.getTaskDetails
);


// =====================================
// Accept / Reject Assignment
// =====================================

router.patch(
    "/:id/accept",
    authMiddleware,
    taskController.acceptTask
);

router.patch(
    "/:id/reject",
    authMiddleware,
    taskController.rejectTask
);


// =====================================
// Hand Off / Reassign
// Current accepted assignee only
// =====================================

router.post(
    "/:id/handoff",
    authMiddleware,
    taskController.handoffTask
);


// =====================================
// Legacy Progress
// Kept temporarily for compatibility
// =====================================

router.patch(
    "/:id/progress",
    authMiddleware,
    taskController.updateTaskProgress
);


// =====================================
// Submit Task
// =====================================

router.patch(
    "/:id/submit",
    authMiddleware,
    taskController.submitTask
);


// =====================================
// Edit Task
// Creator OR Manager checked in service
// =====================================

router.patch(
    "/:id/edit",
    authMiddleware,
    taskController.updateTask
);


// =====================================
// Review Task
// Creator OR Manager checked in service
// =====================================

router.patch(
    "/:id/review",
    authMiddleware,
    taskController.reviewTask
);


// =====================================
// Delete Task
// Manager only
// =====================================

router.delete(
    "/:id",
    authMiddleware,
    managerMiddleware,
    taskController.deleteTask
);


module.exports = router;
