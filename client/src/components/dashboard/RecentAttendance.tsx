export interface AttendanceRow {
  name: string;
  role: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Late" | "Absent";
}

const statusStyles: Record<AttendanceRow["status"], string> = {
  Present: "bg-green-50 text-[#16A34A]",
  Late: "bg-amber-50 text-[#D97706]",
  Absent: "bg-red-50 text-[#DC2626]",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

interface RecentAttendanceProps {
  rows: AttendanceRow[];
}

export default function RecentAttendance({ rows }: RecentAttendanceProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:col-span-2">
      {/* ============================== */}
      {/* Header */}
      {/* ============================== */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Recent Attendance</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">Today&apos;s check-ins</p>
        </div>
        <button className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]">
          View all
        </button>
      </div>

      {/* ============================== */}
      {/* Table */}
      {/* ============================== */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8] sm:px-6">
                Employee
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Check-in
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Check-out
              </th>
              <th className="px-3 py-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide text-[#94A3B8] sm:pr-6">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-[#E2E8F0] last:border-none transition-colors duration-150 hover:bg-[#F8FAFC]"
              >
                <td className="px-5 py-3.5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-[#475569]">
                      {getInitials(row.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{row.name}</p>
                      <p className="text-xs text-[#94A3B8]">{row.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-sm text-[#334155]">{row.checkIn}</td>
                <td className="px-3 py-3.5 text-sm text-[#334155]">{row.checkOut}</td>
                <td className="px-3 py-3.5 pr-5 text-right sm:pr-6">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}