const bcrypt = require("bcrypt");
const crypto = require("crypto");

const db = require("../config/db");

const login = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await db.promise().query(
        `SELECT
            id,
            full_name,
            email,
            password,
            role,
            status,
            is_active,
            can_manage_attendance
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [normalizedEmail]
    );

    if (users.length === 0) {
        throw new Error("Invalid email or password");
    }

    const user = users[0];

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        throw new Error("Invalid email or password");
    }

    if (user.status !== "approved") {
        throw new Error("Your account is pending approval");
    }

    if (Number(user.is_active) !== 1) {
        throw new Error("Your account is disabled");
    }

    const sessionToken = crypto
        .randomBytes(32)
        .toString("hex");

    const sessionTokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await db.promise().query(
        `INSERT INTO sessions
            (user_id, session_token, expires_at)
         VALUES (?, ?, ?)`,
        [user.id, sessionTokenHash, expiresAt]
    );

    return {
        message: "Login successful",
        sessionToken,
        user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            can_manage_attendance:
                Number(user.can_manage_attendance) === 1,
        },
    };
};

const logout = async (sessionToken) => {
    const sessionTokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

    await db.promise().query(
        "DELETE FROM sessions WHERE session_token = ?",
        [sessionTokenHash]
    );
};

module.exports = {
    login,
    logout,
};
