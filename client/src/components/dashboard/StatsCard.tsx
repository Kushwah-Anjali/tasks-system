import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ReactNode } from "react";

export interface StatCard {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: ReactNode;
}

interface StatsCardProps extends StatCard {
  delay?: number;
}

export default function StatsCard({
  label,
  value,
  delta,
  trend,
  icon,
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
          {icon}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            trend === "up" ? "bg-green-50 text-[#16A34A]" : "bg-red-50 text-[#DC2626]"
          }`}
        >
          {trend === "up" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-[#0F172A]">{value}</p>
      <p className="mt-1 text-sm font-medium text-[#64748B]">{label}</p>
      <p className="mt-2 text-xs font-medium text-[#94A3B8]">{delta}</p>
    </motion.div>
  );
}