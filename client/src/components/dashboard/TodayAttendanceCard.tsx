import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

export type AttendanceStatus = "Present" | "Late" | "Absent" | "Not Checked In";

const statusStyles: Record<AttendanceStatus, string> = {
  Present: "bg-green-50 text-[#16A34A]",
  Late: "bg-amber-50 text-[#D97706]",
  Absent: "bg-red-50 text-[#DC2626]",
  "Not Checked In": "bg-[#F1F5F9] text-[#64748B]",
};

const statusDotStyles: Record<AttendanceStatus, string> = {
  Present: "bg-[#22C55E]",
  Late: "bg-[#F59E0B]",
  Absent: "bg-[#EF4444]",
  "Not Checked In": "bg-[#94A3B8]",
};

interface TodayAttendanceCardProps {
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

export default function TodayAttendanceCard({
  date,
  checkIn,
  checkOut,
  status,
  canCheckIn = false,
  canCheckOut = false,
  onCheckIn,
  onCheckOut,
}: TodayAttendanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2"
    >
      {/* ============================== */}
      {/* Header */}
      {/* ============================== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            Today&apos;s Attendance
          </h2>
          <p className="mt-0.5 text-xs text-[#64748B]">{date}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusDotStyles[status]}`}
          />
          {status}
        </span>
      </div>

      {/* ============================== */}
      {/* Check-in / Check-out */}
      {/* ============================== */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3.5">
          <p className="text-xs font-medium text-[#64748B]">Check-in</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-[#0F172A]">
            {checkIn}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3.5">
          <p className="text-xs font-medium text-[#64748B]">Check-out</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-[#0F172A]">
            {checkOut || "—"}
          </p>
        </div>
      </div>

      {/* ============================== */}
      {/* Check Out Action */}
      {/* ============================== */}
      {canCheckIn ? (
        <motion.button
          onClick={onCheckIn}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] sm:w-auto sm:px-6"
        >
          Check In
        </motion.button>
      ) : (
        <motion.button
          onClick={onCheckOut}
          disabled={!canCheckOut}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Check Out
        </motion.button>
      )}
    </motion.div>
  );
}
