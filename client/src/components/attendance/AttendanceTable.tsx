import {
    BriefcaseBusiness,
    Building2,
    Clock3,
    History,
    Save,
    Users,
} from "lucide-react";

import type {
    AttendanceDraft,
    AttendanceEmployee,
    AttendanceStatus,
} from "../../types/attendance";
import AttendanceLateControl from "./AttendanceLateControl";
import AttendanceRow from "./AttendanceRow";
import AttendanceStatusButtons from "./AttendanceStatusButtons";

interface AttendanceTableProps {
    employees: AttendanceEmployee[];
    entries: Record<number, AttendanceDraft>;
    canEdit: boolean;
    isLoading: boolean;
    savingEmployeeId: number | null;
    onStatusChange: (
        employeeId: number,
        status: AttendanceStatus
    ) => void;
    onLateToggle: (
        employeeId: number,
        checked: boolean
    ) => void;
    onLateTimeChange: (
        employeeId: number,
        value: string
    ) => void;
    onSave: (employee: AttendanceEmployee) => void;
    onViewHistory: (employee: AttendanceEmployee) => void;
}

const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

const statusBadge = (
    status: AttendanceDraft["status"]
) => {
    if (status === "present") {
        return {
            label: "Present",
            className:
                "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        };
    }

    if (status === "absent") {
        return {
            label: "Absent",
            className:
                "bg-red-50 text-red-700 ring-1 ring-red-200",
        };
    }

    if (status === "half_day") {
        return {
            label: "Half Day",
            className:
                "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        };
    }

    return {
        label: "Not marked",
        className:
            "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
    };
};

export default function AttendanceTable({
    employees,
    entries,
    canEdit,
    isLoading,
    savingEmployeeId,
    onStatusChange,
    onLateToggle,
    onLateTimeChange,
    onSave,
    onViewHistory,
}: AttendanceTableProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1080px] text-left">
                    <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                            {[
                                "Employee",
                                "Department",
                                "Designation",
                                "Status",
                                "Late",
                                "Actions",
                            ].map((heading) => (
                                <th
                                    key={heading}
                                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]"
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-sm text-[#64748B]"
                                >
                                    Loading attendance...
                                </td>
                            </tr>
                        ) : employees.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-sm text-[#64748B]"
                                >
                                    No active employees found.
                                </td>
                            </tr>
                        ) : (
                            employees.map((employee) => (
                                <AttendanceRow
                                    key={employee.employeeId}
                                    employee={employee}
                                    entry={
                                        entries[
                                            employee.employeeId
                                        ]
                                    }
                                    canEdit={canEdit}
                                    isSaving={
                                        savingEmployeeId ===
                                        employee.employeeId
                                    }
                                    onStatusChange={(status) =>
                                        onStatusChange(
                                            employee.employeeId,
                                            status
                                        )
                                    }
                                    onLateToggle={(checked) =>
                                        onLateToggle(
                                            employee.employeeId,
                                            checked
                                        )
                                    }
                                    onLateTimeChange={(value) =>
                                        onLateTimeChange(
                                            employee.employeeId,
                                            value
                                        )
                                    }
                                    onSave={() =>
                                        onSave(employee)
                                    }
                                    onViewHistory={() =>
                                        onViewHistory(employee)
                                    }
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col divide-y divide-[#E2E8F0] lg:hidden">
                {isLoading ? (
                    <div className="px-5 py-10 text-center text-sm text-[#64748B]">
                        Loading attendance...
                    </div>
                ) : employees.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
                            <Users className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                            No active employees found
                        </p>
                    </div>
                ) : (
                    employees.map((employee) => {
                        const entry =
                            entries[employee.employeeId];
                        const status =
                            statusBadge(entry?.status);
                        const isSaving =
                            savingEmployeeId ===
                            employee.employeeId;

                        return (
                            <div
                                key={employee.employeeId}
                                className="p-4 sm:p-5"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                                        {getInitials(
                                            employee.fullName
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                                            {employee.fullName}
                                        </p>
                                        <p className="truncate text-xs text-[#94A3B8]">
                                            {employee.email}
                                        </p>
                                    </div>

                                    {!canEdit ? (
                                        <span
                                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                                        >
                                            {status.label}
                                        </span>
                                    ) : null}
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2">
                                        <Building2 className="h-4 w-4 shrink-0 text-[#64748B]" />
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-[#94A3B8]">
                                                Department
                                            </p>
                                            <p className="truncate text-xs font-medium text-[#334155]">
                                                {employee.department ||
                                                    "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2">
                                        <BriefcaseBusiness className="h-4 w-4 shrink-0 text-[#64748B]" />
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-[#94A3B8]">
                                                Designation
                                            </p>
                                            <p className="truncate text-xs font-medium text-[#334155]">
                                                {employee.designation ||
                                                    "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {canEdit ? (
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <p className="mb-2 text-xs font-semibold text-[#64748B]">
                                                Attendance status
                                            </p>
                                            <AttendanceStatusButtons
                                                employeeId={
                                                    employee.employeeId
                                                }
                                                value={
                                                    entry?.status ??
                                                    null
                                                }
                                                onChange={(value) =>
                                                    onStatusChange(
                                                        employee.employeeId,
                                                        value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div>
                                            <p className="mb-2 text-xs font-semibold text-[#64748B]">
                                                Late details
                                            </p>
                                            <AttendanceLateControl
                                                employeeId={
                                                    employee.employeeId
                                                }
                                                checked={
                                                    entry?.isLate ??
                                                    false
                                                }
                                                lateTime={
                                                    entry?.lateTime ??
                                                    ""
                                                }
                                                disabled={
                                                    entry?.status ===
                                                    "absent"
                                                }
                                                onToggle={(checked) =>
                                                    onLateToggle(
                                                        employee.employeeId,
                                                        checked
                                                    )
                                                }
                                                onTimeChange={(value) =>
                                                    onLateTimeChange(
                                                        employee.employeeId,
                                                        value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        {entry?.isLate ? (
                                            <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                <Clock3 className="h-4 w-4" />
                                                Late
                                                {entry.lateTime
                                                    ? ` • ${entry.lateTime}`
                                                    : ""}
                                            </div>
                                        ) : (
                                            <p className="text-xs font-medium text-[#64748B]">
                                                On time
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {canEdit ? (
                                        <button
                                            type="button"
                                            disabled={
                                                !entry?.status ||
                                                isSaving
                                            }
                                            onClick={() =>
                                                onSave(employee)
                                            }
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Save className="h-3.5 w-3.5" />
                                            {isSaving
                                                ? "Saving..."
                                                : entry?.hasExistingRecord
                                                  ? "Update"
                                                  : "Save"}
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onViewHistory(employee)
                                        }
                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#334155] hover:border-[#93C5FD] hover:bg-blue-50 hover:text-blue-700"
                                    >
                                        <History className="h-3.5 w-3.5" />
                                        View History
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
