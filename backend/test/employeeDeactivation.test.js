const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const bcrypt = require("bcrypt");
const managerMiddleware = require("../src/middleware/managerMiddleware");

const employee = {
  id: 31,
  employee_id: 5,
  registration_number: "EMP-TEST-0031",
  date_of_birth: "1990-01-01",
  designation: "Analyst",
  joining_date: "2024-01-01",
  full_name: "Temporary Test Employee",
  email: "temporary.employee@example.invalid",
  phone: "1234567890",
  account_status: "approved",
  role: "employee",
  is_active: 1,
  can_manage_attendance: 0,
  department_id: 3,
  department: "Test",
};
const users = new Map([
  [31, { ...employee }],
  [32, { ...employee, id: 32, role: "manager", is_active: 1 }],
  [33, { ...employee, id: 33, role: "admin", is_active: 1 }],
]);
const employees = new Set([31]);
const sessions = new Set(["session-hash-31"]);
const records = {
  attendance: [{ employeeId: 31, date: "2026-01-01" }],
  tasks: [{ id: 90, assigned_to: 31, status: "in_progress" }],
  history: [{ taskId: 90, actorUserId: 31 }],
};
let snapshot;

const connection = {
  async beginTransaction() {
    snapshot = {
      users: new Map([...users].map(([id, row]) => [id, { ...row }])),
      sessions: new Set(sessions),
    };
  },
  async query(sql, params) {
    if (sql.includes("SELECT users.id") && sql.includes("INNER JOIN employees")) {
      const row = users.get(params[0]);
      return [row?.role === "employee" && employees.has(row.id) ? [{ id: row.id }] : [], []];
    }
    if (sql.startsWith("UPDATE users")) {
      users.get(params[0]).is_active = 0;
      return [{ affectedRows: 1 }, []];
    }
    if (sql.startsWith("DELETE FROM sessions")) {
      sessions.delete(`session-hash-${params[0]}`);
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes("FROM employees e") && sql.includes("INNER JOIN users u")) {
      const row = users.get(params[0]);
      return row && employees.has(row.id)
        ? [[{ ...row, is_active: row.is_active }], []]
        : [[], []];
    }
    throw new Error(`Unexpected SQL in unit test: ${sql}`);
  },
  async commit() { snapshot = undefined; },
  async rollback() {
    if (!snapshot) return;
    users.clear();
    for (const [id, row] of snapshot.users) users.set(id, row);
    sessions.clear();
    for (const session of snapshot.sessions) sessions.add(session);
    snapshot = undefined;
  },
  release() {},
};

const fakeDb = {
  promise: () => ({
    getConnection: async () => connection,
    query: async (sql, params) => {
      if (sql.includes("FROM sessions") && sql.includes("INNER JOIN users")) return [[], []];
      if (sql.includes("FROM users") && sql.includes("WHERE email = ?")) {
        const row = users.get(31);
        return [[{
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          password: row.password,
          role: row.role,
          status: row.account_status,
          is_active: row.is_active,
          can_manage_attendance: row.can_manage_attendance,
        }], []];
      }
      throw new Error(`Unexpected pool SQL in unit test: ${sql} ${params || ""}`);
    },
  }),
};
const databasePath = require.resolve("../src/config/db");
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: fakeDb,
};
delete require.cache[require.resolve("../src/services/employeeService")];
delete require.cache[require.resolve("../src/services/authService")];
const employeeService = require("../src/services/employeeService");
const authService = require("../src/services/authService");

test.before(async () => {
  users.get(31).password = await bcrypt.hash("test-password", 10);
});

test("deactivation is employee-only, revokes sessions, and preserves records", async () => {
  const attendanceBefore = structuredClone(records.attendance);
  const tasksBefore = structuredClone(records.tasks);
  const historyBefore = structuredClone(records.history);

  const updatedEmployee = await employeeService.deactivateEmployee(31);

  assert.equal(updatedEmployee.is_active, 0);
  assert.equal(users.get(31).role, "employee");
  assert.equal(employees.has(31), true);
  assert.equal(sessions.size, 0);
  assert.deepEqual(records.attendance, attendanceBefore);
  assert.deepEqual(records.tasks, tasksBefore);
  assert.deepEqual(records.history, historyBefore);
});

test("manager and admin user IDs cannot be deactivated through employee service", async () => {
  assert.equal(await employeeService.deactivateEmployee(32), null);
  assert.equal(await employeeService.deactivateEmployee(33), null);
  assert.equal(users.get(32).is_active, 1);
  assert.equal(users.get(33).is_active, 1);
});

test("only manager sessions pass the employee-management route guard", () => {
  let nextCalled = false;
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
  };

  managerMiddleware({ user: { role: "admin" } }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);

  managerMiddleware({ user: { role: "manager" } }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("employee hard-delete route is removed and deactivation uses PATCH", () => {
  const employeeRouter = require("../src/routes/employeeRoutes");
  const routes = employeeRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => ({ path: layer.route.path, methods: layer.route.methods }));

  assert.equal(routes.some((route) => route.path === "/:userId" && route.methods.delete), false);
  assert.equal(routes.some((route) => route.path === "/:userId/deactivate" && route.methods.patch), true);
});

test("inactive employee login is blocked", async () => {
  await assert.rejects(
    authService.login({ email: employee.email, password: "test-password" }),
    { message: "Your account is disabled" }
  );
});

test("revoked sessions no longer authenticate", async () => {
  const authMiddlewarePath = require.resolve("../src/middleware/authMiddleware");
  delete require.cache[authMiddlewarePath];
  const authMiddleware = require(authMiddlewarePath);
  let nextCalled = false;
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
  };
  const rawToken = "revoked-session-token";
  const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  assert.notEqual(expectedHash, "session-hash-31");

  await authMiddleware({ cookies: { session: rawToken } }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});
