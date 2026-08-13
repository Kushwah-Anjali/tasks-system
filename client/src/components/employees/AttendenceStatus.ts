export type AttendanceDayStatus = "Present" | "Late" | "Absent";

interface AttendanceStatusStyle {
  bg: string;
  text: string;
  dot: string;
}

export const attendanceStatusColors: Record<AttendanceDayStatus, AttendanceStatusStyle> = {
  Present: { bg: "bg-green-50", text: "text-[#16A34A]", dot: "bg-[#22C55E]" },
  Late: { bg: "bg-amber-50", text: "text-[#D97706]", dot: "bg-[#F59E0B]" },
  Absent: { bg: "bg-red-50", text: "text-[#DC2626]", dot: "bg-[#EF4444]" },
};