const attendanceService = require("../services/attendanceService");
const getIndiaToday = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return `${year}-${month}-${day}`;
};
const markAttendance = async (req, res) => {
  try {
    const {
      employeeId,
      attendanceDate,
      status,
      isLate,
      lateTime,
    } = req.body;

    if (!employeeId || !attendanceDate || !status) {
      return res.status(400).json({
        message: "employeeId, attendanceDate and status are required",
      });
    }
const today = getIndiaToday();
if (attendanceDate > today) {
  return res.status(400).json({
    message: "Attendance cannot be marked for a future date",
  });
}
    const allowedStatuses = [
      "present",
      "absent",
      "half_day",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid attendance status",
      });
    }

    const attendance = await attendanceService.markAttendance({
      employeeId,
      attendanceDate,
      status,
      isLate: Boolean(isLate),
      lateTime,
      markedBy: req.user.id,
    });

    res.status(200).json({
      message: "Attendance saved successfully",
      attendance,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};


const getDailyAttendance = async (req, res) => {
  try {
    const attendanceDate = req.query.date;

    if (!attendanceDate) {
      return res.status(400).json({
        message: "date is required",
      });
    }

    const today = getIndiaToday();

    if (attendanceDate > today) {
      return res.status(400).json({
        message: "Attendance cannot be viewed for a future date",
      });
    }

    const attendance =
      await attendanceService.getDailyAttendance(
        attendanceDate
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


const getEmployeeAttendance = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!employeeId || !year || !month) {
      return res.status(400).json({
        message:
          "employeeId, year and month are required",
      });
    }

    const attendance =
      await attendanceService.getEmployeeAttendance(
        employeeId,
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
const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!employeeId || !year || !month) {
      return res.status(400).json({
        message: "employeeId, year and month are required",
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        message: "Month must be between 1 and 12",
      });
    }

    const summary =
      await attendanceService.getEmployeeAttendanceSummary(
        employeeId,
        year,
        month
      );

    res.status(200).json({
      summary,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  markAttendance,
  getDailyAttendance,
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
};