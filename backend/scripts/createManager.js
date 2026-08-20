require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const bcrypt = require("bcrypt");
const db = require("../src/config/db");

async function createManager() {
  const managerName = process.env.MANAGER_NAME;
  const managerEmail = process.env.MANAGER_EMAIL;
  const password = process.env.MANAGER_PASSWORD;

  if (!password) {
    throw new Error("MANAGER_PASSWORD is missing");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.promise().query(
    `INSERT INTO users
    (full_name, email, phone, password, role, status, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      managerName,
      managerEmail,
      null,
      hashedPassword,
      "manager",
      "approved",
      1,
    ]
  );

  console.log("Manager created successfully.");
  process.exit();
}

createManager();