const assert = require("node:assert/strict");
const test = require("node:test");

const employeeServicePath = require.resolve("../src/services/employeeService");
const adminServicePath = require.resolve("../src/services/adminService");
const employeeControllerPath = require.resolve("../src/controllers/employeeController");
const adminControllerPath = require.resolve("../src/controllers/adminController");
let managerCreateInput;
let adminCreateInput;

require.cache[employeeServicePath] = {
  id: employeeServicePath,
  filename: employeeServicePath,
  loaded: true,
  exports: {
    async createEmployee(input) { managerCreateInput = input; return { registrationNumber: "EMP-TEST" }; },
  },
};
require.cache[adminServicePath] = {
  id: adminServicePath,
  filename: adminServicePath,
  loaded: true,
  exports: {
    async createEmployee(input) { adminCreateInput = input; },
  },
};
delete require.cache[employeeControllerPath];
delete require.cache[adminControllerPath];
const employeeController = require(employeeControllerPath);
const adminController = require(adminControllerPath);

const employeeBody = {
  full_name: "New Employee",
  email: "new.employee@example.invalid",
  phone: "1234567890",
  password: "temporary-123",
  confirm_password: "temporary-123",
  date_of_birth: "1990-01-01",
  department_id: 3,
  designation: "Analyst",
  joining_date: "2025-01-01",
};

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("manager employee creation accepts and forwards the initial password", async () => {
  managerCreateInput = undefined;
  const response = createResponse();
  await employeeController.createEmployee({ body: employeeBody }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(managerCreateInput.password, "temporary-123");
  assert.equal(managerCreateInput.confirmPassword, undefined);
  assert.equal(managerCreateInput.phone, employeeBody.phone);
});

test("admin employee creation accepts and forwards the initial password", async () => {
  adminCreateInput = undefined;
  const response = createResponse();
  await adminController.createAccount({ body: { ...employeeBody, role: "employee" } }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(adminCreateInput.password, "temporary-123");
  assert.equal(adminCreateInput.departmentId, 3);
  assert.equal(response.body.message, "Employee account created successfully.");
});
