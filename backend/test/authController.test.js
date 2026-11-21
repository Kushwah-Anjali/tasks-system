const assert = require("node:assert/strict");
const test = require("node:test");

const authServicePath = require.resolve("../src/services/authService");
const controllerPath = require.resolve("../src/controllers/authController");
let submittedChange;
require.cache[authServicePath] = {
  id: authServicePath,
  filename: authServicePath,
  loaded: true,
  exports: {
    async changePassword(input) { submittedChange = input; },
  },
};
delete require.cache[controllerPath];
const authController = require(controllerPath);

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  cookieCleared: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  clearCookie(name, options) { this.cookieCleared = { name, options }; },
});

test("change password rejects client-selected account IDs", async () => {
  submittedChange = undefined;
  const response = createResponse();
  await authController.changePassword({
    user: { id: 9 },
    body: { userId: 10, currentPassword: "current-123", newPassword: "new-pass-123", confirmNewPassword: "new-pass-123" },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(submittedChange, undefined);
});

test("change password resolves its target from the authenticated session", async () => {
  submittedChange = undefined;
  const response = createResponse();
  await authController.changePassword({
    user: { id: 27 },
    body: { currentPassword: "current-123", newPassword: "new-pass-123", confirmNewPassword: "new-pass-123" },
  }, response);

  assert.deepEqual(submittedChange, {
    userId: 27,
    currentPassword: "current-123",
    newPassword: "new-pass-123",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.cookieCleared.name, "session");
});

test("mismatched confirmation does not reach the password service", async () => {
  submittedChange = undefined;
  const response = createResponse();
  await authController.changePassword({
    user: { id: 27 },
    body: { currentPassword: "current-123", newPassword: "new-pass-123", confirmNewPassword: "other-pass-123" },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(submittedChange, undefined);
});
