const taskService = require("../services/taskService");

// ==============================
// Reusable Task ID Validation
// ==============================

const getTaskId = (req, res) => {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
        res.status(400).json({
            message: "Invalid task id",
        });

        return null;
    }

    return taskId;
};

// ==============================
// Create Task
// Manager Only
// ==============================

const createTask = async (req, res) => {
    try {
        const { title, assigned_to, due_date } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            !Number.isInteger(Number(assigned_to)) ||
            !due_date
        ) {
            return res.status(400).json({
                message:
                    "Title, assigned employee and due date are required",
            });
        }

        const taskData = {
            title: title.trim(),
            created_by: req.user.id,
            assigned_to: Number(assigned_to),
            due_date,
        };

        const task = await taskService.createTask(taskData);

        return res.status(201).json({
            message: "Task created successfully",
            task,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Get Employee Tasks
// ==============================

const getMyTasks = async (req, res) => {
    try {
        const tasks = await taskService.getMyTasks(req.user.id);

        return res.status(200).json({
            tasks,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Update Task Progress
// Employee Only
// ==============================

const updateTaskProgress = async (req, res) => {
    try {
        const taskId = getTaskId(req, res);

        if (taskId === null) {
            return;
        }

        const { progress } = req.body;

        if (
            typeof progress !== "number" ||
            progress < 0 ||
            progress > 100
        ) {
            return res.status(400).json({
                message:
                    "Progress must be a number between 0 and 100",
            });
        }

        const result = await taskService.updateTaskProgress(
            taskId,
            req.user.id,
            progress
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message:
                    "Task not found or not assigned to this employee",
            });
        }

        return res.status(200).json({
            message: "Progress updated successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Submit Task
// Employee Only
// ==============================

const submitTask = async (req, res) => {
    try {
        const taskId = getTaskId(req, res);

        if (taskId === null) {
            return;
        }

        const result = await taskService.submitTask(
            taskId,
            req.user.id
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message:
                    "Task not found or not assigned to this employee",
            });
        }

        return res.status(200).json({
            message: "Task submitted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Review Submitted Task
// Manager Only
// ==============================

const reviewTask = async (req, res) => {
    try {
        const taskId = getTaskId(req, res);

        if (taskId === null) {
            return;
        }

        const { status, review_note } = req.body;

        if (
            typeof status !== "string" ||
            !status.trim()
        ) {
            return res.status(400).json({
                message: "Review status is required",
            });
        }

        if (
            review_note !== undefined &&
            review_note !== null &&
            typeof review_note !== "string"
        ) {
            return res.status(400).json({
                message: "Review note must be text",
            });
        }

        const result = await taskService.reviewTask(
            taskId,
            status.trim(),
            review_note?.trim() || null
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message:
                    "Only a submitted task can be reviewed",
            });
        }

        return res.status(200).json({
            message: "Task reviewed successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Get All Tasks
// Manager Only
// ==============================

const getAllTasks = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks();

        return res.status(200).json({
            tasks,
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Update Task
// Manager Only
// ==============================

const updateTaskByManager = async (req, res) => {
    try {
        const taskId = getTaskId(req, res);

        if (taskId === null) {
            return;
        }

        const { title, assigned_to, due_date } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            !Number.isInteger(Number(assigned_to)) ||
            !due_date
        ) {
            return res.status(400).json({
                message:
                    "Title, assigned employee and due date are required",
            });
        }

        const taskData = {
            title: title.trim(),
            assigned_to: Number(assigned_to),
            due_date,
        };

        const result =
            await taskService.updateTaskByManager(
                taskId,
                taskData
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        return res.status(200).json({
            message: "Task updated successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

// ==============================
// Delete Task
// Manager Only
// ==============================

const deleteTask = async (req, res) => {
    try {
        const taskId = getTaskId(req, res);

        if (taskId === null) {
            return;
        }

        const result = await taskService.deleteTask(taskId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        return res.status(200).json({
            message: "Task deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    createTask,
    getMyTasks,
    updateTaskProgress,
    submitTask,
    reviewTask,
    getAllTasks,
    updateTaskByManager,
    deleteTask,
};