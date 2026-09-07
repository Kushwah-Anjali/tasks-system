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
    return (
        <tr className="border-b border-[#E2E8F0] last:border-none hover:bg-[#F8FAFC]">
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-[#475569]">
                        {getInitials(employee.fullName)}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                            {employee.fullName}
                        </p>
                        <p className="text-xs text-[#94A3B8]">
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
                    <span className="inline-flex rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#475569]">
                        {entry.status === "present"
                            ? "Present"
                            : entry.status === "absent"
                              ? "Absent"
                              : entry.status === "half_day"
                                ? "Half Day"
                                : "Not marked"}
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
                ) : (
                    <div className="text-sm text-[#334155]">
                        <p>{entry.isLate ? "Yes" : "No"}</p>
                        {entry.isLate && entry.lateTime ? (
                            <p className="mt-0.5 text-xs text-[#64748B]">
                                {entry.lateTime}
                            </p>
                        ) : null}
                    </div>
                )}
            </td>
            <td className="px-5 py-4">
                <div className="flex min-w-[120px] gap-2">
                    {canEdit ? (
                        <button
                            type="button"
                            disabled={!entry.status || isSaving}
                            onClick={onSave}
                            className="h-9 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving
                                ? "Saving..."
                                : entry.hasExistingRecord
                                  ? "Update"
                                  : "Save"}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={onViewHistory}
                        className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]"
                    >
                        View History
                    </button>
                </div>
            </td>
        </tr>
    );
}
