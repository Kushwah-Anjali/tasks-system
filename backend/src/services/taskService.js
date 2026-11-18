const db =
    require("../config/db");


// =====================================
// Error Helper
// =====================================

const createServiceError = (
    message,
    statusCode = 400
) => {
    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;
};

const recordTaskEvent = async (
    connection,
    {
        taskId,
        eventType,
        actorUserId,
        recipientUserId = null,
        previousAssigneeUserId = null,
        sourceHandoffId = null,
        message = null,
    }
) => {
    await connection.query(
        `
        INSERT INTO task_events
        (
            task_id,
            event_type,
            actor_user_id,
            recipient_user_id,
            previous_assignee_user_id,
            source_handoff_id,
            message
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            taskId,
            eventType,
            actorUserId,
            recipientUserId,
            previousAssigneeUserId,
            sourceHandoffId,
            message,
        ]
    );
};

// Keep the existing database column internal to task operations.
const toTaskResponse = (task) => {
    const { description, ...taskResponse } = task;
    const rawPriority = typeof task.priority === "string" ? task.priority.trim().toLowerCase() : "";
    const priority = ["high", "medium", "low"].includes(rawPriority) ? rawPriority : "medium";
    return { ...taskResponse, priority };
};


// =====================================
// Get Basic Task
// =====================================

const getTaskById = async (
    taskId,
    connection = db.promise()
) => {
    const [tasks] =
        await connection.query(
            `
            SELECT *
            FROM tasks
            WHERE id = ?
            LIMIT 1
            `,
            [taskId]
        );

    return tasks[0] || null;
};


// =====================================
// Validate Active Team Member Assignee
// =====================================

const validateAssignee = async (
    userId,
    connection
) => {
    const [teamMembers] =
        await connection.query(
            `
            SELECT
                users.id,
                users.full_name,
                users.role

            FROM users

            WHERE users.id = ?
              AND users.role IN ('employee', 'manager')
              AND users.is_active = 1
              AND users.status = 'approved'

            LIMIT 1
            `,
            [userId]
        );

    if (
        teamMembers.length === 0
    ) {
        throw createServiceError(
            "Selected team member is not available for task assignment",
            400
        );
    }

    return teamMembers[0];
};


// =====================================
// Full Task
// =====================================

const getFullTask = async (
    taskId,
    connection = db.promise()
) => {
    const [tasks] =
        await connection.query(
            `
            SELECT
                tasks.*,

                creator.full_name
                    AS created_by_name,

                assignee.full_name
                    AS assigned_to_name,

                pending_user.full_name
                    AS pending_assignee_name

            FROM tasks

            INNER JOIN users AS creator
                ON creator.id =
                   tasks.created_by

            INNER JOIN users AS assignee
                ON assignee.id =
                   tasks.assigned_to

            LEFT JOIN users AS pending_user
                ON pending_user.id =
                   tasks.pending_assignee_id

            WHERE tasks.id = ?

            LIMIT 1
            `,
            [taskId]
        );

    return tasks[0]
        ? toTaskResponse(tasks[0])
        : null;
};


// =====================================
// Task Details With Complete Timeline
// =====================================

const getTaskDetails = async (taskId) => {
    const task = await getFullTask(taskId);

    if (!task) {
        throw createServiceError("Task not found", 404);
    }

    const [handoffs] = await db.promise().query(
        `
        SELECT
            handoffs.id,
            handoffs.task_id,
            handoffs.from_user_id,
            from_user.full_name AS from_user_name,
            handoffs.to_user_id,
            to_user.full_name AS to_user_name,
            handoffs.note,
            handoffs.status,
            handoffs.rejection_reason,
            handoffs.created_at,
            handoffs.responded_at
        FROM task_handoffs AS handoffs
        LEFT JOIN users AS from_user
            ON from_user.id = handoffs.from_user_id
        LEFT JOIN users AS to_user
            ON to_user.id = handoffs.to_user_id
        WHERE handoffs.task_id = ?
        ORDER BY handoffs.created_at ASC, handoffs.id ASC
        `,
        [taskId]
    );

    const [taskEvents] = await db.promise().query(
        `
        SELECT
            events.id,
            events.task_id,
            events.event_type,
            events.actor_user_id,
            actor.full_name AS actor_name,
            events.recipient_user_id,
            recipient.full_name AS recipient_name,
            events.previous_assignee_user_id,
            previous_assignee.full_name AS previous_assignee_name,
            events.source_handoff_id,
            events.message,
            events.created_at
        FROM task_events AS events
        LEFT JOIN users AS actor
            ON actor.id = events.actor_user_id
        LEFT JOIN users AS recipient
            ON recipient.id = events.recipient_user_id
        LEFT JOIN users AS previous_assignee
            ON previous_assignee.id = events.previous_assignee_user_id
        WHERE events.task_id = ?
        ORDER BY events.created_at ASC, events.id ASC
        `,
        [taskId]
    );

    const timeline = taskEvents.map((event) => ({
        id: `event-${event.id}`,
        task_id: event.task_id,
        event_type: event.event_type,
        actor_user_id: event.actor_user_id,
        actor_name: event.actor_name,
        recipient_user_id: event.recipient_user_id,
        recipient_name: event.recipient_name,
        previous_assignee_user_id: event.previous_assignee_user_id,
        previous_assignee_name: event.previous_assignee_name,
        message: event.message,
        created_at: event.created_at,
    }));

    for (const forward of handoffs) {
        timeline.push({
            id: `forward-${forward.id}-requested`,
            task_id: forward.task_id,
            event_type: "forward_requested",
            actor_user_id: forward.from_user_id,
            actor_name: forward.from_user_name,
            recipient_user_id: forward.to_user_id,
            recipient_name: forward.to_user_name,
            previous_assignee_user_id: null,
            previous_assignee_name: null,
            message: forward.note,
            created_at: forward.created_at,
        });

        if (!forward.responded_at) continue;
        const wasCancelledByReassignment = forward.rejection_reason === "Assignment changed before response";
        const hasRecordedCancellation = taskEvents.some((event) =>
            event.source_handoff_id === forward.id && event.event_type === "forward_cancelled"
        );
        if (wasCancelledByReassignment && hasRecordedCancellation) continue;

        const eventType = wasCancelledByReassignment
            ? "forward_cancelled"
            : forward.status === "accepted"
                ? "forward_accepted"
                : "forward_rejected";
        timeline.push({
            id: `forward-${forward.id}-response`,
            task_id: forward.task_id,
            event_type: eventType,
            actor_user_id: wasCancelledByReassignment ? null : forward.to_user_id,
            actor_name: wasCancelledByReassignment ? null : forward.to_user_name,
            recipient_user_id: wasCancelledByReassignment ? null : forward.from_user_id,
            recipient_name: wasCancelledByReassignment ? null : forward.from_user_name,
            previous_assignee_user_id: null,
            previous_assignee_name: null,
            message: wasCancelledByReassignment
                ? "Forward request closed after the task was reassigned."
                : forward.rejection_reason,
            created_at: forward.responded_at,
        });
    }

    const eventOrder = { forward_requested: 0, forward_accepted: 1, forward_rejected: 1, forward_cancelled: 1 };
    timeline.sort((left, right) => {
        const byDate = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        if (byDate !== 0) return byDate;
        return (eventOrder[left.event_type] ?? 0.5) - (eventOrder[right.event_type] ?? 0.5);
    });

    return {
        task: {
            id: task.id,
            title: task.title,
            created_by: task.created_by,
            created_by_name: task.created_by_name,
            assigned_to: task.assigned_to,
            assigned_to_name: task.assigned_to_name,
            pending_assignee_id: task.pending_assignee_id,
            pending_assignee_name: task.pending_assignee_name,
            assigned_date: task.assigned_date,
            due_date: task.due_date,
            priority: task.priority,
            status: task.status,
            assignment_status: task.assignment_status,
            rejection_reason: task.rejection_reason,
            responded_at: task.responded_at,
            review_note: task.review_note,
            completed_at: task.completed_at,
        },
        handoffs,
        timeline,
    };
};

// =====================================
// Notification Helper
// =====================================

const createTaskNotification =
    async (
        connection,
        {
            userId,
            type,
            title,
            message,
            taskId,
        }
    ) => {
        const [recipients] = await connection.query(
            "SELECT role FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        const link = recipients[0]?.role === "manager"
            ? `/tasks/${taskId}`
            : "/employee-tasks";

        await connection.query(
            `
            INSERT INTO notifications
            (
                user_id,
                type,
                title,
                message,
                reference_id,
                link
            )

            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                type,
                title,
                message,
                taskId,
                link,
            ]
        );
    };


