const db = require("../config/db");

const OFFICE_START_HOUR = 10;
const LATE_HOUR = 10;
const LATE_MINUTE = 30;
const OFFICE_END_HOUR = 19;

const checkIn = async (userId) => {
  const connection = db.promise();

  // Find employee belonging to logged-in user
  const [employees] = await connection.query(
    `SELECT id
     FROM employees
     WHERE user_id = ?`,
    [userId]
  );

  if (employees.length === 0) {
    throw new Error("Employee profile not found");
  }

  const employeeId = employees[0].id;

  // Current date
  const now = new Date();

  const attendanceDate = now.toISOString().split("T")[0];

  // Check today's attendance
  const [existing] = await connection.query(
    `SELECT *
     FROM attendance
     WHERE employee_id = ?
     AND attendance_date = ?`,
    [employeeId, attendanceDate]
  );

  if (existing.length > 0 && existing[0].check_in) {
    throw new Error("You have already checked in today");
  }

  // Determine status
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  let status = "present";

  if (
    currentHour > LATE_HOUR ||
    (currentHour === LATE_HOUR && currentMinute >= LATE_MINUTE)
  ) {
    status = "late";
  }

  if (existing.length > 0) {
    await connection.query(
      `UPDATE attendance
       SET check_in = ?, status = ?
       WHERE id = ?`,
      [now, status, existing[0].id]
    );
  } else {
    await connection.query(
      `INSERT INTO attendance
       (employee_id, attendance_date, check_in, status)
       VALUES (?, ?, ?, ?)`,
      [employeeId, attendanceDate, now, status]
    );
  }

  return {
    message: "Check-in successful",
    checkIn: now,
    status,
  };
};

const checkOut = async (userId) => {
  const connection = db.promise();

  const [employees] = await connection.query(
    `SELECT id
     FROM employees
     WHERE user_id = ?`,
    [userId]
  );

  if (employees.length === 0) {
    throw new Error("Employee profile not found");
  }

  const employeeId = employees[0].id;

  const attendanceDate = new Date().toISOString().split("T")[0];

  const [attendance] = await connection.query(
    `SELECT *
     FROM attendance
     WHERE employee_id = ?
     AND attendance_date = ?`,
    [employeeId, attendanceDate]
  );

  if (attendance.length === 0 || !attendance[0].check_in) {
    throw new Error("You have not checked in today");
  }

  if (attendance[0].check_out) {
    throw new Error("You have already checked out today");
  }

  const now = new Date();

  await connection.query(
    `UPDATE attendance
     SET check_out = ?
     WHERE id = ?`,
    [now, attendance[0].id]
  );

  return {
    message: "Check-out successful",
    checkOut: now,
  };
};

const getTodayAttendance = async (userId) => {
  const connection = db.promise();

  const [employees] = await connection.query(
    `SELECT id
     FROM employees
     WHERE user_id = ?`,
    [userId]
  );

  if (employees.length === 0) {
    throw new Error("Employee profile not found");
  }

  const employeeId = employees[0].id;

  const today = new Date().toISOString().split("T")[0];

  const [attendance] = await connection.query(
    `SELECT
       id,
       attendance_date,
       check_in,
       check_out,
       status
     FROM attendance
     WHERE employee_id = ?
     AND attendance_date = ?`,
    [employeeId, today]
  );

  return attendance.length > 0 ? attendance[0] : null;
};

const getMonthlySummary = async (userId) => {
  const connection = db.promise();

  const [employees] = await connection.query(
    `SELECT id
     FROM employees
     WHERE user_id = ?`,
    [userId]
  );

  if (employees.length === 0) {
    throw new Error("Employee profile not found");
  }

  const employeeId = employees[0].id;

  const [summary] = await connection.query(
    `SELECT
       SUM(status = 'present') AS present,
       SUM(status = 'late') AS late,
       SUM(status = 'absent') AS absent,
       COUNT(*) AS total
     FROM attendance

     WHERE employee_id = ?
     AND YEAR(attendance_date) = YEAR(CURDATE())
     AND MONTH(attendance_date) = MONTH(CURDATE())`,
    [employeeId]
  );

  const data = summary[0];

  const total = Number(data.total) || 0;
  const present = Number(data.present) || 0;
  const late = Number(data.late) || 0;
  const absent = Number(data.absent) || 0;
const attendedDays = present + late + absent;
const attendancePercentage =
  attendedDays > 0
    ? Math.round(((present + late) / attendedDays) * 100)
    : 0;

  return {
    present,
    late,
    absent,
    attendancePercentage,
  };
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMonthlySummary,
};