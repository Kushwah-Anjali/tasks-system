const authService = require("../services/authService");

const isProduction = process.env.NODE_ENV === "production";

const sessionCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
        const clientErrors = new Set([
            "Invalid email or password",
            "Your account is pending approval",
            "Your account is disabled",
        ]);

        const errorMessage =
            error && typeof error.message === "string"
                ? error.message
                : "Unknown login error";

        if (clientErrors.has(errorMessage)) {
            return res.status(400).json({
                message: errorMessage,
            });
        }

        console.error("Login failed:", {
            code: error?.code,
            errno: error?.errno,
            sqlState: error?.sqlState,
            message: errorMessage,
        });

        return res.status(500).json({
            message: "Unable to log in right now. Please try again later.",
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
    login,
    logout,
};
