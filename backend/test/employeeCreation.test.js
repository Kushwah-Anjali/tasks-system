const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");

const databasePath = require.resolve("../src/config/db");
const employeeServicePath = require.resolve("../src/services/employeeService");
const insertedValues = [];
const connection = {
  async beginTransaction() {},
  async query(sql, params) {
    if (sql.includes("FROM departments")) return [[{ id: 3 }], []];
    if (sql.includes("SELECT id FROM users")) return [[], []];
    if (sql.includes("INSERT INTO users")) {
      insertedValues.push(params);
      return [{ insertId: 81 }, []];
    }
    if (sql.includes("INSERT INTO employees")) return [{ insertId: 19 }, []];
    throw new Error(`Unexpected SQL in unit test: ${sql}`);
  },
  async commit() {},
  async rollback() {},
  release() {},
};
const fakeDb = { promise: () => ({ getConnection: async () => connection }) };
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: fakeDb,
};
delete require.cache[employeeServicePath];
const employeeService = require(employeeServicePath);

test("employee initial password is hashed before the user insert", async () => {
  insertedValues.length = 0;
  const plainPassword = "temporary-123";
  const result = await employeeService.createEmployee({
    fullName: "Test Employee",
    email: "employee@example.invalid",
    phone: "1234567890",
    password: plainPassword,
    dateOfBirth: "1990-01-01",
    departmentId: 3,
    designation: "Analyst",
    joiningDate: "2025-01-01",
  });

  const savedHash = insertedValues[0][3];
  assert.equal(result.registrationNumber.startsWith("EMP-"), true);
  assert.notEqual(savedHash, plainPassword);
  assert.equal(await bcrypt.compare(plainPassword, savedHash), true);
});
