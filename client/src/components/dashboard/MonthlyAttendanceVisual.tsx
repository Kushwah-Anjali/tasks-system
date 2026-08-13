import { motion } from "framer-motion";
import { attendanceStatusColors } from "../employees/AttendenceStatus";

interface MonthlyAttendanceVisualProps {
  present: number;
  late: number;
  absent: number;
}

export default function MonthlyAttendanceVisual({
  present,
  late,
  absent,
}: MonthlyAttendanceVisualProps) {
  const total = present + late + absent;

  const segments = [
    { label: "Present", value: present, color: attendanceStatusColors.Present.dot },
    { label: "Late", value: late, color: attendanceStatusColors.Late.dot },
    { label: "Absent", value: absent, color: attendanceStatusColors.Absent.dot },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <h2 className="text-base font-semibold text-[#0F172A]">Monthly Breakdown</h2>
      <p className="mt-0.5 text-xs text-[#64748B]">{total} working days so far</p>

      {/* ============================== */}
      {/* Segmented Bar */}
      {/* ============================== */}
      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.label}
              className={segment.color}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ) : null
        )}
      </div>

      {/* ============================== */}
      {/* Legend + Counts */}
      {/* ============================== */}
      <div className="mt-5 flex flex-col gap-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${segment.color}`} />
              <span className="text-sm font-medium text-[#334155]">{segment.label}</span>
            </div>
            <span className="text-sm font-semibold text-[#0F172A]">
              {segment.value} day{segment.value === 1 ? "" : "s"}{" "}
              <span className="font-medium text-[#94A3B8]">
                ({total > 0 ? Math.round((segment.value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}