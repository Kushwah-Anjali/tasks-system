import { motion } from "framer-motion";
import type { ReactNode } from "react";

export interface QuickAction {
  label: string;
  icon: ReactNode;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <h2 className="text-base font-semibold text-[#0F172A]">Quick Actions</h2>
      <p className="mt-0.5 text-xs text-[#64748B]">Jump straight into common tasks</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 text-center transition-colors duration-150 hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-[#0F172A]">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}