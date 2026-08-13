const attendanceService = require("../services/attendanceService");

const checkIn = async (req, res) => {
  try {
    const result = await attendanceService.checkIn(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const checkOut = async (req, res) => {
  try {
    const result = await attendanceService.checkOut(req.user.id);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const attendance =
      await attendanceService.getTodayAttendance(req.user.id);

    res.status(200).json({
      attendance,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
const getWeeklyAttendance = async (req, res) => {
  try {
    const attendance =
      await attendanceService.getWeeklyAttendance(req.user.id);

    res.status(200).json({
      attendance,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
const getMonthlySummary = async (req, res) => {
  try {
    const summary =
      await attendanceService.getMonthlySummary(req.user.id);

    res.status(200).json({
      summary,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
const getMonthlyAttendance = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    const attendance = await attendanceService.getMonthlyAttendance(
      req.user.id,
      year,
      month
    );

    res.status(200).json({
      attendance,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getWeeklyAttendance,
  getMonthlySummary,
  getMonthlyAttendance,
};
