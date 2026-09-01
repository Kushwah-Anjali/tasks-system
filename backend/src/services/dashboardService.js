const db = require("../config/db");

const getDashboardStats = async () => {
    const [[employeeResult]] = await 
        `SELECT COUNT(*) AS totalEmployees
         FROM users
         WHERE role = 'employee'
           AND status = 'approved'
           AND is_active = 1`

    const [[attendanceResult]] = await db.promise().query(
        `SELECT COUNT(DISTINCT employee_id) AS presentToday
         FROM attendance
         WHERE attendance_date = CURDATE()
           AND status IN ('present', 'late')`
    );

    const [[taskResult]] = await db.promise().query(
        `SELECT COUNT(*) AS openTasks
         FROM tasks
         WHERE status != 'completed'`
    );

    return {
        totalEmployees: Number(employeeResult.totalEmployees) || 0,
        presentToday: Number(attendanceResult.presentToday) || 0,
        onLeave: 0,
        openTasks: Number(taskResult.openTasks) || 0,
    };
};

const getRecentAttendance = async (limit = 5) => {
    const safeLimit = Math.min(20, Math.max(1, Number(limit) || 5));

    const [attendance] = await db.promise().query(
        `SELECT
            attendance.id,
            attendance.employee_id,
            attendance.attendance_date,
            attendance.check_in,
            attendance.check_out,
            attendance.status,
            users.full_name,
            employees.designation
         FROM attendance
         INNER JOIN employees
            ON employees.id = attendance.employee_id
         INNER JOIN users
            ON users.id = employees.user_id
         WHERE attendance.attendance_date = CURDATE()
         ORDER BY attendance.check_in DESC
         LIMIT ?`,
        [safeLimit]
    );

    return attendance;
};

module.exports = {
    getDashboardStats,
    getRecentAttendance,
};
