const assert = require("node:assert/strict");
const test = require("node:test");
const adminMiddleware = require("../src/middleware/adminMiddleware");

const adminServicePath = require.resolve("../src/services/adminService");
const controllerPath = require.resolve("../src/controllers/adminController");
let submittedReset;
require.cache[adminServicePath] = {
  id: adminServicePath,
  filename: adminServicePath,
  loaded: true,
  exports: {
    async resetAccountPassword(input) { submittedReset = input; },
  },
};
delete require.cache[controllerPath];
const adminController = require(controllerPath);

const response = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("reset rejects client-supplied admin or target IDs in the body", async () => {
  submittedReset = undefined;
  const res = response();
  await adminController.resetAccountPassword({
    user: { id: 7 },
    params: { userId: "19" },
    body: { userId: 20, currentPassword: "admin-pass", newPassword: "temp-pass", confirmNewPassword: "temp-pass" },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(submittedReset, undefined);
});

test("reset uses the authenticated admin and URL target, never returns the password", async () => {
  submittedReset = undefined;
  const res = response();
  await adminController.resetAccountPassword({
    user: { id: 7, role: "admin" },
    params: { userId: "19" },
    body: { currentPassword: "admin-pass", newPassword: "temp-pass", confirmNewPassword: "temp-pass" },
  }, res);

  assert.deepEqual(submittedReset, {
    adminUserId: 7,
    targetUserId: 19,
    currentPassword: "admin-pass",
    newPassword: "temp-pass",
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { message: "Password reset successfully. Share the temporary password privately." });
  assert.equal(JSON.stringify(res.body).includes("temp-pass"), false);
});

test("reset enforces minimum length and matching confirmation before service call", async () => {
  submittedReset = undefined;
  const res = response();
  await adminController.resetAccountPassword({
    user: { id: 7 },
    params: { userId: "19" },
    body: { currentPassword: "admin-pass", newPassword: "short", confirmNewPassword: "short" },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(submittedReset, undefined);

  const mismatchResponse = response();
  await adminController.resetAccountPassword({
    user: { id: 7 },
    params: { userId: "19" },
    body: { currentPassword: "admin-pass", newPassword: "temp-pass", confirmNewPassword: "other-pass" },
  }, mismatchResponse);
  assert.equal(mismatchResponse.statusCode, 400);
  assert.equal(submittedReset, undefined);
});

test("admin-only middleware rejects manager and employee sessions", () => {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
  };
  let nextCalled = false;

  adminMiddleware({ user: { role: "manager" } }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);

  response.statusCode = 200;
  adminMiddleware({ user: { role: "employee" } }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);

  adminMiddleware({ user: { role: "admin" } }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
