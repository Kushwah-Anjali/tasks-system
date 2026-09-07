const db = require("../config/db");

const getAllEmployees = async () => {
  const [employees] = await db.promise().query(`
    SELECT 
      u.id,
        e.id AS employee_id,
      e.registration_number,
      e.date_of_birth,
      e.designation,
      e.joining_date,
      u.full_name,
      u.email,
      u.phone,
      u.status AS account_status,
      u.is_active,
      u.can_manage_attendance,
      d.id AS department_id,
      d.name AS department
    FROM employees e
    INNER JOIN users u
      ON e.user_id = u.id
    LEFT JOIN departments d
      ON e.department_id = d.id
    ORDER BY e.created_at DESC
  `);

  return employees;
};


const updateAttendancePermission = async (
  userId,
  canManageAttendance
) => {
  const [result] = await db.promise().query(
    `UPDATE users
     SET can_manage_attendance = ?
     WHERE id = ?`,
    [canManageAttendance ? 1 : 0, userId]
  );

  return result;
};


module.exports = {
  getAllEmployees,
  updateAttendancePermission,
};