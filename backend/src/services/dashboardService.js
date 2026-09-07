const db = require("../config/db");

const getIndiaToday = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === "year").value;
    const month = parts.find((part) => part.type === "month").value;
    const day = parts.find((part) => part.type === "day").value;

    return `${year}-${month}-${day}`;
};

const getDashboardStats = async () => {
    const today = getIndiaToday();

    const [[employeeResult]] = await db.promise().query(
        `SELECT COUNT(*) AS totalEmployees
         FROM users
         WHERE role = 'employee'
           AND status = 'approved'
           AND is_active = 1`
    );

    const [[attendanceResult]] = await db.promise().query(
        `SELECT
            SUM(status = 'present') AS presentToday,
            SUM(status = 'absent') AS absentToday
         FROM attendance
         WHERE attendance_date = ?`,
        [today]
    );

    const [[taskResult]] = await db.promise().query(
        `SELECT COUNT(*) AS openTasks
         FROM tasks
         WHERE status != 'completed'`
    );

    return {
        totalEmployees:
            Number(employeeResult.totalEmployees) || 0,
        presentToday:
            Number(attendanceResult.presentToday) || 0,
        absentToday:
            Number(attendanceResult.absentToday) || 0,
        openTasks:
            Number(taskResult.openTasks) || 0,
    };
};

const getRecentAttendance = async (limit = 5) => {
    const safeLimit = Math.min(
        20,
        Math.max(1, Number(limit) || 5)
    );
    const today = getIndiaToday();

    const [attendance] = await db.promise().query(
        `SELECT
            attendance.id,
            attendance.employee_id,
            attendance.attendance_date,
            attendance.status,
            attendance.is_late,
            attendance.late_time,
            users.full_name,
            employees.designation,
            marker.full_name AS marked_by_name
         FROM attendance
         INNER JOIN employees
            ON employees.id = attendance.employee_id
         INNER JOIN users
            ON users.id = employees.user_id
         LEFT JOIN users AS marker
            ON marker.id = attendance.marked_by
         WHERE attendance.attendance_date = ?
         ORDER BY attendance.updated_at DESC, attendance.id DESC
         LIMIT ?`,
        [today, safeLimit]
    );

    return attendance;
};

module.exports = {
    getDashboardStats,
    getRecentAttendance,
};
