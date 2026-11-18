export interface AppNotification {
    id: number;
    user_id: number;

    type: string;

    title: string;
    message: string | null;

    reference_id: number | null;
    link: string | null;

    is_read: 0 | 1;

    read_at: string | null;
    created_at: string;
}

export interface NotificationsResponse {
    notifications: AppNotification[];
    unreadCount: number;
}