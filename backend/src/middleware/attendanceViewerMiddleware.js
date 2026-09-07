const attendanceViewerMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required",
        });
    }

    const canViewAttendance =
        req.user.role === "manager" ||
        req.user.can_manage_attendance === true;

    if (!canViewAttendance) {
        return res.status(403).json({
            message: "You do not have permission to view attendance",
        });
    }

    next();
};

module.exports = attendanceViewerMiddleware;
