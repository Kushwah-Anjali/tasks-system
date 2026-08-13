import { motion } from "framer-motion";
import AttendanceLegend from "./AttendanceLegend";
import { attendanceStatusColors, type AttendanceDayStatus } from "../employees/AttendenceStatus";
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = Array.from({ length: startOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

interface AttendanceCalendarProps {
  year: number;
  month: number;
  monthLabel: string;
  attendanceByDate: Record<number, AttendanceDayStatus>;
  today?: number;
}

export default function AttendanceCalendar({
  year,
  month,
  monthLabel,
  attendanceByDate,
  today,
}: AttendanceCalendarProps) {
  const cells = buildCalendarCells(year, month);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2"
    >
      {/* ============================== */}
      {/* Header */}
      {/* ============================== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Attendance Calendar</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">{monthLabel}</p>
        </div>
        <AttendanceLegend className="hidden sm:flex" />
      </div>

      {/* ============================== */}
      {/* Grid */}
      {/* ============================== */}
      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {weekdayLabels.map((label) => (
          <span
            key={label}
            className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]"
          >
            {label}
          </span>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const status = attendanceByDate[day];
          const isToday = day === today;
          const cellClasses = status
            ? `${attendanceStatusColors[status].bg} ${attendanceStatusColors[status].text}`
            : "bg-[#F8FAFC] text-[#94A3B8]";

          return (
            <div
              key={day}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold ${cellClasses} ${
                isToday ? "ring-2 ring-[#2563EB] ring-offset-1" : ""
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <AttendanceLegend className="mt-5 justify-center sm:hidden" />
    </motion.div>
  );
}