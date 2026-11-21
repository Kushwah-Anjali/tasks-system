const authService = require("../services/authService");
const passwordChangeRateLimiter = require("../middleware/passwordChangeRateLimiter");

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

const changePassword = async (req, res) => {
    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, "userId") ||
        Object.prototype.hasOwnProperty.call(body, "user_id")) {
        return res.status(400).json({
            message: "The account is determined by your signed-in session.",
        });
    }

    const { currentPassword, newPassword, confirmNewPassword } = body;
    if (typeof currentPassword !== "string" || !currentPassword ||
        typeof newPassword !== "string" || !newPassword ||
        typeof confirmNewPassword !== "string" || !confirmNewPassword) {
        return res.status(400).json({
            message: "Enter your current password and both new password fields.",
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            message: "New password must contain at least 6 characters.",
        });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: "New passwords do not match." });
    }

    try {
        await authService.changePassword({
            userId: req.user.id,
            currentPassword,
            newPassword,
        });

        res.clearCookie("session", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });
        passwordChangeRateLimiter.reset(req.user.id);

        return res.status(200).json({
            message: "Password changed. Please sign in with your new password.",
        });
    } catch (error) {
        if (error.code === "CURRENT_PASSWORD_INCORRECT" ||
            error.code === "SAME_PASSWORD") {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === "ACCOUNT_NOT_FOUND") {
            return res.status(404).json({ message: "Account not found." });
        }

        console.error("Password change failed:", error.code || "UNKNOWN");
        return res.status(500).json({ message: "Unable to change password right now." });
    }
};

module.exports = {
    login,
    logout,
    changePassword,
};
