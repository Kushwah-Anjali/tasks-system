import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface StatCard {
  label: string;
  value?: string;
  icon: ReactNode;
  tone?: "blue" | "green" | "red" | "amber";
  action?: {
    label: string;
    to: string;
  };
}

type StatsCardProps = StatCard;

const cardTones = {
  blue: "border-blue-200 bg-blue-50/50",
  green: "border-green-200 bg-green-50/50",
  red: "border-red-200 bg-red-50/50",
  amber: "border-amber-200 bg-amber-50/50",
};

const iconTones = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-900",
};

export default function StatsCard({
  label,
  value,
  icon,
  tone = "blue",
  action,
}: StatsCardProps) {
  return (
    <div className={`flex min-h-[5.25rem] min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-sm ${cardTones[tone]}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconTones[tone]}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {value !== undefined ? (
          <p className="break-all text-[clamp(1.125rem,4vw,1.5rem)] font-bold leading-7 tracking-tight text-[#0F172A] tabular-nums">
            {value}
          </p>
        ) : null}
        <p className="break-words text-xs font-semibold leading-4 text-[#334155]">{label}</p>
        {action ? (
          <Link
            to={action.to}
            className="mt-1 inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-blue-700 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
