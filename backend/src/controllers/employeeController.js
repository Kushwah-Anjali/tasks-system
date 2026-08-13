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

module.exports = {
  getAllEmployees,
};