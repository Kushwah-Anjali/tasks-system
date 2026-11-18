import api from "./api";

import type {
    NotificationsResponse,
} from "../types/notification";

export const getNotifications =
    async (): Promise<NotificationsResponse> => {
        const response =
            await api.get<NotificationsResponse>(
                "/notifications"
            );

        return response.data;
    };

export const markNotificationRead =
    async (
        notificationId: number
    ): Promise<void> => {
        await api.patch(
            `/notifications/${notificationId}/read`
        );
    };

export const markAllNotificationsRead =
    async (): Promise<void> => {
        await api.patch(
            "/notifications/read-all"
        );
    };