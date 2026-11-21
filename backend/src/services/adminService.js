const bcrypt = require("bcrypt");
const db = require("../config/db");
const employeeService = require("./employeeService");

const getAccounts = async () => {
  const [accounts] = await db.promise().query(
    `SELECT id, full_name, email, role, is_active
     FROM users
     WHERE role IN ('manager', 'employee')
     ORDER BY role ASC, full_name ASC, id ASC`
  );

  return accounts;
};

const createManager = async ({ fullName, email, password }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [email]
    );

    if (existingUsers.length > 0) {
      const error = new Error("An account with this email already exists.");
      error.code = "DUPLICATE_EMAIL";
      throw error;
    }

    await connection.query(
      `INSERT INTO users
        (full_name, email, phone, password, role, status, is_active)
       VALUES (?, ?, NULL, ?, 'manager', 'approved', 1)`,
      [fullName, email, passwordHash]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const createEmployee = async (employeeData) => employeeService.createEmployee(employeeData);

const setAccountActive = async (userId, isActive) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();
    const [accounts] = await connection.query(
      `SELECT id, role
       FROM users
       WHERE id = ? AND role IN ('manager', 'employee')
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (accounts.length === 0) {
      await connection.rollback();
      return null;
    }

    await connection.query(
      "UPDATE users SET is_active = ? WHERE id = ? AND role IN ('manager', 'employee')",
      [isActive ? 1 : 0, userId]
    );

    if (!isActive) {
      await connection.query(
        "DELETE FROM sessions WHERE user_id = ?",
        [userId]
      );
    }

    await connection.commit();
    return accounts[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const resetAccountPassword = async ({ adminUserId, targetUserId, currentPassword, newPassword }) => {
  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [admins] = await connection.query(
      `SELECT id, password
       FROM users
       WHERE id = ? AND role = 'admin'
       LIMIT 1
       FOR UPDATE`,
      [adminUserId]
    );

    if (admins.length === 0 || !(await bcrypt.compare(currentPassword, admins[0].password))) {
      const error = new Error("Admin current password is incorrect.");
      error.code = "ADMIN_PASSWORD_INCORRECT";
      throw error;
    }

    const [targets] = await connection.query(
      `SELECT id, role
       FROM users
       WHERE id = ? AND role IN ('manager', 'employee')
       LIMIT 1
       FOR UPDATE`,
      [targetUserId]
    );

    if (targets.length === 0) {
      const error = new Error("Manager or employee account not found.");
      error.code = "TARGET_ACCOUNT_NOT_FOUND";
      throw error;
    }

    await connection.query(
      `UPDATE users
       SET password = ?
       WHERE id = ? AND role IN ('manager', 'employee')`,
      [await bcrypt.hash(newPassword, 10), targetUserId]
    );
    await connection.query(
      "DELETE FROM sessions WHERE user_id = ?",
      [targetUserId]
    );

    await connection.commit();
    return { role: targets[0].role };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAccounts,
  createManager,
  createEmployee,
  setAccountActive,
  resetAccountPassword,
};