// =====================================
// User Name Helper
// =====================================

const getUserName = async (
    userId,
    connection
) => {
    const [users] =
        await connection.query(
            `
            SELECT full_name
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [userId]
        );

    return (
        users[0]?.full_name ||
        "Someone"
    );
};


// =====================================
// Create Task
// =====================================

const createTask = async (
    taskData
) => {
    const {
        title,
        created_by,
        assigned_to,
        due_date,
        priority = "medium",
    } = taskData;

    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        await validateAssignee(
            assigned_to,
            connection
        );

        const [result] =
            await connection.query(
                `
                INSERT INTO tasks
                (
                    title,
                    created_by,
                    assigned_to,
                    due_date,
                    priority,
                    assigned_date,
                    status,
                    progress,
                    assignment_status,
                    rejection_reason,
                    responded_at,
                    pending_assignee_id
                )

                VALUES (
                    ?, ?, ?, ?, ?,
                    CURDATE(),
                    'assigned',
                    0,
                    'pending',
                    NULL,
                    NULL,
                    NULL
                )
                `,
                [
                    title,
                    created_by,
                    assigned_to,
                    due_date,
                    priority,
                ]
            );

        const taskId =
            result.insertId;

        await recordTaskEvent(connection, {
            taskId,
            eventType: "assigned",
            actorUserId: created_by,
            recipientUserId: assigned_to,
        });

        if (
            assigned_to !==
            created_by
        ) {
            const creatorName =
                await getUserName(
                    created_by,
                    connection
                );

            await createTaskNotification(
                connection,
                {
                    userId:
                        assigned_to,

                    type:
                        "task_assigned",

                    title:
                        "New task assigned",

                    message:
                        `${creatorName} assigned you: ${title}`,

                    taskId,
                }
            );
        }

        const task =
            await getFullTask(
                taskId,
                connection
            );

        await connection.commit();

        return task;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Assigned To Me
//
// Includes:
// - current owner
// - employee receiving pending handoff
// =====================================

const getMyTasks = async (
    userId
) => {
    const [tasks] =
        await db.promise().query(
            `
            SELECT
                tasks.*,

                creator.full_name
                    AS created_by_name,

                assignee.full_name
                    AS assigned_to_name,

                pending_user.full_name
                    AS pending_assignee_name

            FROM tasks

            INNER JOIN users AS creator
                ON creator.id =
                   tasks.created_by

            INNER JOIN users AS assignee
                ON assignee.id =
                   tasks.assigned_to

            LEFT JOIN users AS pending_user
                ON pending_user.id =
                   tasks.pending_assignee_id

            WHERE
                tasks.assigned_to = ?
                OR
                tasks.pending_assignee_id = ?

            ORDER BY
                tasks.due_date ASC,
                tasks.id DESC
            `,
            [
                userId,
                userId,
            ]
        );

    return tasks.map(toTaskResponse);
};


// =====================================
// Created By Me
// =====================================

const getCreatedByMe = async (
    userId
) => {
    const [tasks] =
        await db.promise().query(
            `
            SELECT
                tasks.*,

                creator.full_name
                    AS created_by_name,

                assignee.full_name
                    AS assigned_to_name,

                pending_user.full_name
                    AS pending_assignee_name

            FROM tasks

            INNER JOIN users AS creator
                ON creator.id =
                   tasks.created_by

            INNER JOIN users AS assignee
                ON assignee.id =
                   tasks.assigned_to

            LEFT JOIN users AS pending_user
                ON pending_user.id =
                   tasks.pending_assignee_id

            WHERE
                tasks.created_by = ?

            ORDER BY
                tasks.due_date ASC,
                tasks.id DESC
            `,
            [userId]
        );

    return tasks.map(toTaskResponse);
};


// =====================================
// Assignable Team Members
// =====================================

const getTaskAssignees =
    async () => {
        const [teamMembers] =
            await db.promise().query(
                `
                SELECT
                    users.id,
                    users.full_name,
                    users.role

                FROM users

                WHERE
                    users.role IN ('employee', 'manager')
                    AND users.is_active = 1
                    AND users.status = 'approved'

                ORDER BY
                    users.full_name ASC,
                    users.id ASC
                `
            );

        return teamMembers;
    };


// =====================================
// Accept Assignment
//
// Case 1: normal assignment
// Case 2: pending handoff
// =====================================

const acceptTask = async (
    taskId,
    userId
) => {
    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const task = await getTaskById(taskId, connection);

        if (!task) {
            throw createServiceError(
                "Task not found",
                404
            );
        }


        // =================================
        // Pending Handoff Acceptance
        // =================================

        if (
            task.pending_assignee_id ===
            userId
        ) {
            const [handoffs] =
                await connection.query(
                    `
                    SELECT *
                    FROM task_handoffs

                    WHERE task_id = ?
                      AND to_user_id = ?
                      AND status = 'pending'

                    ORDER BY id DESC

                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        taskId,
                        userId,
                    ]
                );

            if (
                handoffs.length === 0
            ) {
                throw createServiceError(
                    "Pending forward request not found",
                    404
                );
            }

            const handoff =
                handoffs[0];

            await connection.query(
                `
                UPDATE task_handoffs

                SET
                    status = 'accepted',
                    responded_at = NOW()

                WHERE id = ?
                `,
                [handoff.id]
            );

            await connection.query(
                `
                UPDATE tasks

                SET
                    assigned_to = ?,
                    pending_assignee_id = NULL,

                    assignment_status =
                        'accepted',

                    rejection_reason = NULL,
                    responded_at = NOW(),

                    assigned_date =
                        CURDATE()

                WHERE id = ?
                `,
                [
                    userId,
                    taskId,
                ]
            );

            if (task.created_by !== userId) {
                const acceptingUserName = await getUserName(userId, connection);
                await createTaskNotification(connection, {
                    userId: task.created_by,
                    type: "task_accepted",
                    title: "Task accepted",
                    message: `${acceptingUserName} accepted "${task.title}"`,
                    taskId,
                });
            }

            const updatedTask =
                await getFullTask(
                    taskId,
                    connection
                );

            await connection.commit();

            return updatedTask;
        }


        // =================================
        // Original Assignment Acceptance
        // =================================

        if (
            task.assigned_to !==
            userId
        ) {
            throw createServiceError(
                "You cannot accept this task",
                403
            );
        }

        if (
            task.assignment_status !==
            "pending"
        ) {
            throw createServiceError(
                "This task has already been responded to",
                400
            );
        }

        await connection.query(
            `
            UPDATE tasks

            SET
                assignment_status =
                    'accepted',

                rejection_reason = NULL,
                responded_at = NOW()

            WHERE id = ?
            `,
            [taskId]
        );

        await recordTaskEvent(connection, {
            taskId,
            eventType: "accepted",
            actorUserId: userId,
        });

        if (task.created_by !== userId) {
            const acceptingUserName = await getUserName(userId, connection);
            await createTaskNotification(connection, {
                userId: task.created_by,
                type: "task_accepted",
                title: "Task accepted",
                message: `${acceptingUserName} accepted "${task.title}"`,
                taskId,
            });
        }

        const updatedTask =
            await getFullTask(
                taskId,
                connection
            );

        await connection.commit();

        return updatedTask;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Reject Assignment
