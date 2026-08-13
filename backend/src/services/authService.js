const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const register = async (userData) => {
  const {
    full_name,
    email,
    phone,
    password,
    date_of_birth,
    department_id,
    designation,
    joining_date,
  } = userData;

  const connection = db.promise();

  try {
    await connection.beginTransaction();

    // Check if email already exists
    const [existing] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      throw new Error("Email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee login account
    const [userResult] = await connection.query(
      `INSERT INTO users
      (full_name, email, phone, password, role, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        email,
        phone,
        hashedPassword,
        "employee",
        "approved",
        1,
      ]
    );

    const userId = userResult.insertId;

    // Generate registration number
    const registrationNumber = `EMP-${new Date().getFullYear()}-${String(
      userId
    ).padStart(4, "0")}`;

    // Create employee profile
    await connection.query(
      `INSERT INTO employees
      (user_id, registration_number, date_of_birth, department_id, designation, joining_date)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        registrationNumber,
        date_of_birth || null,
        department_id || null,
        designation || null,
        joining_date || null,
      ]
    );

    await connection.commit();

    return {
      message: "Registration completed successfully.",
      registrationNumber,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};
const login = async (userData) => {
  const { email, password } = userData;

  const [users] = await db.promise().query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  if (users.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = users[0];

  if (user.status !== "approved") {
    throw new Error("Your account is pending approval");
  }

  if (!user.is_active) {
    throw new Error("Your account is disabled");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid email or password");
  }
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionTokenHash = crypto
    .createHash("sha256")
    .update(sessionToken)
    .digest("hex");
 const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await db.promise().query(
    `INSERT INTO sessions
     (user_id, session_token, expires_at)
     VALUES (?, ?, ?)`,
    [user.id, sessionTokenHash, expiresAt]
  );
  return {
    message: "Login Successful",
     sessionToken,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = {
  register,
  login,
};