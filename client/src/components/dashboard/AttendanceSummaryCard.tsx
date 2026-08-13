import { motion } from "framer-motion";

interface AttendanceSummaryCardProps {
  present: number;
  late: number;
  absent: number;
  attendancePercentage: number;
}

function SummaryRow({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: number;
  dotClassName: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
        <span className="text-sm font-medium text-[#334155]">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#0F172A]">{value}</span>
    </div>
  );
}

export default function AttendanceSummaryCard({
  present,
  late,
  absent,
  attendancePercentage,
}: AttendanceSummaryCardProps) {
  const totalPresent = present + late;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <h2 className="text-base font-semibold text-[#0F172A]">This Month</h2>
      <p className="mt-0.5 text-xs text-[#64748B]">Attendance summary</p>

      <div className="mt-5 flex flex-col gap-3">
        <SummaryRow
          label="Present"
          value={totalPresent}
          dotClassName="bg-[#22C55E]"
        />
        <SummaryRow label="Late" value={late} dotClassName="bg-[#F59E0B]" />
        <SummaryRow label="Absent" value={absent} dotClassName="bg-[#EF4444]" />
      </div>

      <div className="mt-5 rounded-xl bg-[#2563EB]/5 px-4 py-3.5">
        <p className="text-xs font-medium text-[#64748B]">Attendance rate</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-[#2563EB]">
          {attendancePercentage}%
        </p>
      </div>
    </motion.div>
  );
}
