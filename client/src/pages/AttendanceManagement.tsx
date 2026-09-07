import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import AttendanceDateSelector from "../components/attendance/AttendanceDateSelector";
import AttendanceHistoryModal from "../components/attendance/AttendanceHistoryModal";
import AttendanceTable from "../components/attendance/AttendanceTable";
import DashboardLayout from "../components/layout/DashboardLayout";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import {
    getDailyAttendance,
    markAttendance,
} from "../services/attendanceService";
import type {
    AttendanceDraft,
    AttendanceEmployee,
    AttendanceStatus,
} from "../types/attendance";
import { getCurrentUser } from "../utils/authStorage";

const getTodayIso = (): string => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60_000;

    return new Date(today.getTime() - offset)
        .toISOString()
        .slice(0, 10);
};

const emptyEntry = (): AttendanceDraft => ({
    status: null,
    isLate: false,
    lateTime: "",
    hasExistingRecord: false,
});

export default function AttendanceManagement() {
    const user = getCurrentUser();
    const today = getTodayIso();
    const [selectedDate, setSelectedDate] =
        useState(today);
    const [employees, setEmployees] = useState<
        AttendanceEmployee[]
    >([]);
    const [entries, setEntries] = useState<
        Record<number, AttendanceDraft>
    >({});
    const [isLoading, setIsLoading] =
        useState(true);
    const [savingEmployeeId, setSavingEmployeeId] =
        useState<number | null>(null);
    const [historyEmployee, setHistoryEmployee] =
        useState<AttendanceEmployee | null>(null);
    const [successMessage, setSuccessMessage] =
        useState("");
    const [errorMessage, setErrorMessage] =
        useState("");

    const loadAttendance = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const dailyAttendance =
                await getDailyAttendance(selectedDate);

            const attendanceEmployees =
                dailyAttendance.map((record) => ({
                    employeeId: record.employee_id,
                    fullName: record.full_name,
                    email: record.email,
                    department: record.department,
                    designation: record.designation,
                }));
            const attendanceByEmployee = new Map(
                dailyAttendance.map((record) => [
                    record.employee_id,
                    record,
                ])
            );
            const nextEntries: Record<
                number,
                AttendanceDraft
            > = {};

            attendanceEmployees.forEach((employee) => {
                const attendance =
                    attendanceByEmployee.get(
                        employee.employeeId
                    );

                nextEntries[employee.employeeId] =
                    attendance?.attendance_id
                        ? {
                              status: attendance.status,
                              isLate:
                                  attendance.is_late === 1,
                              lateTime:
                                  attendance.late_time?.slice(
                                      0,
                                      5
                                  ) ?? "",
                              hasExistingRecord: true,
                          }
                        : emptyEntry();
            });

            setEmployees(attendanceEmployees);
            setEntries(nextEntries);
        } catch {
            setEmployees([]);
            setEntries({});
            setErrorMessage(
                "Unable to load attendance. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        void loadAttendance();
    }, [loadAttendance]);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const hasEditPermission =
        user.can_manage_attendance === true;
    const canEdit =
        hasEditPermission && selectedDate <= today;

    const updateEntry = (
        employeeId: number,
        changes: Partial<AttendanceDraft>
    ) => {
        if (!canEdit) return;

        setEntries((currentEntries) => ({
            ...currentEntries,
            [employeeId]: {
                ...(currentEntries[employeeId] ??
                    emptyEntry()),
                ...changes,
            },
        }));
        setSuccessMessage("");
    };

    const handleDateChange = (value: string) => {
        if (!value || value > today) {
            setErrorMessage(
                "Attendance cannot be selected for a future date."
            );
            return;
        }

        setSuccessMessage("");
        setErrorMessage("");
        setSelectedDate(value);
    };

    const handleStatusChange = (
        employeeId: number,
        status: AttendanceStatus
    ) => {
        updateEntry(
            employeeId,
            status === "absent"
                ? {
                      status,
                      isLate: false,
                      lateTime: "",
                  }
                : { status }
        );
    };

    const handleLateToggle = (
        employeeId: number,
        checked: boolean
    ) => {
        updateEntry(employeeId, {
            isLate: checked,
            lateTime: checked
                ? entries[employeeId]?.lateTime ?? ""
                : "",
        });
    };

    const handleSave = async (
        employee: AttendanceEmployee
    ) => {
        const entry = entries[employee.employeeId];

        if (!canEdit || !entry?.status) return;

        try {
            setSavingEmployeeId(employee.employeeId);
            setSuccessMessage("");
            setErrorMessage("");

            const savedAttendance = await markAttendance({
                employeeId: employee.employeeId,
                attendanceDate: selectedDate,
                status: entry.status,
                isLate: entry.isLate,
                lateTime:
                    entry.isLate && entry.lateTime
                        ? entry.lateTime
                        : null,
            });

            setEntries((currentEntries) => ({
                ...currentEntries,
                [employee.employeeId]: {
                    status: savedAttendance.status,
                    isLate:
                        savedAttendance.is_late === 1,
                    lateTime:
                        savedAttendance.late_time?.slice(
                            0,
                            5
                        ) ?? "",
                    hasExistingRecord: true,
                },
            }));
            setSuccessMessage(
                `Attendance saved for ${employee.fullName}.`
            );
        } catch {
            setErrorMessage(
                `Unable to save attendance for ${employee.fullName}.`
            );
        } finally {
            setSavingEmployeeId(null);
        }
    };

    const pageContent = (
        <>
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                        Attendance
                    </h1>
                    <p className="mt-1 text-sm text-[#64748B]">
                        {canEdit
                            ? "Mark and manage employee attendance."
                            : "View employee attendance records."}
                    </p>
                </div>

                <AttendanceDateSelector
                    value={selectedDate}
                    max={today}
                    onChange={handleDateChange}
                />
            </div>

            <div className="flex flex-col gap-5">
                {successMessage ? (
                    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-[#16A34A]">
                        {successMessage}
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
                        {errorMessage}
                    </div>
                ) : null}

                <AttendanceTable
                    employees={employees}
                    entries={entries}
                    canEdit={canEdit}
                    isLoading={isLoading}
                    savingEmployeeId={savingEmployeeId}
                    onStatusChange={handleStatusChange}
                    onLateToggle={handleLateToggle}
                    onLateTimeChange={(employeeId, value) =>
                        updateEntry(employeeId, {
                            lateTime: value,
                        })
                    }
                    onSave={(employee) =>
                        void handleSave(employee)
                    }
                    onViewHistory={setHistoryEmployee}
                />
            </div>

            <AttendanceHistoryModal
                employee={historyEmployee}
                onClose={() => setHistoryEmployee(null)}
            />
        </>
    );

    if (user.role === "manager") {
        return (
            <DashboardLayout user={user}>
                {pageContent}
            </DashboardLayout>
        );
    }

    const employeeInitials = user.full_name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <EmployeeDashboardLayout
            employeeName={user.full_name}
            employeeInitials={employeeInitials}
        >
            {pageContent}
        </EmployeeDashboardLayout>
    );
}
