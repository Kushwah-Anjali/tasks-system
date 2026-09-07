import { useEffect, useState } from "react";

import {
    getEmployeeAttendance,
    getEmployeeAttendanceSummary,
} from "../../services/attendanceService";
import type {
    AttendanceRecord,
    AttendanceEmployee,
    EmployeeMonthlyAttendanceSummary,
} from "../../types/attendance";
import Modal from "../tasks/Modal";

interface AttendanceHistoryModalProps {
    employee: AttendanceEmployee | null;
    onClose: () => void;
}

const emptySummary: EmployeeMonthlyAttendanceSummary = {
    present: 0,
    absent: 0,
    half_day: 0,
    late: 0,
    total_marked_days: 0,
};

const getCurrentMonth = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;

    return new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 7);
};

const formatDate = (value: string): string => {
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const statusLabel = {
    present: "Present",
    absent: "Absent",
    half_day: "Half Day",
};

export default function AttendanceHistoryModal({
    employee,
    onClose,
}: AttendanceHistoryModalProps) {
    const [selectedMonth, setSelectedMonth] =
        useState(getCurrentMonth());
    const [records, setRecords] = useState<
        AttendanceRecord[]
    >([]);
    const [summary, setSummary] =
        useState(emptySummary);
    const [isLoading, setIsLoading] =
        useState(false);
    const [errorMessage, setErrorMessage] =
        useState("");

    useEffect(() => {
        if (!employee) return;

        let isActive = true;
        const [year, month] = selectedMonth
            .split("-")
            .map(Number);

        setIsLoading(true);
        setErrorMessage("");

        Promise.all([
            getEmployeeAttendance(
                employee.employeeId,
                year,
                month
            ),
            getEmployeeAttendanceSummary(
                employee.employeeId,
                year,
                month
            ),
        ])
            .then(([attendance, attendanceSummary]) => {
                if (!isActive) return;
                setRecords(attendance);
                setSummary(attendanceSummary);
            })
            .catch(() => {
                if (!isActive) return;
                setRecords([]);
                setSummary(emptySummary);
                setErrorMessage(
                    "Unable to load attendance history."
                );
            })
            .finally(() => {
                if (isActive) setIsLoading(false);
            });

        return () => {
            isActive = false;
        };
    }, [employee, selectedMonth]);

    return (
        <Modal
            open={Boolean(employee)}
            title={
                employee
                    ? `${employee.fullName} — Attendance History`
                    : "Attendance History"
            }
            onClose={onClose}
        >
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="attendanceHistoryMonth"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Month
                    </label>
                    <input
                        id="attendanceHistoryMonth"
                        type="month"
                        value={selectedMonth}
                        max={getCurrentMonth()}
                        onChange={(event) =>
                            setSelectedMonth(event.target.value)
                        }
                        className="h-11 rounded-xl border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                </div>

                {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                    {[
                        ["Present", summary.present],
                        ["Absent", summary.absent],
                        ["Half Day", summary.half_day],
                        ["Late", summary.late],
                        ["Total Marked", summary.total_marked_days],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"
                        >
                            <p className="text-xs font-medium text-[#64748B]">
                                {label}
                            </p>
                            <p className="mt-1 text-xl font-bold text-[#0F172A]">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                    <table className="w-full min-w-[390px] text-left">
                        <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                                <th className="px-3 py-2 text-xs font-semibold text-[#64748B]">Date</th>
                                <th className="px-3 py-2 text-xs font-semibold text-[#64748B]">Status</th>
                                <th className="px-3 py-2 text-xs font-semibold text-[#64748B]">Late</th>
                                <th className="px-3 py-2 text-xs font-semibold text-[#64748B]">Late Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-[#64748B]">
                                        Loading history...
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-[#64748B]">
                                        No attendance recorded for this month.
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="border-b border-[#E2E8F0] last:border-none">
                                        <td className="px-3 py-2.5 text-xs text-[#334155]">
                                            {formatDate(record.attendance_date)}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs font-medium text-[#0F172A]">
                                            {statusLabel[record.status]}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-[#334155]">
                                            {record.is_late === 1 ? "Yes" : "No"}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-[#334155]">
                                            {record.late_time || "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}
