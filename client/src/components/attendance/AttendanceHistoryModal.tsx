import { useEffect, useState } from "react";
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Timer,
    UserRound,
    XCircle,
} from "lucide-react";

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

const formatTime = (value: string | null): string =>
    value ? value.slice(0, 5) : "—";

const statusConfig = {
    present: {
        label: "Present",
        className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    },
    absent: {
        label: "Absent",
        className: "bg-red-50 text-red-700 ring-1 ring-red-200",
    },
    half_day: {
        label: "Half Day",
        className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    },
};

export default function AttendanceHistoryModal({
    employee,
    onClose,
}: AttendanceHistoryModalProps) {
    const [selectedMonth, setSelectedMonth] =
        useState(getCurrentMonth());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
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

    const summaryCards = [
        {
            label: "Present",
            value: summary.present,
            icon: CheckCircle2,
            className: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
        },
        {
            label: "Absent",
            value: summary.absent,
            icon: XCircle,
            className: "border-red-200 bg-red-50/70 text-red-700",
        },
        {
            label: "Half Day",
            value: summary.half_day,
            icon: Timer,
            className: "border-amber-200 bg-amber-50/70 text-amber-700",
        },
        {
            label: "Late",
            value: summary.late,
            icon: Clock3,
            className: "border-orange-200 bg-orange-50/70 text-orange-700",
        },
        {
            label: "Marked Days",
            value: summary.total_marked_days,
            icon: CalendarDays,
            className: "border-blue-200 bg-blue-50/70 text-blue-700",
        },
    ];

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
            <div className="flex max-h-[72vh] flex-col gap-5 overflow-y-auto pr-1">
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <UserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0F172A]">
                                {employee?.fullName || "Employee"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#64748B]">
                                {employee?.department || "No department"}
                                {employee?.designation
                                    ? ` • ${employee.designation}`
                                    : ""}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="attendanceHistoryMonth"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Month
                    </label>
                    <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                        <input
                            id="attendanceHistoryMonth"
                            type="month"
                            value={selectedMonth}
                            max={getCurrentMonth()}
                            onChange={(event) =>
                                setSelectedMonth(event.target.value)
                            }
                            className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                        />
                    </div>
                </div>

                {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {summaryCards.map(
                        ({ label, value, icon: Icon, className }) => (
                            <div
                                key={label}
                                className={`rounded-xl border p-3 ${className}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold">
                                        {label}
                                    </p>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <p className="mt-2 text-2xl font-bold">
                                    {value}
                                </p>
                            </div>
                        )
                    )}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-[#E2E8F0] sm:block">
                    <table className="w-full min-w-[660px] text-left">
                        <thead>
                            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                                {["Date", "Status", "Late", "Late Time", "Marked By"].map(
                                    (heading) => (
                                        <th
                                            key={heading}
                                            className="px-3 py-2.5 text-xs font-semibold text-[#64748B]"
                                        >
                                            {heading}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-3 py-8 text-center text-sm text-[#64748B]"
                                    >
                                        Loading history...
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-3 py-8 text-center text-sm text-[#64748B]"
                                    >
                                        No attendance recorded for this month.
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => {
                                    const status = statusConfig[record.status];

                                    return (
                                        <tr
                                            key={record.id}
                                            className="border-b border-[#E2E8F0] last:border-none"
                                        >
                                            <td className="px-3 py-3 text-xs font-medium text-[#334155]">
                                                {formatDate(record.attendance_date)}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-[#334155]">
                                                {record.is_late === 1 ? (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-orange-700">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        Yes
                                                    </span>
                                                ) : (
                                                    "No"
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-[#334155]">
                                                {formatTime(record.late_time)}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-[#334155]">
                                                {record.marked_by_name || "—"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 sm:hidden">
                    {isLoading ? (
                        <div className="rounded-xl border border-[#E2E8F0] p-5 text-center text-sm text-[#64748B]">
                            Loading history...
                        </div>
                    ) : records.length === 0 ? (
                        <div className="rounded-xl border border-[#E2E8F0] p-5 text-center text-sm text-[#64748B]">
                            No attendance recorded for this month.
                        </div>
                    ) : (
                        records.map((record) => {
                            const status = statusConfig[record.status];

                            return (
                                <div
                                    key={record.id}
                                    className="rounded-xl border border-[#E2E8F0] bg-white p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-[#0F172A]">
                                            {formatDate(record.attendance_date)}
                                        </p>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                                        >
                                            {status.label}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <p className="text-[#94A3B8]">Late</p>
                                            <p className="mt-1 font-medium text-[#334155]">
                                                {record.is_late === 1 ? "Yes" : "No"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[#94A3B8]">Late time</p>
                                            <p className="mt-1 font-medium text-[#334155]">
                                                {formatTime(record.late_time)}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[#94A3B8]">Marked by</p>
                                            <p className="mt-1 font-medium text-[#334155]">
                                                {record.marked_by_name || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Modal>
    );
}
