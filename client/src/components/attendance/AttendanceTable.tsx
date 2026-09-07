import type {
    AttendanceDraft,
    AttendanceEmployee,
    AttendanceStatus,
} from "../../types/attendance";
import AttendanceRow from "./AttendanceRow";

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
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left">
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
                                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]"
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
                                    entry={entries[employee.employeeId]}
                                    canEdit={canEdit}
                                    isSaving={savingEmployeeId === employee.employeeId}
                                    onStatusChange={(status) =>
                                        onStatusChange(employee.employeeId, status)
                                    }
                                    onLateToggle={(checked) =>
                                        onLateToggle(employee.employeeId, checked)
                                    }
                                    onLateTimeChange={(value) =>
                                        onLateTimeChange(employee.employeeId, value)
                                    }
                                    onSave={() => onSave(employee)}
                                    onViewHistory={() => onViewHistory(employee)}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
