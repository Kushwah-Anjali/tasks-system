const departmentService = require("../services/departmentService");

const getDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getAllDepartments();

    res.status(200).json({
      data: departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    res.status(500).json({
      message: "Unable to retrieve departments.",
    });
  }
};

module.exports = {
  getDepartments,
};