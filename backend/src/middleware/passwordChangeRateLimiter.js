const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attemptsByUser = new Map();

const passwordChangeRateLimiter = (req, res, next) => {
  const userId = String(req.user.id);
  const now = Date.now();
  let record = attemptsByUser.get(userId);

  if (!record || now - record.windowStartedAt >= WINDOW_MS) {
    record = { windowStartedAt: now, attempts: 0 };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - record.windowStartedAt)) / 1000)
    );
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many password attempts. Please try again later.",
    });
  }

  record.attempts += 1;
  attemptsByUser.set(userId, record);
  return next();
};

passwordChangeRateLimiter.reset = (userId) => {
  attemptsByUser.delete(String(userId));
};

module.exports = passwordChangeRateLimiter;
