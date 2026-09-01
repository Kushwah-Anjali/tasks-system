import api from "./api";

export interface DashboardStats {
    totalEmployees: number;
    presentToday: number;
    onLeave: number;
    openTasks: number;
}

export type RecentAttendanceStatus = "present" | "late" | "absent";

export interface RecentAttendanceRecord {
    id: number;
    employee_id: number;
    attendance_date: string;
    check_in: string | null;
    check_out: string | null;
    status: RecentAttendanceStatus;
    full_name: string;
    designation: string | null;
}

interface RecentAttendanceResponse {
    attendance: RecentAttendanceRecord[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>("/dashboard/stats");
    return response.data;
};

export const getRecentAttendance = async (): Promise<RecentAttendanceRecord[]> => {
    const response = await api.get<RecentAttendanceResponse>(
        "/dashboard/recent-attendance"
    );

    return response.data.attendance;
};
