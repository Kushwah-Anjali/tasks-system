const dashboardService = require("../services/dashboardService");

const getDashboardStats = async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats();
        return res.status(200).json(stats);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({
            message: "Unable to load dashboard statistics",
        });
    }
};

const getRecentAttendance = async (req, res) => {
    try {
        const attendance = await dashboardService.getRecentAttendance(5);

        return res.status(200).json({ attendance });
    } catch (error) {
        console.error("Recent attendance error:", error);
        return res.status(500).json({
            message: "Unable to load recent attendance",
        });
    }
};

module.exports = {
    getDashboardStats,
    getRecentAttendance,
};
