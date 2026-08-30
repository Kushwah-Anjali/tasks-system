const bcrypt = require("bcrypt");
const crypto = require("crypto");

const db = require("../config/db");

const register = async (userData) => {
    const {
        full_name,
        email,
        phone,
        password,
        date_of_birth,
        department_id,
        designation,
        joining_date,
    } = userData;

    if (
        typeof full_name !== "string" ||
        !full_name.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof password !== "string" ||
        password.length < 6
    ) {
        throw new Error(
            "Full name, valid email and password are required"
        );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const connection = await db.promise().getConnection();

    try {
        await connection.beginTransaction();

        const [existingUsers] = await connection.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            throw new Error("Email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await connection.query(
            `INSERT INTO users
                (
                    full_name,
                    email,
                    phone,
                    password,
                    role,
                    status,
                    is_active
                )
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                full_name.trim(),
                normalizedEmail,
                phone || null,
                hashedPassword,
                "employee",
                "approved",
                1,
            ]
        );

        const userId = userResult.insertId;

        const registrationNumber =
            `EMP-${new Date().getFullYear()}-${String(userId)
                .padStart(4, "0")}`;

        await connection.query(
            `INSERT INTO employees
                (
                    user_id,
                    registration_number,
                    date_of_birth,
                    department_id,
                    designation,
                    joining_date
                )
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                registrationNumber,
                date_of_birth || null,
                department_id || null,
                designation || null,
                joining_date || null,
            ]
        );

        await connection.commit();

        return {
            message: "Registration completed successfully",
            registrationNumber,
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

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
            is_active
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
    register,
    login,
    logout,
};