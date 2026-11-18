const taskService =
    require("../services/taskService");


// =====================================
// Helpers
// =====================================

const getTaskId = (req, res) => {
    const taskId =
        Number(req.params.id);

    if (
        !Number.isSafeInteger(taskId) ||
        taskId <= 0
    ) {
        res.status(400).json({
            message: "Invalid task id",
        });

        return null;
    }

    return taskId;
};


const sendError = (res, error) => {
    const status =
        error.statusCode || 500;

    if (status === 500) {
        console.error(
            "Task error:",
            error
        );
    }

    return res.status(status).json({
        message:
            error.message ||
            "Something went wrong",
    });
};

const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [year, month, day] = value.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth;
};

const getTaskPriority = (value, allowMissing = true) => {
    if (value === undefined && allowMissing) return "medium";
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (["high", "medium", "low"].includes(normalized)) return normalized;
    return null;
};


// =====================================
// Create Task
// Any logged-in user
// =====================================

const createTask = async (
    req,
    res
) => {
    try {
        const {
            title,
            assigned_to,
            due_date,
            priority,
        } = req.body || {};
        const taskPriority = getTaskPriority(priority);
        const normalizedDueDate = due_date === undefined || due_date === "" ? null : due_date;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 255 ||
            !Number.isSafeInteger(Number(assigned_to)) ||
            Number(assigned_to) <= 0 ||
            (normalizedDueDate !== null && !isValidDate(normalizedDueDate)) ||
            taskPriority === null
        ) {
            return res.status(400).json({
                message: "Enter a task title, assigned team member, valid due date, and priority (High, Medium or Low).",
            });
        }

        const task =
            await taskService.createTask({
                title:
                    title.trim(),


                created_by:
                    req.user.id,

                assigned_to:
                    Number(
                        assigned_to
                    ),

                due_date: normalizedDueDate,
                priority: taskPriority,
            });

        return res.status(201).json({
            message:
                "Task created successfully",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Tasks Assigned To Me
// Includes pending handoffs
// =====================================

const getMyTasks = async (
    req,
    res
) => {
    try {
        const tasks =
            await taskService.getMyTasks(
                req.user.id
            );

        return res.status(200).json({
            tasks,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Tasks Created By Me
// =====================================

const getCreatedByMe = async (
    req,
    res
) => {
    try {
        const tasks =
            await taskService
                .getCreatedByMe(
                    req.user.id
                );

        return res.status(200).json({
            tasks,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Employees Available For Assignment
// =====================================

const getTaskAssignees = async (
    req,
    res
) => {
    try {
        const employees =
            await taskService
                .getTaskAssignees();

        return res.status(200).json({
            employees,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Accept Assignment
//
// Handles:
// 1. Original assignment
// 2. Pending handoff
// =====================================

const acceptTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const task =
            await taskService.acceptTask(
                taskId,
                req.user.id
            );

        return res.status(200).json({
            message:
                "Task accepted successfully",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Reject Assignment
//
// Handles:
// 1. Original assignment
// 2. Pending handoff
// =====================================

const rejectTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const {
            reason,
        } = req.body;

        if (
            typeof reason !==
                "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                message:
                    "Rejection reason is required",
            });
        }

        const task =
            await taskService.rejectTask(
                taskId,
                req.user.id,
                reason.trim()
            );

        return res.status(200).json({
            message:
                "Task rejected successfully",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Hand Off Task
// Current accepted owner only
// =====================================

const handoffTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const {
            assigned_to,
            note,
        } = req.body;

        const nextUserId =
            Number(
                assigned_to
            );

        if (
            !Number.isInteger(
                nextUserId
            ) ||
            nextUserId <= 0
        ) {
            return res.status(400).json({
                message:
                "Please select a team member",
            });
        }

        if (
            typeof note !== "string" ||
            !note.trim()
        ) {
            return res.status(400).json({
                message:
                    "A reply is required",
            });
        }

        const task =
            await taskService.handoffTask(
                taskId,
                req.user.id,
                nextUserId,
                note
            );

        return res.status(200).json({
            message:
                "Forward request sent",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Submit Work
// Current accepted assignee only
// =====================================

const submitTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const task =
            await taskService.submitTask(
                taskId,
                req.user.id
            );

        return res.status(200).json({
            message:
                "Task submitted successfully",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// LEGACY Progress Endpoint
//
// Kept temporarily so existing frontend
// does not break.
// We can remove it later.
// =====================================

const updateTaskProgress = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const {
            progress,
        } = req.body;

        if (
            typeof progress !==
                "number" ||
            progress < 0 ||
            progress > 100
        ) {
            return res.status(400).json({
                message:
                    "Progress must be between 0 and 100",
            });
        }

        const task =
            await taskService
                .updateTaskProgress(
                    taskId,
                    req.user.id,
                    progress
                );

        return res.status(200).json({
            message:
                "Progress updated",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Edit Task
// Creator OR Manager
// =====================================

const updateTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const {
            title,
            assigned_to,
            due_date,
            priority,
        } = req.body || {};
        const taskPriority = priority === undefined
            ? undefined
            : getTaskPriority(priority, false);
        const normalizedDueDate = due_date === undefined
            ? undefined
            : due_date === "" || due_date === null
                ? null
                : due_date;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 255 ||
            !Number.isSafeInteger(Number(assigned_to)) ||
            Number(assigned_to) <= 0 ||
            (normalizedDueDate !== undefined && normalizedDueDate !== null && !isValidDate(normalizedDueDate)) ||
            (priority !== undefined && taskPriority === null)
        ) {
            return res.status(400).json({
                message: "Enter a task title, assigned team member, valid due date, and priority (High, Medium or Low).",
            });
        }

        const task =
            await taskService.updateTask(
                taskId,
                {
                    title:
                        title.trim(),


                    assigned_to:
                        Number(
                            assigned_to
                        ),

                    due_date: normalizedDueDate,
                    priority: taskPriority,
                },
                req.user
            );

        return res.status(200).json({
            message:
                "Task updated successfully",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Review Submitted Task
// Creator OR Manager
// =====================================

const reviewTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        const {
            status,
            review_note,
        } = req.body;

        const allowedStatuses = [
            "completed",
            "changes_required",
        ];

        if (
            !allowedStatuses.includes(
                status
            )
        ) {
            return res.status(400).json({
                message:
                    "Review status must be completed or changes_required",
            });
        }

        if (
            review_note !== undefined &&
            review_note !== null &&
            typeof review_note !==
                "string"
        ) {
            return res.status(400).json({
                message:
                    "Review note must be text",
            });
        }

        const task =
            await taskService.reviewTask(
                taskId,
                status,
                review_note?.trim() ||
                    null,
                req.user
            );

        return res.status(200).json({
            message:
                status === "completed"
                    ? "Task completed successfully"
                    : "Changes requested successfully",
            task,
        });
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Manager - Task Details
// =====================================

const getTaskDetails = async (req, res) => {
    try {
        const taskId = getTaskId(req, res);

        if (taskId === null) {
            return;
        }

        const details =
            await taskService.getTaskDetails(taskId);

        return res.status(200).json(details);
    } catch (error) {
        return sendError(res, error);
    }
};


// =====================================
// Manager - All Tasks
// =====================================

const getAllTasks = async (
    req,
    res
) => {
    try {
        const result =
            await taskService
                .getAllTasks(req.query, req.user.id);

        return res.status(200).json(Array.isArray(result)
            ? { tasks: result }
            : result);
    } catch (error) {
        return sendError(
            res,
            error
        );
    }
};


// =====================================
// Delete Task
// Manager only
// =====================================

const deleteTask = async (
    req,
    res
) => {
    try {
        const taskId =
            getTaskId(
                req,
                res
            );

        if (taskId === null) {
            return;
        }

        await taskService.deleteTask(
            taskId,
            req.user
        );

        return res.status(200).json({
            message:
                "Task deleted successfully",
        });
    } catch (error) {
        if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
            return res.status(409).json({
                message: "The task could not be deleted because related records remain. No records were changed.",
            });
        }
        return sendError(
            res,
            error
        );
    }
};


module.exports = {
    getTaskDetails,
    createTask,

    getMyTasks,
    getCreatedByMe,
    getTaskAssignees,

    acceptTask,
    rejectTask,
    handoffTask,

    updateTaskProgress,
    submitTask,

    updateTask,
    reviewTask,

    getAllTasks,
    deleteTask,
};
