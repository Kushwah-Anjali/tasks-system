const authService = require("../services/authService");

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.cookie("session", result.sessionToken, {
      httpOnly: true,
      secure: false, // true in production with HTTPS
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
const logout = async (req, res) => {
  try {
    const sessionToken = req.cookies.session;

    if (sessionToken) {
      await authService.logout(sessionToken);
    }

    res.clearCookie("session", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
module.exports = {
  register,
  login,
  logout,
};
