const notificationService =
    require("../services/notificationService");

const getNotifications = async (
    req,
    res
) => {
    try {
        const result =
            await notificationService.getNotifications(
                req.user.id
            );

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Get notifications error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to load notifications",
        });
    }
};

const markAsRead = async (
    req,
    res
) => {
    try {
        const notificationId =
            Number(req.params.id);

        if (
            !Number.isInteger(notificationId) ||
            notificationId <= 0
        ) {
            return res.status(400).json({
                message:
                    "Invalid notification id",
            });
        }

        const result =
            await notificationService.markAsRead(
                notificationId,
                req.user.id
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message:
                    "Notification not found",
            });
        }

        return res.status(200).json({
            message:
                "Notification marked as read",
        });
    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to update notification",
        });
    }
};

const markAllAsRead = async (
    req,
    res
) => {
    try {
        await notificationService.markAllAsRead(
            req.user.id
        );

        return res.status(200).json({
            message:
                "Notifications marked as read",
        });
    } catch (error) {
        console.error(
            "Mark all notifications error:",
            error
        );

        return res.status(500).json({
            message:
                "Unable to update notifications",
        });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
};