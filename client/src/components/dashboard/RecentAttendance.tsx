import type { RecentAttendanceRecord } from "../../services/dashboardService";

interface RecentAttendanceProps {
    rows: RecentAttendanceRecord[];
    isLoading?: boolean;
}

const statusConfig = {
    present: { label: "Present", className: "bg-green-50 text-[#16A34A]" },
    late: { label: "Late", className: "bg-amber-50 text-[#D97706]" },
    absent: { label: "Absent", className: "bg-red-50 text-[#DC2626]" },
};

const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

const formatTime = (value: string | null): string => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function RecentAttendance({
    rows,
    isLoading = false,
}: RecentAttendanceProps) {
    return (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-[#E2E8F0] px-5 py-4 sm:px-6">
                <h2 className="text-base font-semibold text-[#0F172A]">
                    Recent Attendance
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                    Today&apos;s latest check-ins
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                    <thead>
                        <tr className="border-b border-[#E2E8F0]">
                            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Employee
                            </th>
                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Check-in
                            </th>
                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Check-out
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Status
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-[#64748B]">
                                    Loading recent attendance...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <p className="text-sm font-medium text-[#0F172A]">
                                        No attendance recorded today
                                    </p>
                                    <p className="mt-1 text-xs text-[#94A3B8]">
                                        Employee check-ins will appear here.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const status = statusConfig[row.status];

                                return (
                                    <tr
                                        key={row.id}
                                        className="border-b border-[#E2E8F0] transition-colors last:border-none hover:bg-[#F8FAFC]"
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-[#475569]">
                                                    {getInitials(row.full_name)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#0F172A]">
                                                        {row.full_name}
                                                    </p>
                                                    <p className="text-xs text-[#94A3B8]">
                                                        {row.designation || "Employee"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-[#334155]">
                                            {formatTime(row.check_in)}
                                        </td>
                                        <td className="px-3 py-3.5 text-sm text-[#334155]">
                                            {formatTime(row.check_out)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                                            >
                                                {status.label}
                                            </span>
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
