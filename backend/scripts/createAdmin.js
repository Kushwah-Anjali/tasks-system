const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const bcrypt = require("bcrypt");
const db = require("../src/config/db");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createAdmin() {
  const fullName = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!fullName || fullName.length > 100 || !email || email.length > 255 || !emailPattern.test(email)) {
    throw new Error("Set ADMIN_NAME and a valid ADMIN_EMAIL in backend/.env.");
  }
  if (!password || password.length < 6) {
    throw new Error("Set ADMIN_PASSWORD to at least 6 characters in backend/.env.");
  }

  const [existingUsers] = await db.promise().query(
    "SELECT id, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email]
  );

  if (existingUsers.length) {
    if (existingUsers[0].role === "admin") {
      console.log("Admin account already exists; no changes made.");
      return;
    }
    throw new Error("That email already belongs to a non-admin account. No changes made.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.promise().query(
    `INSERT INTO users
      (full_name, email, phone, password, role, status, is_active)
     VALUES (?, ?, NULL, ?, 'admin', 'approved', 1)`,
    [fullName, email, passwordHash]
  );
  console.log("Admin account created successfully.");
}

createAdmin()
  .catch((error) => {
    console.error(error.message || "Admin bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.promise().end();
  });
