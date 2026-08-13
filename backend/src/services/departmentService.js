const db = require("../config/db");

const getAllDepartments = async () => {
  const [departments] = await db.promise().query(
    "SELECT id, name FROM departments ORDER BY name ASC"
  );

  return departments;
};

module.exports = {
  getAllDepartments,
};