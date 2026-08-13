const crypto = require("crypto");
const db = require("../config/db");

const authMiddleware = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.session;

    if (!sessionToken) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const [sessions] = await db.promise().query(
      `SELECT
        sessions.user_id,
        users.role,
        users.status,
        users.is_active
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.session_token = ?
       AND sessions.expires_at > NOW()`,
      [sessionTokenHash]
    );

    if (sessions.length === 0) {
      return res.status(401).json({
        message: "Invalid or expired session",
      });
    }

    const session = sessions[0];

    if (session.status !== "approved" || !session.is_active) {
      return res.status(401).json({
        message: "Account is not active",
      });
    }

    req.user = {
      id: session.user_id,
      role: session.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;