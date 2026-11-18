import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ReactNode } from "react";

export interface StatCard {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: ReactNode;
  tone?: "blue" | "green" | "red" | "amber";
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
  tone = "blue",
}: StatsCardProps) {
  const colors = {
    blue: "border-blue-200 bg-blue-50/50 text-blue-700",
    green: "border-green-200 bg-green-50/50 text-green-700",
    red: "border-red-200 bg-red-50/50 text-red-700",
    amber: "border-amber-200 bg-amber-50/50 text-amber-700",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={"rounded-2xl border border-t-4 p-6 shadow-sm " + colors[tone]}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-current/10 bg-white/80">
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
      <p className="mt-4 text-4xl font-bold tracking-tight text-[#0F172A]">{value}</p>
      <p className="mt-2 text-base font-semibold text-[#64748B]">{label}</p>
      <p className="mt-2 text-xs font-medium text-[#64748B]">{delta}</p>
    </motion.div>
  );
}