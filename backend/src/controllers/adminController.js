const adminService = require("../services/adminService");
const passwordChangeRateLimiter = require("../middleware/passwordChangeRateLimiter");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isAtLeastEighteen = (value) => {
  const today = new Date();
  const birthDate = new Date(`${value}T00:00:00.000Z`);
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDifference < 0 ||
      (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age >= 18;
};

const listAccounts = async (req, res) => {
  try {
    const accounts = await adminService.getAccounts();
    return res.status(200).json({ accounts });
  } catch (error) {
    console.error("List managed accounts failed:", error.code || "UNKNOWN");
    return res.status(500).json({ message: "Unable to load accounts." });
  }
};

const createAccount = async (req, res) => {
  const body = req.body || {};
  const { role } = body;

  if (role !== "manager" && role !== "employee") {
    return res.status(400).json({
      message: "Role must be manager or employee.",
    });
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body.password;

  if (!fullName || fullName.length > 100 || !email || email.length > 255 || !emailPattern.test(email)) {
    return res.status(400).json({ message: "Enter a valid name and email address." });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must contain at least 6 characters." });
  }

  try {
    if (role === "manager") {
      await adminService.createManager({ fullName, email, password });
    } else {
      const {
        phone,
        confirm_password: confirmPassword,
        date_of_birth: dateOfBirth,
        department_id: departmentId,
        designation,
        joining_date: joiningDate,
      } = body;

      if (
        typeof phone !== "string" || !/^\d{10}$/.test(phone) ||
        typeof confirmPassword !== "string" || confirmPassword !== password ||
        !isValidDate(dateOfBirth) || !isAtLeastEighteen(dateOfBirth) ||
        !Number.isSafeInteger(Number(departmentId)) || Number(departmentId) <= 0 ||
        typeof designation !== "string" || !designation.trim() || designation.trim().length > 100 ||
        !isValidDate(joiningDate)
      ) {
        return res.status(400).json({
          message: "Enter all required employee details with a matching password and valid dates, phone number, and department.",
        });
      }

      await adminService.createEmployee({
        fullName,
        email,
        phone,
        password,
        dateOfBirth,
        departmentId: Number(departmentId),
        designation: designation.trim(),
        joiningDate,
      });
    }

    return res.status(201).json({ message: `${role === "manager" ? "Manager" : "Employee"} account created successfully.` });
  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL" || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    if (error.code === "INVALID_DEPARTMENT" || error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Selected department does not exist." });
    }

    console.error("Create managed account failed:", error.code || "UNKNOWN");
    return res.status(500).json({ message: "Unable to create this account." });
  }
};

const setAccountActive = async (req, res) => {
  const userId = Number(req.params.userId);
  const body = req.body || {};

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "Valid user id is required." });
  }

  if (Object.prototype.hasOwnProperty.call(body, "role")) {
    return res.status(400).json({ message: "Account roles cannot be changed." });
  }

  if (typeof body.isActive !== "boolean") {
    return res.status(400).json({ message: "isActive must be true or false." });
  }

  try {
    const account = await adminService.setAccountActive(userId, body.isActive);
    if (!account) {
      return res.status(404).json({ message: "Manager or employee account not found." });
    }

    return res.status(200).json({
      message: body.isActive ? "Account activated." : "Account deactivated.",
    });
  } catch (error) {
    console.error("Set account status failed:", error.code || "UNKNOWN");
    return res.status(500).json({ message: "Unable to update account status." });
  }
};

const resetAccountPassword = async (req, res) => {
  const targetUserId = Number(req.params.userId);
  const body = req.body || {};

  if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: "Valid account id is required." });
  }

  if (["userId", "user_id", "adminUserId", "targetUserId"].some((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  )) {
    return res.status(400).json({ message: "The admin account is determined by your signed-in session." });
  }

  const { currentPassword, newPassword, confirmNewPassword } = body;
  if (typeof currentPassword !== "string" || !currentPassword ||
      typeof newPassword !== "string" || !newPassword ||
      typeof confirmNewPassword !== "string" || !confirmNewPassword) {
    return res.status(400).json({ message: "Enter your current password and both temporary password fields." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Temporary password must contain at least 6 characters." });
  }
  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: "Temporary passwords do not match." });
  }

  try {
    await adminService.resetAccountPassword({
      adminUserId: req.user.id,
      targetUserId,
      currentPassword,
      newPassword,
    });
    passwordChangeRateLimiter.reset(req.user.id);

    return res.status(200).json({ message: "Password reset successfully. Share the temporary password privately." });
  } catch (error) {
    if (error.code === "ADMIN_PASSWORD_INCORRECT") {
      return res.status(400).json({ message: "Your current password is incorrect." });
    }
    if (error.code === "TARGET_ACCOUNT_NOT_FOUND") {
      return res.status(404).json({ message: "Manager or employee account not found." });
    }

    console.error("Managed account password reset failed:", error.code || "UNKNOWN");
    return res.status(500).json({ message: "Unable to reset this account password." });
  }
};

module.exports = {
  listAccounts,
  createAccount,
  setAccountActive,
  resetAccountPassword,
};
