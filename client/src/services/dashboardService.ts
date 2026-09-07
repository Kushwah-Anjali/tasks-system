import api from "./api";

export interface DashboardStats {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    openTasks: number;
}

export type RecentAttendanceStatus =
    | "present"
    | "absent"
    | "half_day";

export interface RecentAttendanceRecord {
    id: number;
    employee_id: number;
    attendance_date: string;
    status: RecentAttendanceStatus;
    is_late: 0 | 1;
    late_time: string | null;
    full_name: string;
    designation: string | null;
    marked_by_name: string | null;
}

interface RecentAttendanceResponse {
    attendance: RecentAttendanceRecord[];
}

export const getDashboardStats =
    async (): Promise<DashboardStats> => {
        const response =
            await api.get<DashboardStats>(
                "/dashboard/stats"
            );

        return response.data;
    };

export const getRecentAttendance =
    async (): Promise<RecentAttendanceRecord[]> => {
        const response =
            await api.get<RecentAttendanceResponse>(
                "/dashboard/recent-attendance"
            );

        return response.data.attendance;
    };
