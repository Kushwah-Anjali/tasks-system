import { attendanceStatusColors } from "../employees/AttendenceStatus";

interface AttendanceLegendProps {
  className?: string;
}

export default function AttendanceLegend({ className = "" }: AttendanceLegendProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <LegendItem color={attendanceStatusColors.Present.dot} label="Present" />
      <LegendItem color={attendanceStatusColors.Late.dot} label="Late" />
      <LegendItem color={attendanceStatusColors.Absent.dot} label="Absent" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-medium text-[#64748B]">{label}</span>
    </div>
  );
}