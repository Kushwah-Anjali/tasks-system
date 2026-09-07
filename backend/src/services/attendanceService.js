const db = require("../config/db");

const markAttendance = async ({
    employeeId,
    attendanceDate,
    status,
    isLate,
    lateTime,
    markedBy,
}) => {
    const connection = db.promise();

    // Make sure employee exists
    const [employees] = await connection.query(
        `SELECT id
         FROM employees
         WHERE id = ?
         LIMIT 1`,
        [employeeId]
    );

    if (employees.length === 0) {
        throw new Error("Employee not found");
    }

    let finalIsLate = isLate ? 1 : 0;
    let finalLateTime = lateTime || null;

    // An absent employee cannot be late
    if (status === "absent") {
        finalIsLate = 0;
        finalLateTime = null;
    }

    // If Late is not selected, don't save a late time
    if (!finalIsLate) {
        finalLateTime = null;
    }

    await connection.query(
        `INSERT INTO attendance
            (
                employee_id,
                attendance_date,
                status,
                is_late,
                late_time,
                marked_by
            )
         VALUES (?, ?, ?, ?, ?, ?)

         ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            is_late = VALUES(is_late),
            late_time = VALUES(late_time),
            marked_by = VALUES(marked_by)`,
        [
            employeeId,
            attendanceDate,
            status,
            finalIsLate,
            finalLateTime,
            markedBy,
        ]
    );

    const [attendance] = await connection.query(
        `SELECT
            id,
            employee_id,
            attendance_date,
            status,
            is_late,
            late_time,
            marked_by
         FROM attendance
         WHERE employee_id = ?
           AND attendance_date = ?
         LIMIT 1`,
        [employeeId, attendanceDate]
    );

    return attendance[0];
};


/**
 * Get all employees with their attendance
 * for one selected date.
 *
 * LEFT JOIN is important:
 * employees without attendance will still appear.
 */
const getDailyAttendance = async (attendanceDate) => {
    const connection = db.promise();

   const [employees] = await connection.query(
    `SELECT
        employees.id AS employee_id,
        users.full_name,
        users.email,
        employees.designation,
        departments.name AS department,

        attendance.id AS attendance_id,
        attendance.attendance_date,
        attendance.status,
        attendance.is_late,
        attendance.late_time,
        attendance.marked_by,

        marker.full_name AS marked_by_name

     FROM employees

     INNER JOIN users
        ON users.id = employees.user_id

     LEFT JOIN departments
        ON departments.id = employees.department_id

     LEFT JOIN attendance
        ON attendance.employee_id = employees.id
        AND attendance.attendance_date = ?

     LEFT JOIN users AS marker
        ON marker.id = attendance.marked_by

     WHERE users.is_active = 1

     ORDER BY users.full_name ASC`,
    [attendanceDate]
);

    return employees;
};


/**
 * Get attendance history for one employee.
 */
const getEmployeeAttendance = async (
    employeeId,
    year,
    month
) => {
    const connection = db.promise();

    const [attendance] = await connection.query(
        `SELECT
            attendance.id,
            attendance.employee_id,
            attendance.attendance_date,
            attendance.status,
            attendance.is_late,
            attendance.late_time,
            attendance.marked_by,
            marker.full_name AS marked_by_name

         FROM attendance

         LEFT JOIN users AS marker
            ON marker.id = attendance.marked_by

         WHERE attendance.employee_id = ?
           AND YEAR(attendance.attendance_date) = ?
           AND MONTH(attendance.attendance_date) = ?

         ORDER BY attendance.attendance_date DESC`,
        [employeeId, year, month]
    );

    return attendance;
};

const getEmployeeAttendanceSummary = async (
  employeeId,
  year,
  month
) => {
  const connection = db.promise();

  const [summary] = await connection.query(
    `SELECT
        SUM(status = 'present') AS present,
        SUM(status = 'absent') AS absent,
        SUM(status = 'half_day') AS half_day,
        SUM(is_late = 1) AS late,
        COUNT(*) AS total_marked_days
     FROM attendance
     WHERE employee_id = ?
       AND YEAR(attendance_date) = ?
       AND MONTH(attendance_date) = ?`,
    [employeeId, year, month]
  );

  const data = summary[0];

  return {
    present: Number(data.present) || 0,
    absent: Number(data.absent) || 0,
    half_day: Number(data.half_day) || 0,
    late: Number(data.late) || 0,
    total_marked_days: Number(data.total_marked_days) || 0,
  };
};
module.exports = {
    markAttendance,
    getDailyAttendance,
    getEmployeeAttendance,
    getEmployeeAttendanceSummary,
};
