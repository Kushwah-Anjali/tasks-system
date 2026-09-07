import api from "./api";

import type {
    AttendanceRecord,
    DailyAttendanceRecord,
    DailyAttendanceResponse,
    EmployeeMonthlyAttendanceResponse,
    EmployeeMonthlyAttendanceSummary,
    EmployeeMonthlyAttendanceSummaryResponse,
    MarkAttendanceRequest,
    MarkAttendanceResponse,
} from "../types/attendance";

export const markAttendance = async (
    attendance: MarkAttendanceRequest
): Promise<AttendanceRecord> => {
    const response =
        await api.post<MarkAttendanceResponse>(
            "/attendance",
            attendance
        );

    return response.data.attendance;
};

export const getDailyAttendance = async (
    date: string
): Promise<DailyAttendanceRecord[]> => {
    const response =
        await api.get<DailyAttendanceResponse>(
            "/attendance/daily",
            { params: { date } }
        );

    return response.data.attendance;
};

export const getEmployeeAttendance = async (
    employeeId: number,
    year: number,
    month: number
): Promise<AttendanceRecord[]> => {
    const response =
        await api.get<EmployeeMonthlyAttendanceResponse>(
            `/attendance/employee/${employeeId}`,
            { params: { year, month } }
        );

    return response.data.attendance;
};

export const getEmployeeAttendanceSummary = async (
    employeeId: number,
    year: number,
    month: number
): Promise<EmployeeMonthlyAttendanceSummary> => {
    const response =
        await api.get<EmployeeMonthlyAttendanceSummaryResponse>(
            `/attendance/employee/${employeeId}/summary`,
            { params: { year, month } }
        );

    return response.data.summary;
};
