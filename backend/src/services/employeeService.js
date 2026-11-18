const bcrypt = require("bcrypt");
const db = require("../config/db");

const employeeSelect = `
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
  INNER JOIN users u ON e.user_id = u.id
  LEFT JOIN departments d ON e.department_id = d.id
`;

const getAllEmployees = async () => {
  const [employees] = await db.promise().query(`
    ${employeeSelect}
    ORDER BY e.created_at DESC
  `);

  return employees;
};

const createEmployee = async (employeeData) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [departments] = await connection.query(
      "SELECT id FROM departments WHERE id = ? LIMIT 1",
      [employeeData.departmentId]
    );

    if (departments.length === 0) {
      const error = new Error("Selected department does not exist.");
      error.code = "INVALID_DEPARTMENT";
      throw error;
    }

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [employeeData.email]
    );

    if (existingUsers.length > 0) {
      const error = new Error("An account with this email already exists.");
      error.code = "DUPLICATE_EMAIL";
      throw error;
    }

    const passwordHash = await bcrypt.hash(employeeData.password, 10);
    const [userResult] = await connection.query(
      `INSERT INTO users
        (full_name, email, phone, password, role, status, is_active)
       VALUES (?, ?, ?, ?, 'employee', 'approved', 1)`,
      [
        employeeData.fullName,
        employeeData.email,
        employeeData.phone,
        passwordHash,
      ]
    );

    const userId = userResult.insertId;
    const registrationNumber =
      `EMP-${new Date().getFullYear()}-${String(userId).padStart(4, "0")}`;

    await connection.query(
      `INSERT INTO employees
        (user_id, registration_number, date_of_birth, department_id, designation, joining_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        registrationNumber,
        employeeData.dateOfBirth,
        employeeData.departmentId,
        employeeData.designation,
        employeeData.joiningDate,
      ]
    );

    await connection.commit();

    return { registrationNumber };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

const updateEmployee = async (userId, employeeData) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [employeeRows] = await connection.query(
      `SELECT id
       FROM employees
       WHERE user_id = ?
       LIMIT 1 FOR UPDATE`,
      [userId]
    );

    if (employeeRows.length === 0) {
      await connection.rollback();
      return null;
    }

    await connection.query(
      `UPDATE users
       SET
         full_name = ?,
         email = ?,
         phone = ?,
         is_active = ?
       WHERE id = ?`,
      [
        employeeData.fullName,
        employeeData.email,
        employeeData.phone,
        employeeData.isActive ? 1 : 0,
        userId,
      ]
    );

    await connection.query(
      `UPDATE employees
       SET
         registration_number = ?,
         date_of_birth = ?,
         department_id = ?,
         designation = ?,
         joining_date = ?
       WHERE user_id = ?`,
      [
        employeeData.registrationNumber,
        employeeData.dateOfBirth,
        employeeData.departmentId,
        employeeData.designation,
        employeeData.joiningDate,
        userId,
      ]
    );

    const [updatedRows] = await connection.query(
      `${employeeSelect} WHERE u.id = ? LIMIT 1`, [userId]
    );
    await connection.commit();
    return updatedRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const deleteEmployee = async (userId) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [employeeRows] = await connection.query(
      `SELECT id
       FROM employees
       WHERE user_id = ?
       LIMIT 1 FOR UPDATE`,
      [userId]
    );

    if (employeeRows.length === 0) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      `DELETE FROM employees
       WHERE user_id = ?`,
      [userId]
    );

    const [userResult] = await connection.query(
      `DELETE FROM users
       WHERE id = ?`,
      [userId]
    );

    await connection.commit();

    return userResult.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllEmployees,
  createEmployee,
  updateAttendancePermission,
  updateEmployee,
  deleteEmployee,
};
