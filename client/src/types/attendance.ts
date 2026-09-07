export type AttendanceStatus =
    | "present"
    | "absent"
    | "half_day";

export type AttendanceLateFlag = 0 | 1;

export interface AttendanceDraft {
    status: AttendanceStatus | null;
    isLate: boolean;
    lateTime: string;
    hasExistingRecord: boolean;
}

export interface AttendanceEmployee {
    employeeId: number;
    fullName: string;
    email: string;
    department: string | null;
    designation: string | null;
}

export interface AttendanceRecord {
    id: number;
    employee_id: number;
    attendance_date: string;
    status: AttendanceStatus;
    is_late: AttendanceLateFlag;
    late_time: string | null;
    marked_by: number | null;
    marked_by_name?: string | null;
}

export interface DailyAttendanceRecord {
    employee_id: number;
    full_name: string;
    email: string;
    department: string | null;
    designation: string | null;
    attendance_id: number | null;
    attendance_date: string | null;
    status: AttendanceStatus | null;
    is_late: AttendanceLateFlag | null;
    late_time: string | null;
    marked_by: number | null;
    marked_by_name: string | null;
}

export interface MarkAttendanceRequest {
    employeeId: number;
    attendanceDate: string;
    status: AttendanceStatus;
    isLate: boolean;
    lateTime?: string | null;
}

export interface MarkAttendanceResponse {
    message: string;
    attendance: AttendanceRecord;
}

export interface DailyAttendanceResponse {
    attendance: DailyAttendanceRecord[];
}

export interface EmployeeMonthlyAttendanceResponse {
    attendance: AttendanceRecord[];
}

export interface EmployeeMonthlyAttendanceSummary {
    present: number;
    absent: number;
    half_day: number;
    late: number;
    total_marked_days: number;
}

export interface EmployeeMonthlyAttendanceSummaryResponse {
    summary: EmployeeMonthlyAttendanceSummary;
}
