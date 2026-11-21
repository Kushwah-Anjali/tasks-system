const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");

const users = new Map([
  [1, { id: 1, role: "admin", password: "", is_active: 1, status: "approved", full_name: "Test Admin" }],
  [2, { id: 2, role: "manager", password: "", is_active: 1, status: "approved", full_name: "Test Manager", profile: { department: null } }],
  [3, { id: 3, role: "employee", password: "", is_active: 0, status: "approved", full_name: "Inactive Test Employee", profile: { department: 4 } }],
  [4, { id: 4, role: "admin", password: "", is_active: 1, status: "approved", full_name: "Other Admin" }],
]);
let sessions = new Set(["session-admin-1", "session-manager-2", "session-employee-3"]);
const tasks = [{ id: 20, assigned_to: 3, created_by: 1, status: "in_progress" }];
const attendance = [{ user_id: 3, date: "2026-01-04" }];
const history = [{ task_id: 20, actor_user_id: 3 }];
let snapshot;

const connection = {
  async beginTransaction() {
    snapshot = {
      users: new Map([...users].map(([id, account]) => [id, { ...account }])),
      sessions: new Set(sessions),
    };
  },
  async query(sql, params) {
    if (sql.includes("role = 'admin'")) {
      const account = users.get(params[0]);
      return [account?.role === "admin" ? [{ id: account.id, password: account.password }] : [], []];
    }
    if (sql.startsWith("UPDATE users") && sql.includes("SET password")) {
      const account = users.get(params[1]);
      account.password = params[0];
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes("role IN ('manager', 'employee')")) {
      const account = users.get(params[0]);
      return [account && ["manager", "employee"].includes(account.role)
        ? [{ id: account.id, role: account.role }]
        : [], []];
    }
    if (sql.startsWith("DELETE FROM sessions")) {
      const prefix = `session-${params[0] === 1 ? "admin" : params[0] === 2 ? "manager" : "employee"}-${params[0]}`;
      for (const session of sessions) if (session.startsWith(prefix)) sessions.delete(session);
      return [{ affectedRows: 1 }, []];
    }
    throw new Error(`Unexpected SQL in unit test: ${sql}`);
  },
  async commit() { snapshot = undefined; },
  async rollback() {
    if (!snapshot) return;
    users.clear();
    for (const [id, account] of snapshot.users) users.set(id, account);
    sessions = new Set(snapshot.sessions);
    snapshot = undefined;
  },
  release() {},
};

const databasePath = require.resolve("../src/config/db");
const adminServicePath = require.resolve("../src/services/adminService");
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { promise: () => ({ getConnection: async () => connection }) },
};
delete require.cache[adminServicePath];
const adminService = require(adminServicePath);

test.beforeEach(async () => {
  users.get(1).password = await bcrypt.hash("admin-current", 10);
  users.get(2).password = await bcrypt.hash("manager-old", 10);
  users.get(3).password = await bcrypt.hash("employee-old", 10);
  users.get(4).password = await bcrypt.hash("other-admin", 10);
  users.get(3).is_active = 0;
  sessions = new Set(["session-admin-1", "session-manager-2", "session-employee-3"]);
  snapshot = undefined;
});

test("admin can reset manager and employee hashes while preserving account data and status", async () => {
  const before = new Map([...users].map(([id, account]) => [id, { ...account }]));
  const tasksBefore = structuredClone(tasks);
  const attendanceBefore = structuredClone(attendance);
  const historyBefore = structuredClone(history);

  for (const targetUserId of [2, 3]) {
    sessions = new Set(["session-admin-1", "session-manager-2", "session-employee-3"]);
    await adminService.resetAccountPassword({
      adminUserId: 1,
      targetUserId,
      currentPassword: "admin-current",
      newPassword: "temporary-new",
    });
    assert.equal(await bcrypt.compare("temporary-new", users.get(targetUserId).password), true);
    assert.equal(sessions.has(`session-manager-2`), targetUserId === 3);
    assert.equal(sessions.has(`session-employee-3`), targetUserId === 2);
    assert.equal(users.get(targetUserId).role, before.get(targetUserId).role);
    assert.equal(users.get(targetUserId).status, before.get(targetUserId).status);
    assert.equal(users.get(targetUserId).is_active, before.get(targetUserId).is_active);
    assert.deepEqual(users.get(targetUserId).profile, before.get(targetUserId).profile);
  }

  assert.equal(users.get(3).is_active, 0);
  assert.equal(sessions.has("session-admin-1"), true);
  assert.deepEqual(tasks, tasksBefore);
  assert.deepEqual(attendance, attendanceBefore);
  assert.deepEqual(history, historyBefore);
});

test("wrong admin password leaves target password and sessions untouched", async () => {
  const oldHash = users.get(2).password;
  await assert.rejects(
    adminService.resetAccountPassword({
      adminUserId: 1,
      targetUserId: 2,
      currentPassword: "wrong-admin-password",
      newPassword: "temporary-new",
    }),
    { code: "ADMIN_PASSWORD_INCORRECT" }
  );
  assert.equal(users.get(2).password, oldHash);
  assert.deepEqual([...sessions].sort(), ["session-admin-1", "session-employee-3", "session-manager-2"]);
});

test("target user's old password cannot authorize an admin reset", async () => {
  const oldHash = users.get(2).password;
  await assert.rejects(
    adminService.resetAccountPassword({
      adminUserId: 1,
      targetUserId: 2,
      currentPassword: "manager-old",
      newPassword: "temporary-new",
    }),
    { code: "ADMIN_PASSWORD_INCORRECT" }
  );
  assert.equal(users.get(2).password, oldHash);
  assert.deepEqual([...sessions].sort(), ["session-admin-1", "session-employee-3", "session-manager-2"]);
});

test("admin accounts cannot be password-reset through managed account service", async () => {
  const oldHash = users.get(4).password;
  await assert.rejects(
    adminService.resetAccountPassword({
      adminUserId: 1,
      targetUserId: 4,
      currentPassword: "admin-current",
      newPassword: "temporary-new",
    }),
    { code: "TARGET_ACCOUNT_NOT_FOUND" }
  );
  assert.equal(users.get(4).password, oldHash);
  assert.deepEqual([...sessions].sort(), ["session-admin-1", "session-employee-3", "session-manager-2"]);
});

test("a non-admin actor cannot authorize a reset in the service", async () => {
  await assert.rejects(
    adminService.resetAccountPassword({
      adminUserId: 2,
      targetUserId: 3,
      currentPassword: "manager-old",
      newPassword: "temporary-new",
    }),
    { code: "ADMIN_PASSWORD_INCORRECT" }
  );
  assert.equal(await bcrypt.compare("employee-old", users.get(3).password), true);
  assert.equal(sessions.has("session-employee-3"), true);
});
