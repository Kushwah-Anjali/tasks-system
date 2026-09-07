const attendanceManagerMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required",
        });
    }

    if (!req.user.can_manage_attendance) {
        return res.status(403).json({
            message: "You do not have permission to manage attendance",
        });
    }

    next();
};

module.exports = attendanceManagerMiddleware;