const express = require("express");

const taskController = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");
const managerMiddleware = require("../middleware/managerMiddleware");

const router = express.Router();

// ==============================
// Manager Routes
// ==============================

// Create a task
router.post(
    "/",
    authMiddleware,
    managerMiddleware,
    taskController.createTask
);

// View all tasks
router.get(
    "/",
    authMiddleware,
    managerMiddleware,
    taskController.getAllTasks
);

// Edit a task
router.patch(
    "/:id/edit",
    authMiddleware,
    managerMiddleware,
    taskController.updateTaskByManager
);

// Review a submitted task
router.patch(
    "/:id/review",
    authMiddleware,
    managerMiddleware,
    taskController.reviewTask
);

// Delete a task
router.delete(
    "/:id",
    authMiddleware,
    managerMiddleware,
    taskController.deleteTask
);

// ==============================
// Employee Routes
// ==============================

// View tasks assigned to the logged-in employee
router.get(
    "/my",
    authMiddleware,
    taskController.getMyTasks
);

// Update task progress
router.patch(
    "/:id/progress",
    authMiddleware,
    taskController.updateTaskProgress
);

// Submit task for manager review
router.patch(
    "/:id/submit",
    authMiddleware,
    taskController.submitTask
);

module.exports = router;