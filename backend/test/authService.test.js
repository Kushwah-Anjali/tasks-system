const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");

const databasePath = require.resolve("../src/config/db");
const authServicePath = require.resolve("../src/services/authService");
const state = { userId: 42, passwordHash: "", sessions: [] };
let transactionSnapshot;

const connection = {
  async beginTransaction() {
    transactionSnapshot = {
      passwordHash: state.passwordHash,
      sessions: [...state.sessions],
    };
  },
  async query(sql, params) {
    if (sql.startsWith("SELECT password FROM users")) {
      return [[{ password: state.passwordHash }], []];
    }
    if (sql.startsWith("UPDATE users SET password")) {
      assert.equal(params[1], state.userId);
      state.passwordHash = params[0];
      return [{ affectedRows: 1 }, []];
    }
    if (sql.startsWith("DELETE FROM sessions")) {
      assert.equal(params[0], state.userId);
      state.sessions = [];
      return [{ affectedRows: 2 }, []];
    }
    throw new Error(`Unexpected SQL in unit test: ${sql}`);
  },
  async commit() { transactionSnapshot = undefined; },
  async rollback() {
    if (transactionSnapshot) {
      state.passwordHash = transactionSnapshot.passwordHash;
      state.sessions = [...transactionSnapshot.sessions];
      transactionSnapshot = undefined;
    }
  },
  release() {},
};

const fakeDb = {
  promise: () => ({ getConnection: async () => connection }),
};
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: fakeDb,
};
delete require.cache[authServicePath];
const authService = require(authServicePath);

test.beforeEach(async () => {
  state.passwordHash = await bcrypt.hash("old-pass-123", 10);
  state.sessions = ["session-a", "session-b"];
  transactionSnapshot = undefined;
});

test("changePassword replaces the hash and revokes every session atomically", async () => {
  await authService.changePassword({
    userId: state.userId,
    currentPassword: "old-pass-123",
    newPassword: "new-pass-456",
  });

  assert.equal(await bcrypt.compare("new-pass-456", state.passwordHash), true);
  assert.equal(await bcrypt.compare("old-pass-123", state.passwordHash), false);
  assert.deepEqual(state.sessions, []);
});

test("incorrect current password leaves password and sessions unchanged", async () => {
  const originalHash = state.passwordHash;
  await assert.rejects(
    authService.changePassword({
      userId: state.userId,
      currentPassword: "wrong-pass",
      newPassword: "new-pass-456",
    }),
    { code: "CURRENT_PASSWORD_INCORRECT" }
  );
  assert.equal(state.passwordHash, originalHash);
  assert.deepEqual(state.sessions, ["session-a", "session-b"]);
});

test("same password is rejected without revoking sessions", async () => {
  const originalHash = state.passwordHash;
  await assert.rejects(
    authService.changePassword({
      userId: state.userId,
      currentPassword: "old-pass-123",
      newPassword: "old-pass-123",
    }),
    { code: "SAME_PASSWORD" }
  );
  assert.equal(state.passwordHash, originalHash);
  assert.deepEqual(state.sessions, ["session-a", "session-b"]);
});
