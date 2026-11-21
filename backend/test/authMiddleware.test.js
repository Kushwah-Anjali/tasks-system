const assert = require("node:assert/strict");
const test = require("node:test");

const databasePath = require.resolve("../src/config/db");
const authMiddlewarePath = require.resolve("../src/middleware/authMiddleware");
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { promise: () => ({ query: async () => { throw new Error("DB should not be queried without a cookie"); } }) },
};
delete require.cache[authMiddlewarePath];
const authMiddleware = require(authMiddlewarePath);

test("unauthenticated requests are rejected before password handling", async () => {
  let nextCalled = false;
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  await authMiddleware({ cookies: {} }, response, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});
