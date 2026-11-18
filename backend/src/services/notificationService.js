const db = require("../config/db");

const getNotifications = async (
    userId,
    limit = 20
) => {
    const safeLimit = Math.min(
        50,
        Math.max(1, Number(limit) || 20)
    );

    const [notifications] =
        await db.promise().query(
            `SELECT
                id,
                user_id,
                type,
                title,
                message,
                reference_id,
                link,
                is_read,
                read_at,
                created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, safeLimit]
        );

    const [[countResult]] =
        await db.promise().query(
            `SELECT COUNT(*) AS unreadCount
             FROM notifications
             WHERE user_id = ?
               AND is_read = 0`,
            [userId]
        );

    return {
        notifications,
        unreadCount:
            Number(countResult.unreadCount) || 0,
    };
};

const markAsRead = async (
    notificationId,
    userId
) => {
    const [result] =
        await db.promise().query(
            `UPDATE notifications
             SET
                is_read = 1,
                read_at = NOW()
             WHERE id = ?
               AND user_id = ?`,
            [notificationId, userId]
        );

    return result;
};

const markAllAsRead = async (userId) => {
    const [result] =
        await db.promise().query(
            `UPDATE notifications
             SET
                is_read = 1,
                read_at = NOW()
             WHERE user_id = ?
               AND is_read = 0`,
            [userId]
        );

    return result;
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
};