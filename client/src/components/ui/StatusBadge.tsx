import type { ReactNode } from "react";

export type StatusTone = "neutral" | "blue" | "success" | "warning" | "danger" | "info" | "orange";

const tones: Record<StatusTone, string> = {
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-green-200 bg-green-50 text-green-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-violet-200 bg-violet-50 text-violet-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
};

export default function StatusBadge({ children, tone = "neutral", prominent = false }: {
    children: ReactNode;
    tone?: StatusTone;
    prominent?: boolean;
}) {
    return (
        <span className={"inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full border font-semibold " + tones[tone] + (prominent ? " px-4 py-2 text-sm" : " px-3 py-1.5 text-xs")}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
            {children}
        </span>
    );
}
