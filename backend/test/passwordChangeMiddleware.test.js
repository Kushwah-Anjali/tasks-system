const assert = require("node:assert/strict");
const test = require("node:test");
const csrfOriginMiddleware = require("../src/middleware/csrfOriginMiddleware");
const passwordChangeRateLimiter = require("../src/middleware/passwordChangeRateLimiter");

test("password change requires an allowlisted browser origin", () => {
  let nextCalled = false;
  let statusCode;
  const response = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
  };

  csrfOriginMiddleware({ get: () => "https://evil.example" }, response, () => { nextCalled = true; });
  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);

  csrfOriginMiddleware({ get: () => "https://tasks.solezz.in" }, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("password attempts are limited per authenticated user", () => {
  const userId = `rate-test-${Date.now()}`;
  let nextCalls = 0;
  let statusCode;
  let retryAfter;
  const response = {
    set(name, value) { if (name === "Retry-After") retryAfter = value; return this; },
    status(code) { statusCode = code; return this; },
    json() { return this; },
  };
  const request = { user: { id: userId } };

  for (let i = 0; i < 5; i += 1) {
    passwordChangeRateLimiter(request, response, () => { nextCalls += 1; });
  }
  passwordChangeRateLimiter(request, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 5);
  assert.equal(statusCode, 429);
  assert.ok(Number(retryAfter) > 0);
  passwordChangeRateLimiter.reset(userId);
});
