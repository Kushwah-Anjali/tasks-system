const express =
    require("express");

const taskController =
    require("../controllers/taskController");

const authMiddleware =
    require("../middleware/authMiddleware");

const managerMiddleware =
    require("../middleware/managerMiddleware");
const taskUserMiddleware =
    require("../middleware/taskUserMiddleware");

const router =
    express.Router();


// =====================================
// Create Task
// Any logged-in user
// =====================================

router.post(
    "/",
    authMiddleware,
    taskUserMiddleware,
    taskController.createTask
);


// =====================================
// Assignee List
// Any logged-in user
// =====================================

router.get(
    "/assignees",
    authMiddleware,
    taskUserMiddleware,
    taskController.getTaskAssignees
);


// =====================================
// Employee Task Lists
// Keep these BEFORE /:id routes
// =====================================

router.get(
    "/my",
    authMiddleware,
    taskUserMiddleware,
    taskController.getMyTasks
);

router.get(
    "/created-by-me",
    authMiddleware,
    taskUserMiddleware,
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
    taskUserMiddleware,
    taskController.acceptTask
);

router.patch(
    "/:id/reject",
    authMiddleware,
    taskUserMiddleware,
    taskController.rejectTask
);


// =====================================
// Hand Off / Reassign
// Current accepted assignee only
// =====================================

router.post(
    "/:id/handoff",
    authMiddleware,
    taskUserMiddleware,
    taskController.handoffTask
);


// =====================================
// Legacy Progress
// Kept temporarily for compatibility
// =====================================

router.patch(
    "/:id/progress",
    authMiddleware,
    taskUserMiddleware,
    taskController.updateTaskProgress
);


// =====================================
// Submit Task
// =====================================

router.patch(
    "/:id/submit",
    authMiddleware,
    taskUserMiddleware,
    taskController.submitTask
);


// =====================================
// Edit Task
// Creator OR Manager checked in service
// =====================================

router.patch(
    "/:id/edit",
    authMiddleware,
    taskUserMiddleware,
    taskController.updateTask
);


// =====================================
// Review Task
// Creator OR Manager checked in service
// =====================================

router.patch(
    "/:id/review",
    authMiddleware,
    taskUserMiddleware,
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
