const db = require("../config/db");

const createTask = async (taskData) => {
    const { title, created_by, assigned_to, due_date } = taskData;

    const [result] = await db.promise().query(
        "INSERT INTO tasks (title, created_by, assigned_to, due_date) VALUES (?, ?, ?, ?)",
        [title, created_by, assigned_to, due_date]
    );

    return {
        id: result.insertId,
        title,
        created_by,
        assigned_to,
        due_date,
    };
};
const getMyTasks = async (userId) => {
    const [tasks] = await db.promise().query(
        "SELECT * FROM tasks WHERE assigned_to = ? ORDER BY due_date ASC",
        [userId]
    );

    return tasks;
};
const updateTask = async (taskId, userId, progress, status) => {
    const [result] = await db.promise().query(
        `UPDATE tasks
         SET progress = ?, status = ?
         WHERE id = ? AND assigned_to = ?`,
        [progress, status, taskId, userId]
    );

    return result;
};
const submitTask = async (taskId, userId) => {
    const [result] = await db.promise().query(
        `UPDATE tasks
         SET status = 'submitted'
         WHERE id = ? AND assigned_to = ?`,
        [taskId, userId]
    );

    return result;
};
const reviewTask = async (taskId, status, reviewNote) => {
    const [result] = await db.promise().query(
        `UPDATE tasks
         SET status = ?, review_note = ?
         WHERE id = ? AND status = 'submitted'`,
        [status, reviewNote, taskId]
    );

    return result;
};
const getAllTasks = async () => {
    const [tasks] = await db.promise().query(
        `SELECT 
            tasks.*,
            creator.full_name AS created_by_name,
            assignee.full_name AS assigned_to_name
         FROM tasks
         JOIN users AS creator ON tasks.created_by = creator.id
         JOIN users AS assignee ON tasks.assigned_to = assignee.id
         ORDER BY tasks.due_date ASC`
    );

    return tasks;
}; 
const updateTaskByManager = async (taskId, taskData) => {
    const { title, assigned_to, due_date } = taskData;

    const [result] = await db.promise().query(
        `UPDATE tasks
         SET title = ?, assigned_to = ?, due_date = ?
         WHERE id = ?`,
        [title, assigned_to, due_date, taskId]
    );

    return result;
};
const updateTaskProgress = async (taskId, userId, progress) => {
    const [result] = await db.promise().query(
        `UPDATE tasks
         SET progress = ?
         WHERE id = ? AND assigned_to = ?`,
        [progress, taskId, userId]
    );

    return result;
};
const getTaskById = async (taskId) => {
    const [tasks] = await db.promise().query(
        "SELECT * FROM tasks WHERE id = ?",
        [taskId]
    );

    return tasks[0];
};
const deleteTask = async (taskId) => {
    const [result] = await db.promise().query(
        "DELETE FROM tasks WHERE id = ?",
        [taskId]
    );

    return result;
};
module.exports = {
    createTask,
    getMyTasks,
    updateTaskProgress,
    submitTask,
    reviewTask,
    getAllTasks,
    updateTaskByManager,
    getTaskById,
    deleteTask,
};