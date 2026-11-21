const allowedOrigins = require("../config/clientOrigins");

const csrfOriginMiddleware = (req, res, next) => {
  const origin = req.get("origin");
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      message: "This request origin is not allowed.",
    });
  }

  return next();
};

module.exports = csrfOriginMiddleware;
