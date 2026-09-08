import {
    Clock3,
    History,
    Save,
    ShieldCheck,
} from "lucide-react";

import type {
    AttendanceDraft,
    AttendanceEmployee,
    AttendanceStatus,
} from "../../types/attendance";
import AttendanceLateControl from "./AttendanceLateControl";
import AttendanceStatusButtons from "./AttendanceStatusButtons";

interface AttendanceRowProps {
    employee: AttendanceEmployee;
    entry: AttendanceDraft;
    canEdit: boolean;
    isSaving: boolean;
    onStatusChange: (status: AttendanceStatus) => void;
    onLateToggle: (checked: boolean) => void;
    onLateTimeChange: (value: string) => void;
    onSave: () => void;
    onViewHistory: () => void;
}

const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

const readOnlyStatus = (
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

export default function AttendanceRow({
    employee,
    entry,
    canEdit,
    isSaving,
    onStatusChange,
    onLateToggle,
    onLateTimeChange,
    onSave,
    onViewHistory,
}: AttendanceRowProps) {
    const status = readOnlyStatus(entry.status);

    return (
        <tr className="border-b border-[#E2E8F0] last:border-none transition-colors hover:bg-[#F8FAFC]">
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                        {getInitials(employee.fullName)}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                            {employee.fullName}
                        </p>
                        <p className="truncate text-xs text-[#94A3B8]">
                            {employee.email}
                        </p>
                    </div>
                </div>
            </td>

            <td className="px-3 py-4 text-sm text-[#334155]">
                {employee.department || "—"}
            </td>

            <td className="px-3 py-4 text-sm text-[#334155]">
                {employee.designation || "—"}
            </td>

            <td className="px-3 py-4">
                {canEdit ? (
                    <AttendanceStatusButtons
                        employeeId={employee.employeeId}
                        value={entry.status}
                        onChange={onStatusChange}
                    />
                ) : (
                    <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                    >
                        {status.label}
                    </span>
                )}
            </td>

            <td className="px-3 py-4">
                {canEdit ? (
                    <AttendanceLateControl
                        employeeId={employee.employeeId}
                        checked={entry.isLate}
                        lateTime={entry.lateTime}
                        disabled={entry.status === "absent"}
                        onToggle={onLateToggle}
                        onTimeChange={onLateTimeChange}
                    />
                ) : entry.isLate ? (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                        <Clock3 className="h-4 w-4" />
                        <span>
                            Late
                            {entry.lateTime
                                ? ` • ${entry.lateTime}`
                                : ""}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs font-medium text-[#64748B]">
                        On time
                    </span>
                )}
            </td>

            <td className="px-5 py-4">
                <div className="flex min-w-[190px] items-center gap-2">
                    {canEdit ? (
                        <button
                            type="button"
                            disabled={!entry.status || isSaving}
                            onClick={onSave}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <ShieldCheck className="h-3.5 w-3.5 animate-pulse" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    {entry.hasExistingRecord
                                        ? "Update"
                                        : "Save"}
                                </>
                            )}
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={onViewHistory}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#334155] transition-colors hover:border-[#93C5FD] hover:bg-blue-50 hover:text-blue-700"
                    >
                        <History className="h-3.5 w-3.5" />
                        History
                    </button>
                </div>
            </td>
        </tr>
    );
}
