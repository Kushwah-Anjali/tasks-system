import type {
    RecentAttendanceRecord,
    RecentAttendanceStatus,
} from "../../services/dashboardService";

interface RecentAttendanceProps {
    rows: RecentAttendanceRecord[];
    isLoading?: boolean;
}

const statusConfig: Record<
    RecentAttendanceStatus,
    {
        label: string;
        className: string;
    }
> = {
    present: {
        label: "Present",
        className:
            "bg-green-50 text-[#16A34A]",
    },
    absent: {
        label: "Absent",
        className:
            "bg-red-50 text-[#DC2626]",
    },
    half_day: {
        label: "Half Day",
        className:
            "bg-amber-50 text-[#D97706]",
    },
};

const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

const formatLateTime = (
    value: string | null
): string => {
    if (!value) return "—";

    return value.slice(0, 5);
};

export default function RecentAttendance({
    rows,
    isLoading = false,
}: RecentAttendanceProps) {
    return (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="border-b border-[#E2E8F0] px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-[#0F172A]">
                    Today&apos;s Attendance
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                    Latest attendance records marked today
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                    <thead>
                        <tr className="border-b border-[#E2E8F0]">
                            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Employee
                            </th>
                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Status
                            </th>
                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Late
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Marked By
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-12 text-center text-sm text-[#64748B]"
                                >
                                    Loading attendance...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-6 py-12 text-center"
                                >
                                    <p className="text-sm font-medium text-[#0F172A]">
                                        No attendance recorded today
                                    </p>
                                    <p className="mt-1 text-xs text-[#94A3B8]">
                                        Attendance records will appear here after they are marked.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const status =
                                    statusConfig[row.status];

                                return (
                                    <tr
                                        key={row.id}
                                        className="border-b border-[#E2E8F0] transition-colors last:border-none hover:bg-[#F8FAFC]"
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-[#475569]">
                                                    {getInitials(
                                                        row.full_name
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-[#0F172A]">
                                                        {row.full_name}
                                                    </p>
                                                    <p className="text-xs text-[#94A3B8]">
                                                        {row.designation ||
                                                            "Employee"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-3 py-3.5">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                                            >
                                                {status.label}
                                            </span>
                                        </td>

                                        <td className="px-3 py-3.5 text-sm text-[#334155]">
                                            {row.is_late === 1
                                                ? `Yes${
                                                      row.late_time
                                                          ? ` · ${formatLateTime(
                                                                row.late_time
                                                            )}`
                                                          : ""
                                                  }`
                                                : "No"}
                                        </td>

                                        <td className="px-6 py-3.5 text-right text-sm text-[#334155]">
                                            {row.marked_by_name ||
                                                "—"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