//
// Case 1: normal assignment
// Case 2: pending handoff
// =====================================

const rejectTask = async (
    taskId,
    userId,
    reason
) => {
    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const task =
            await getTaskById(
                taskId,
                connection
            );

        if (!task) {
            throw createServiceError(
                "Task not found",
                404
            );
        }


        // =================================
        // Reject Pending Handoff
        // =================================

        if (
            task.pending_assignee_id ===
            userId
        ) {
            const [handoffs] =
                await connection.query(
                    `
                    SELECT *
                    FROM task_handoffs

                    WHERE task_id = ?
                      AND to_user_id = ?
                      AND status = 'pending'

                    ORDER BY id DESC

                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        taskId,
                        userId,
                    ]
                );

            if (
                handoffs.length === 0
            ) {
                throw createServiceError(
                    "Pending forward request not found",
                    404
                );
            }

            const handoff =
                handoffs[0];

            await connection.query(
                `
                UPDATE task_handoffs

                SET
                    status = 'rejected',
                    rejection_reason = ?,
                    responded_at = NOW()

                WHERE id = ?
                `,
                [
                    reason,
                    handoff.id,
                ]
            );

            // IMPORTANT:
            // Current owner remains unchanged.
            await connection.query(
                `
                UPDATE tasks

                SET pending_assignee_id =
                    NULL

                WHERE id = ?
                `,
                [taskId]
            );

            if (
                handoff.from_user_id !==
                userId
            ) {
                const rejectingUserName =
                    await getUserName(
                        userId,
                        connection
                    );

                await createTaskNotification(
                    connection,
                    {
                        userId:
                            handoff
                                .from_user_id,

                        type:
                            "task_handoff_rejected",

                        title:
                            "Forward request declined",

                        message:
                            `${rejectingUserName} declined forwarding "${task.title}"`,

                        taskId,
                    }
                );
            }

            const updatedTask =
                await getFullTask(
                    taskId,
                    connection
                );

            await connection.commit();

            return updatedTask;
        }


        // =================================
        // Reject Original Assignment
        // =================================

        if (
            task.assigned_to !==
            userId
        ) {
            throw createServiceError(
                "You cannot reject this task",
                403
            );
        }

        if (
            task.assignment_status !==
            "pending"
        ) {
            throw createServiceError(
                "This task has already been responded to",
                400
            );
        }

        await connection.query(
            `
            UPDATE tasks

            SET
                assignment_status =
                    'rejected',

                rejection_reason = ?,
                responded_at = NOW()

            WHERE id = ?
            `,
            [
                reason,
                taskId,
            ]
        );

        await recordTaskEvent(connection, {
            taskId,
            eventType: "assignment_rejected",
            actorUserId: userId,
            message: reason,
        });

        if (
            task.created_by !==
            userId
        ) {
            const employeeName =
                await getUserName(
                    userId,
                    connection
                );

            await createTaskNotification(
                connection,
                {
                    userId:
                        task.created_by,

                    type:
                        "task_rejected",

                    title:
                        "Task rejected",

                    message:
                        `${employeeName} rejected "${task.title}"`,

                    taskId,
                }
            );
        }

        const updatedTask =
            await getFullTask(
                taskId,
                connection
            );

        await connection.commit();

        return updatedTask;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Hand Off Task
// =====================================

const handoffTask = async (
    taskId,
    currentUserId,
    nextUserId,
    note
) => {
    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const task =
            await getTaskById(
                taskId,
                connection
            );

        if (!task) {
            throw createServiceError(
                "Task not found",
                404
            );
        }

        // Only current owner
        if (
            task.assigned_to !==
            currentUserId
        ) {
            throw createServiceError(
                "Only the current assignee can forward this task",
                403
            );
        }

        // They must accept first
        if (
            task.assignment_status !==
            "accepted"
        ) {
            throw createServiceError(
                "Accept the task before forwarding it",
                400
            );
        }

        if (
            task.status ===
            "submitted" ||
            task.status ===
            "completed"
        ) {
            throw createServiceError(
                "This task cannot be forwarded now",
                400
            );
        }

        if (
            currentUserId ===
            nextUserId
        ) {
            throw createServiceError(
                "You cannot forward a task to yourself",
                400
            );
        }

        if (
            task.pending_assignee_id
        ) {
            throw createServiceError(
                "This task already has a pending forward request",
                400
            );
        }

        const nextEmployee =
            await validateAssignee(
                nextUserId,
                connection
            );

        await connection.query(
            `
            INSERT INTO task_handoffs
            (
                task_id,
                from_user_id,
                to_user_id,
                note,
                status
            )

            VALUES (
                ?, ?, ?, ?,
                'pending'
            )
            `,
            [
                taskId,
                currentUserId,
                nextUserId,
                note,
            ]
        );

        await connection.query(
            `
            UPDATE tasks

            SET
                pending_assignee_id = ?

            WHERE id = ?
            `,
            [
                nextUserId,
                taskId,
            ]
        );

        const currentUserName =
            await getUserName(
                currentUserId,
                connection
            );

        await createTaskNotification(
            connection,
            {
                userId:
                    nextUserId,

                type:
                    "task_handoff",

                title:
                    "Task forwarding request",

                message:
                    `${currentUserName} wants to forward "${task.title}" to you`,

                taskId,
            }
        );

        const updatedTask =
            await getFullTask(
                taskId,
                connection
            );

        updatedTask.pending_assignee_name =
            nextEmployee.full_name;

        await connection.commit();

        return updatedTask;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Submit Task
// Current Accepted Assignee Only
// =====================================

const submitTask = async (
    taskId,
    userId
) => {
    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const task =
            await getTaskById(
                taskId,
                connection
            );

        if (!task) {
            throw createServiceError(
                "Task not found",
                404
            );
        }

        if (
            task.assigned_to !==
            userId
        ) {
            throw createServiceError(
                "You cannot submit this task",
                403
            );
        }

        if (
            task.assignment_status !==
            "accepted"
        ) {
            throw createServiceError(
                "Accept the task before submitting it",
                400
            );
        }

        if (
            task.pending_assignee_id
        ) {
            throw createServiceError(
                "Resolve the pending forward request before submitting the task",
                400
            );
        }

        if (
            task.status ===
            "completed"
        ) {
            throw createServiceError(
                "Task is already completed",
                400
            );
        }

        if (
            task.status ===
            "submitted"
        ) {
            throw createServiceError(
                "Task has already been submitted",
                400
            );
        }

        await connection.query(
            `
            UPDATE tasks

            SET
                status = 'submitted',
                progress = 100

            WHERE id = ?
            `,
            [taskId]
        );

        await recordTaskEvent(connection, {
            taskId,
            eventType: "submitted",
            actorUserId: userId,
        });

        if (
            task.created_by !==
            userId
        ) {
            const employeeName =
                await getUserName(
                    userId,
                    connection
                );

            await createTaskNotification(
                connection,
                {
                    userId:
                        task.created_by,

                    type:
                        "task_submitted",

                    title:
                        "Task submitted",

                    message:
                        `${employeeName} submitted: ${task.title}`,

                    taskId,
                }
            );
        }

        const updatedTask =
            await getFullTask(
                taskId,
                connection
            );

        await connection.commit();

        return updatedTask;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Legacy Progress
//
// Kept temporarily for compatibility.
// UI does not need to show percentage.
// =====================================

const updateTaskProgress =
    async (
        taskId,
        userId,
        progress
    ) => {
        const connection =
            await db
                .promise()
                .getConnection();

        try {
            await connection
                .beginTransaction();

            const task =
                await getTaskById(
                    taskId,
                    connection
                );

            if (!task) {
                throw createServiceError(
                    "Task not found",
                    404
                );
            }

            if (
                task.assigned_to !==
                userId
            ) {
                throw createServiceError(
                    "You cannot update this task",
                    403
                );
            }

            if (
                task.assignment_status !==
                "accepted"
            ) {
                throw createServiceError(
                    "Accept the task first",
                    400
                );
            }

            if (
                task.status ===
                "submitted" ||
                task.status ===
                "completed"
            ) {
                throw createServiceError(
                    "This task cannot be changed",
                    400
                );
            }

            const nextStatus =
                progress === 0
                    ? "assigned"
                    : "in_progress";

            await connection.query(
                `
                UPDATE tasks

                SET
                    progress = ?,
                    status = ?

                WHERE id = ?
                `,
                [
                    progress,
                    nextStatus,
                    taskId,
                ]
            );

            await recordTaskEvent(connection, {
                taskId,
                eventType: "progress_updated",
                actorUserId: userId,
                message: `Progress updated to ${progress}%.`,
            });

            const updatedTask =
                await getFullTask(
                    taskId,
                    connection
                );

            await connection.commit();

            return updatedTask;

        } catch (error) {
            await connection.rollback();

            throw error;

        } finally {
            connection.release();
        }
    };


// =====================================
// Edit Task
// Creator OR Manager
// =====================================

const updateTask = async (
    taskId,
    taskData,
    currentUser
) => {
    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const task =
            await getTaskById(
                taskId,
                connection
            );

        if (!task) {
            throw createServiceError(
                "Task not found",
                404
            );
        }

        const isCreator =
            task.created_by ===
            currentUser.id;

        const isManager =
            currentUser.role ===
            "manager";

        if (
            !isCreator &&
            !isManager
        ) {
            throw createServiceError(
                "You cannot edit this task",
                403
            );
        }

        if (
            task.status ===
            "completed"
        ) {
            throw createServiceError(
                "Completed task cannot be edited",
                400
            );
        }

        const {
            title,
            assigned_to,
            due_date,
            priority = task.priority || "medium",
        } = taskData;
        const effectiveDueDate = due_date === undefined
            ? task.due_date
            : due_date;

        await validateAssignee(
            assigned_to,
            connection
        );

        const assigneeChanged =
            task.assigned_to !==
            assigned_to;

        if (assigneeChanged) {

            const [pendingForwards] = await connection.query(
                `
                SELECT id
                FROM task_handoffs
                WHERE task_id = ? AND status = 'pending'
                FOR UPDATE
                `,
                [taskId]
            );

            // Close any pending handoff first.
            await connection.query(
                `
                UPDATE task_handoffs

                SET
                    status = 'rejected',
                    rejection_reason =
                        'Assignment changed before response',
                    responded_at = NOW()

                WHERE task_id = ?
                  AND status = 'pending'
                `,
                [taskId]
            );

            await connection.query(
                `
                UPDATE tasks

                SET
                    title = ?,
                    assigned_to = ?,
                    pending_assignee_id = NULL,
                    due_date = ?,
                    priority = ?,

                    assigned_date =
                        CURDATE(),

                    status =
                        'assigned',

                    progress = 0,

                    assignment_status =
                        'pending',

                    rejection_reason = NULL,
                    responded_at = NULL,
                    completed_at = NULL

                WHERE id = ?
                `,
                [
                    title,
                    assigned_to,
                    effectiveDueDate,
                    priority,
                    taskId,
                ]
            );

            for (const forward of pendingForwards) {
                await recordTaskEvent(connection, {
                    taskId,
                    eventType: "forward_cancelled",
                    actorUserId: currentUser.id,
                    recipientUserId: assigned_to,
                    previousAssigneeUserId: task.assigned_to,
                    sourceHandoffId: forward.id,
                    message: "Forward request cancelled because the task was reassigned.",
                });
            }

            await recordTaskEvent(connection, {
                taskId,
                eventType: "reassigned",
                actorUserId: currentUser.id,
                recipientUserId: assigned_to,
                previousAssigneeUserId: task.assigned_to,
            });

            if (
                assigned_to !==
                currentUser.id
            ) {
                const actorName =
                    await getUserName(
                        currentUser.id,
                        connection
                    );

                await createTaskNotification(
                    connection,
                    {
                        userId:
                            assigned_to,

                        type:
                            "task_assigned",

                        title:
                            "Task assigned to you",

                        message:
                            `${actorName} assigned you: ${title}`,

                        taskId,
                    }
                );
            }

        } else {

            await connection.query(
                `
                UPDATE tasks

                SET
                    title = ?,
                    due_date = ?,
                    priority = ?

                WHERE id = ?
                `,
                [
                    title,
                    effectiveDueDate,
                    priority,
                    taskId,
                ]
            );
        }

        const updatedTask =
            await getFullTask(
                taskId,
                connection
            );

        await connection.commit();

        return updatedTask;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Review
// Creator OR Manager
// =====================================

const reviewTask = async (
    taskId,
    status,
    reviewNote,
    currentUser
) => {
    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const task =
            await getTaskById(
                taskId,
                connection
            );

        if (!task) {
            throw createServiceError(
                "Task not found",
                404
            );
        }

        const isCreator =
            task.created_by ===
            currentUser.id;

        const isManager =
            currentUser.role ===
            "manager";

        if (
            !isCreator &&
            !isManager
        ) {
            throw createServiceError(
                "You cannot review this task",
                403
            );
        }

        if (
            task.status !==
            "submitted"
        ) {
            throw createServiceError(
                "Only submitted tasks can be reviewed",
                400
            );
        }

        if (
            status ===
            "completed"
        ) {
            await connection.query(
                `
                UPDATE tasks

                SET
                    status = 'completed',
                    progress = 100,
                    review_note = ?,
                    completed_at = NOW()

                WHERE id = ?
                `,
                [
                    reviewNote,
                    taskId,
                ]
            );
        } else {
            await connection.query(
                `
                UPDATE tasks

                SET
                    status =
                        'changes_required',

                    review_note = ?,
                    completed_at = NULL

                WHERE id = ?
                `,
                [
                    reviewNote,
                    taskId,
                ]
            );
        }

        await recordTaskEvent(connection, {
            taskId,
            eventType: status === "completed" ? "completed" : "changes_requested",
            actorUserId: currentUser.id,
            recipientUserId: task.assigned_to,
            message: reviewNote,
        });

        if (
            task.assigned_to !==
            currentUser.id
        ) {
            await createTaskNotification(
                connection,
                {
                    userId:
                        task.assigned_to,

                    type:
                        status ===
                            "completed"
                            ? "task_completed"
                            : "task_changes_required",

                    title:
                        status ===
                            "completed"
                            ? "Task completed"
                            : "Changes requested",

                    message:
                        status ===
                            "completed"
                            ? `Your task "${task.title}" has been completed`
                            : `Changes were requested for "${task.title}"`,

                    taskId,
                }
            );
        }

        const updatedTask =
            await getFullTask(
                taskId,
                connection
            );

        await connection.commit();

        return updatedTask;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};


// =====================================
// Manager - All Tasks
// =====================================

const getAllTasks = async (query = {}, currentUserId = null) => {
    const joins = `
        FROM tasks
        INNER JOIN users AS creator
            ON creator.id = tasks.created_by
        INNER JOIN users AS assignee
            ON assignee.id = tasks.assigned_to
        LEFT JOIN users AS pending_user
            ON pending_user.id = tasks.pending_assignee_id
    `;
    const select = `
        SELECT
            tasks.*,
            creator.full_name AS created_by_name,
            assignee.full_name AS assigned_to_name,
            pending_user.full_name AS pending_assignee_name
        ${joins}
    `;

    // Preserve the original unpaginated response for existing API consumers.
    if (!query || Object.keys(query).length === 0) {
        const [tasks] = await db.promise().query(
            `${select} ORDER BY tasks.assigned_date DESC, tasks.id DESC`
        );
        return tasks.map(toTaskResponse);
    }

    const allowedQueryKeys = new Set([
        "page", "pageSize", "view", "scope", "priority", "assignedTo", "search", "sortBy", "sortDirection",
    ]);
    if (Object.keys(query).some((key) => !allowedQueryKeys.has(key))) {
        throw createServiceError("Unsupported task list filter.", 400);
    }

    const readString = (key, fallback) => {
        if (!(key in query)) return fallback;
        if (typeof query[key] !== "string") {
            throw createServiceError(`Invalid ${key}.`, 400);
        }
        return query[key];
    };
    const parsePositiveInteger = (value, field, max = Number.MAX_SAFE_INTEGER) => {
        if (!/^\d+$/.test(value)) {
            throw createServiceError(`Invalid ${field}.`, 400);
        }
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
            throw createServiceError(`Invalid ${field}.`, 400);
        }
        return parsed;
    };

    const page = parsePositiveInteger(readString("page", "1"), "page", 1_000_000);
    const pageSizeValue = readString("pageSize", "10");
    if (!["10", "25", "50"].includes(pageSizeValue)) {
        throw createServiceError("Page size must be 10, 25 or 50.", 400);
    }
    const pageSize = Number(pageSizeValue);
    const view = readString("view", "active");
    const scope = readString("scope", "all");
    const priority = readString("priority", "all").trim().toLowerCase();
    const assignedToValue = readString("assignedTo", "");
    const search = readString("search", "").trim();
    const sortBy = readString("sortBy", "due_date");
    const sortDirection = readString("sortDirection", "asc");

    if (!["active", "completed"].includes(view)) {
        throw createServiceError("Invalid task view.", 400);
    }
    if (!["all", "assigned", "created"].includes(scope)) {
        throw createServiceError("Invalid task scope.", 400);
    }
    if (scope !== "all" && (!Number.isSafeInteger(currentUserId) || currentUserId <= 0)) {
        throw createServiceError("A signed-in manager is required for personal task views.", 403);
    }
    if (!["all", "high", "medium", "low"].includes(priority)) {
        throw createServiceError("Priority must be all, high, medium or low.", 400);
    }
    if (search.length > 255) {
        throw createServiceError("Search text must be 255 characters or fewer.", 400);
    }
    const assignedTo = assignedToValue
        ? parsePositiveInteger(assignedToValue, "assignedTo")
        : null;
    if (!["asc", "desc"].includes(sortDirection)) {
        throw createServiceError("Sort direction must be asc or desc.", 400);
    }

    const sortExpressions = {
        title: "tasks.title",
        assigned_to_name: "assignee.full_name",
        created_by_name: "creator.full_name",
        assigned_date: "tasks.assigned_date",
        due_date: "tasks.due_date",
        priority: "FIELD(COALESCE(NULLIF(LOWER(TRIM(tasks.priority)), ''), 'medium'), 'high', 'medium', 'low')",
        status: "FIELD(tasks.status, 'assigned', 'in_progress', 'submitted', 'under_review', 'changes_required', 'completed')",
    };
    if (!Object.prototype.hasOwnProperty.call(sortExpressions, sortBy)) {
        throw createServiceError("Unsupported task sort column.", 400);
    }

    const conditions = [];
    const values = [];
    if (view === "completed") {
        conditions.push("tasks.status = 'completed'");
    } else {
        conditions.push("(tasks.status IS NULL OR tasks.status <> 'completed')");
    }
    if (scope === "assigned") {
        conditions.push("(tasks.assigned_to = ? OR tasks.pending_assignee_id = ?)");
        values.push(currentUserId, currentUserId);
    } else if (scope === "created") {
        conditions.push("tasks.created_by = ?");
        values.push(currentUserId);
    }
    if (priority !== "all") {
        conditions.push("COALESCE(NULLIF(LOWER(TRIM(tasks.priority)), ''), 'medium') = ?");
        values.push(priority);
    }
    if (assignedTo !== null) {
        conditions.push("tasks.assigned_to = ?");
        values.push(assignedTo);
    }
    if (search) {
        conditions.push("(tasks.title LIKE ? OR assignee.full_name LIKE ? OR creator.full_name LIKE ?)");
        values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${conditions.join(" AND ")}`;

    const [countRows] = await db.promise().query(
        `SELECT COUNT(*) AS total ${joins} ${where}`,
        values
    );
    const total = Number(countRows[0]?.total || 0);
    const offset = (page - 1) * pageSize;
    const direction = sortDirection.toUpperCase();
    const orderBy = sortBy === "due_date"
        ? `tasks.due_date IS NULL ASC, tasks.due_date ${direction}, tasks.id ASC`
        : `${sortExpressions[sortBy]} ${direction}, tasks.id ASC`;
    const [tasks] = await db.promise().query(
        `${select} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
        [...values, pageSize, offset]
    );

    return {
        tasks: tasks.map(toTaskResponse),
        total,
        page,
        pageSize,
    };
};


// =====================================
// Delete
// Manager only
// =====================================

const deleteTask = async (
    taskId,
    currentUser
) => {
    if (currentUser?.role !== "manager") {
        throw createServiceError("Manager access required", 403);
    }

    const connection =
        await db
            .promise()
            .getConnection();

    try {
        await connection
            .beginTransaction();

        const [taskRows] = await connection.query(
            "SELECT id FROM tasks WHERE id = ? LIMIT 1 FOR UPDATE",
            [taskId]
        );

        if (taskRows.length === 0) {
            throw createServiceError(
                "Task not found",
                404
            );
        }

        await connection.query(
            `
            DELETE FROM notifications

            WHERE reference_id = ?
              AND LEFT(type, 5) = 'task_'
            `,
            [taskId]
        );

        // Remove only records that belong to this task in the same transaction.
        await connection.query(
            "DELETE FROM task_handoffs WHERE task_id = ?",
            [taskId]
        );

        await connection.query(
            `
            DELETE FROM tasks
            WHERE id = ?
            `,
            [taskId]
        );

        await connection.commit();

        return true;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
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

    getTaskById,
    deleteTask,
};
