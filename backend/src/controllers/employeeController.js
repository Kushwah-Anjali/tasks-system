const employeeService = require("../services/employeeService");

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

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

const createEmployee = async (req, res) => {
  const body = req.body || {};
  if (
    Object.prototype.hasOwnProperty.call(body, "role") &&
    body.role !== "employee"
  ) {
    return res.status(403).json({
      message: "Managers can only create employee accounts.",
    });
  }

  const {
    full_name: fullName,
    email,
    phone,
    password,
    confirm_password: confirmPassword,
    date_of_birth: dateOfBirth,
    department_id: departmentId,
    designation,
    joining_date: joiningDate,
  } = body;

  if (
    typeof fullName !== "string" || !fullName.trim() ||
    fullName.trim().length > 100 ||
    typeof email !== "string" || !email.trim() ||
    email.trim().length > 255 ||
    typeof phone !== "string" || !/^\d{10}$/.test(phone) ||
    typeof password !== "string" || password.length < 6 ||
    typeof confirmPassword !== "string" || confirmPassword !== password ||
    !isValidDate(dateOfBirth) ||
    !isAtLeastEighteen(dateOfBirth) ||
    !Number.isSafeInteger(Number(departmentId)) || Number(departmentId) <= 0 ||
    typeof designation !== "string" || !designation.trim() ||
    designation.trim().length > 100 ||
    !isValidDate(joiningDate)
  ) {
    return res.status(400).json({
      message: "Enter all required employee details with a matching password and valid dates, phone number, and department.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  try {
    const result = await employeeService.createEmployee({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone,
      password,
      dateOfBirth,
      departmentId: Number(departmentId),
      designation: designation.trim(),
      joiningDate,
    });

    return res.status(201).json({
      message: "Employee created successfully.",
      registrationNumber: result.registrationNumber,
    });
  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL" || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }
    if (error.code === "INVALID_DEPARTMENT" || error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Selected department does not exist." });
    }

    console.error("Create employee error:", error.code || "UNKNOWN");
    return res.status(500).json({
      message: "Unable to create employee. Please try again.",
    });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const employees = await employeeService.getAllEmployees();

    res.status(200).json({
      employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    res.status(500).json({
      message: "Unable to retrieve employee records.",
    });
  }
};
const updateAttendancePermission = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { canManageAttendance } = req.body;

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Valid user id is required",
      });
    }

    if (typeof canManageAttendance !== "boolean") {
      return res.status(400).json({
        message: "canManageAttendance must be true or false",
      });
    }

    const result =
      await employeeService.updateAttendancePermission(
        userId,
        canManageAttendance
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Attendance permission updated successfully",
    });
  } catch (error) {
    console.error("Attendance permission error:", error);

    res.status(500).json({
      message: "Unable to update attendance permission",
    });
  }
};
const updateEmployee = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {

      return res.status(400).json({
        message: "Valid user id is required.",
      });
    }

    const body = req.body || {};
    if (
      Object.prototype.hasOwnProperty.call(body, "role") &&
      body.role !== "employee"
    ) {
      return res.status(403).json({
        message: "Employee roles cannot be changed through this endpoint.",
      });
    }

    const {
      fullName,
      email,
      phone = null,
      registrationNumber,
      dateOfBirth = null,
      departmentId = null,
      designation = null,
      joiningDate = null,
      isActive,
    } = body;

    if (
      typeof fullName !== "string" || !fullName.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof registrationNumber !== "string" || !registrationNumber.trim()
    ) {
      return res.status(400).json({
        message:
          "Full name, email and registration number are required.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false.",
      });
    }

    if (
      departmentId !== null &&
      (!Number.isInteger(Number(departmentId)) ||
        Number(departmentId) <= 0)
    ) {
      return res.status(400).json({
        message: "Invalid department id.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    for (const value of [dateOfBirth, joiningDate]) {
      if (value === null || value === "") continue;
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value ||
          Number(value.slice(0, 4)) < 1000) {
        return res.status(400).json({ message: "Dates must be valid YYYY-MM-DD values." });
      }
    }
    if ([phone, designation].some(value => value !== null && typeof value !== "string")) {
      return res.status(400).json({ message: "Phone and designation must be text." });
    }

    const employee = await employeeService.updateEmployee(
      userId,
      {
        fullName: fullName.trim(),
        email: email.trim(),
        phone:
          typeof phone === "string" && phone.trim()
            ? phone.trim()
            : null,
        registrationNumber: registrationNumber.trim(),
        dateOfBirth: dateOfBirth || null,
        departmentId:
          departmentId === null ? null : Number(departmentId),
        designation:
          typeof designation === "string" && designation.trim()
            ? designation.trim()
            : null,
        joiningDate: joiningDate || null,
        isActive,
      }
    );

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    res.status(200).json({
      message: "Employee updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Email or registration number already exists.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Selected department does not exist." });
    }
    res.status(500).json({
      message: "Unable to update employee.",
    });
  }
};

const deactivateEmployee = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Valid user id is required.",
      });
    }

    const employee =
      await employeeService.deactivateEmployee(userId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee account not found.",
      });
    }

    return res.status(200).json({
      message: "Employee deactivated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Deactivate employee error:", error.code || "UNKNOWN");
    return res.status(500).json({ message: "Unable to deactivate employee." });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  updateAttendancePermission,
  updateEmployee,
  deactivateEmployee,
};
