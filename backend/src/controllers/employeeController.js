const employeeService = require("../services/employeeService");

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

    if (!userId) {
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
module.exports = {
  getAllEmployees,
  updateAttendancePermission,
};