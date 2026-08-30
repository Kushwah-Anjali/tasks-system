const authService = require("../services/authService");

const isProduction = process.env.NODE_ENV === "production";

const sessionCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = async (req, res) => {
    try {
        const result = await authService.register(req.body);

        return res.status(201).json(result);
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const result = await authService.login({
            email: email.trim().toLowerCase(),
            password,
        });

        res.cookie(
            "session",
            result.sessionToken,
            sessionCookieOptions
        );

        return res.status(200).json({
            message: result.message,
            user: result.user,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
        });
    }
};

const logout = async (req, res) => {
    try {
        const sessionToken = req.cookies?.session;

        if (sessionToken) {
            await authService.logout(sessionToken);
        }

        res.clearCookie("session", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        return res.status(200).json({
            message: "Logout successful",
        });
    } catch (error) {
        return res.status(500).json({
            message: "Logout failed",
        });
    }
};

module.exports = {
    register,
    login,
    logout,
};