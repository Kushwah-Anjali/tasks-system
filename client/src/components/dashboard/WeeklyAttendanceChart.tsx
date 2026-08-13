import { motion } from "framer-motion";
import AttendanceLegend from "./AttendanceLegend";
import { attendanceStatusColors, type AttendanceDayStatus } from "../employees/AttendenceStatus";

export type WeeklyDayStatus = AttendanceDayStatus | "Weekend";

export interface WeeklyAttendanceDay {
  label: string;
  date: string;
  status: WeeklyDayStatus;
  checkIn?: string;
  hours: number;
  isToday?: boolean;
}

const MAX_HOURS = 9;

const barColor: Record<WeeklyDayStatus, string> = {
  Present: attendanceStatusColors.Present.dot,
  Late: attendanceStatusColors.Late.dot,
  Absent: attendanceStatusColors.Absent.dot,
  Weekend: "bg-[#E2E8F0]",
};

function getTopLabel(day: WeeklyAttendanceDay) {
  if (day.hours > 0) return `${day.hours}h`;
  if (day.status === "Weekend") return "Off";
  if (day.isToday && day.checkIn) return day.checkIn;
  return "—";
}

interface WeeklyAttendanceChartProps {
  days: WeeklyAttendanceDay[];
}

export default function WeeklyAttendanceChart({ days }: WeeklyAttendanceChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      {/* ============================== */}
      {/* Header */}
      {/* ============================== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">This Week</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">Daily check-ins and hours</p>
        </div>
        <AttendanceLegend className="hidden sm:flex" />
      </div>

      {/* ============================== */}
      {/* Bars */}
      {/* ============================== */}
      <div className="mt-6 flex items-end justify-between gap-2 sm:gap-4">
        {days.map((day) => {
          const heightPercent = Math.max((day.hours / MAX_HOURS) * 100, 6);

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-[#0F172A]">
                {getTopLabel(day)}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[28px] rounded-full ${barColor[day.status]} ${
                    day.isToday ? "ring-2 ring-[#2563EB] ring-offset-2" : ""
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-semibold ${
                    day.isToday ? "text-[#2563EB]" : "text-[#0F172A]"
                  }`}
                >
                  {day.label}
                </span>
                <span className="text-[10px] text-[#94A3B8]">{day.date}</span>
              </div>
            </div>
          );
        })}
      </div>

      <AttendanceLegend className="mt-5 justify-center sm:hidden" />
    </motion.div>
  );
}