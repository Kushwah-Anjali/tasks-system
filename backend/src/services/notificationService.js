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
                n.id,
                n.user_id,
                n.type,
                n.title,
                n.message,
                n.reference_id,
                n.link,
                n.is_read,
                n.read_at,
                n.created_at,
                assignment_link.id AS lead_assignment_id,
                assignment_link.ended_at AS lead_assignment_ended_at
             FROM notifications n
             LEFT JOIN lead_assignments assignment_link ON assignment_link.id = (
                SELECT a.id FROM lead_assignments a
                 WHERE a.lead_id = n.reference_id AND a.user_id = n.user_id
                   AND a.started_at <= n.created_at
                 ORDER BY a.started_at DESC, a.id DESC LIMIT 1
             )
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC
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
        notifications: notifications.map((notification) => ({
            ...notification,
            link: notification.type?.startsWith("lead_") && notification.reference_id && notification.lead_assignment_id
                ? notification.lead_assignment_ended_at
                    ? `/employee-leads/${notification.reference_id}/history/${notification.lead_assignment_id}`
                    : `/employee-leads/${notification.reference_id}`
                : notification.link,
        })),
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
