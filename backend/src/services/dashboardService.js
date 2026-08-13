const db = require("../config/db");

const getDashboardStats = async () => {
  const [result] = await db.promise().query(`
    SELECT COUNT(*) AS totalEmployees
    FROM employees
  `);

  return {
    totalEmployees: result[0].totalEmployees,
  };
};

module.exports = {
  getDashboardStats,
};