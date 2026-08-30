export type AttendanceStatus =
    | "present"
    | "late"
    | "absent";

export interface AttendanceRecord {
    id: number;
    attendance_date: string;
    check_in: string | null;
    check_out: string | null;
    status: AttendanceStatus;
}

export interface MonthlyAttendanceSummary {
    present: number;
    late: number;
    absent: number;
    attendancePercentage: number;
}