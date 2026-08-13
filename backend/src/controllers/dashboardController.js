const dashboardService = require("../services/dashboardService");

const getDashboardStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();

    res.status(200).json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      message: "Unable to load dashboard statistics.",
    });
  }
};

module.exports = {
  getDashboardStats,
};