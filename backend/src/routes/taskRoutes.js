const express = require("express");

const taskController = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");
const managerMiddleware = require("../middleware/managerMiddleware");

const router = express.Router();

router.post("/", authMiddleware, taskController.createTask);
router.get("/my", authMiddleware, taskController.getMyTasks);

router.patch("/:id/progress", authMiddleware, taskController.updateTaskProgress);
router.patch("/:id/submit", authMiddleware, taskController.submitTask);
router.get(
    "/",
    authMiddleware,
    managerMiddleware,
    taskController.getAllTasks
);
router.patch(
    "/:id/edit",
    authMiddleware,
    managerMiddleware,
    taskController.updateTaskByManager
);
router.delete(
    "/:id",
    authMiddleware,
    managerMiddleware,
    taskController.deleteTask
);
module.exports = router;