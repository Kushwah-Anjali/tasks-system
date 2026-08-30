import api from "./api";

import type {
    AttendanceRecord,
    MonthlyAttendanceSummary,
} from "../types/attendance";

interface TodayAttendanceResponse {
    attendance: AttendanceRecord | null;
}

interface MonthlySummaryResponse {
    summary: MonthlyAttendanceSummary;
}

interface MessageResponse {
    message: string;
}

export const getTodayAttendance =
    async (): Promise<
        AttendanceRecord | null
    > => {
        const response =
            await api.get<TodayAttendanceResponse>(
                "/attendance/today"
            );

        return response.data.attendance;
    };

export const getMonthlySummary =
    async (): Promise<MonthlyAttendanceSummary> => {
        const response =
            await api.get<MonthlySummaryResponse>(
                "/attendance/monthly-summary"
            );

        return response.data.summary;
    };

export const checkIn =
    async (): Promise<MessageResponse> => {
        const response =
            await api.post<MessageResponse>(
                "/attendance/check-in"
            );

        return response.data;
    };

export const checkOut =
    async (): Promise<MessageResponse> => {
        const response =
            await api.post<MessageResponse>(
                "/attendance/check-out"
            );

        return response.data;
    };