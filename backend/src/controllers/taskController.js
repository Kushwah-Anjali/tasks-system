const taskService = require("../services/taskService");
const createTask = async (req, res) => {
    try {
        const taskData = {
            title: req.body.title,
            created_by: req.user.id,
            assigned_to: req.body.assigned_to,
            due_date: req.body.due_date,
        };

        const task = await taskService.createTask(taskData);

        res.status(201).json({
            message: "Task created successfully",
            task,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const getMyTasks = async (req, res) => {
    try {
        const tasks = await taskService.getMyTasks(req.user.id);

        res.status(200).json({
            tasks,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const updateTaskProgress = async (req, res) => {
    try {
        const { progress } = req.body;

        if (
            typeof progress !== "number" ||
            progress < 0 ||
            progress > 100
        ) {
            return res.status(400).json({
                message: "Progress must be between 0 and 100",
            });
        }

        const result = await taskService.updateTaskProgress(
            req.params.id,
            req.user.id,
            progress
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Progress updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const submitTask = async (req, res) => {
    try {
        const result = await taskService.submitTask(
            req.params.id,
            req.user.id
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task submitted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const reviewTask = async (req, res) => {
    try {
        const { status, review_note } = req.body;

        const result = await taskService.reviewTask(
            req.params.id,
            status,
            review_note
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "Task cannot be reviewed",
            });
        }

        res.status(200).json({
            message: "Task reviewed successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const getAllTasks = async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks();
        res.status(200).json({
            tasks,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const updateTaskByManager = async (req, res) => {
    try {
        const { title, assigned_to, due_date } = req.body;

        const result = await taskService.updateTaskByManager(
            req.params.id,
            {
                title,
                assigned_to,
                due_date,
            }
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};
const deleteTask = async (req, res) => {
    try {
        const result = await taskService.deleteTask(req.params.id);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
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