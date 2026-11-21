import type { Task, TaskPriority } from "../../types/task";
import { getTaskAging } from "./taskDateUtils";
import { normalizeTaskPriority } from "../../utils/taskPriority";

const priorityStyles: Record<TaskPriority, string> = {
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    low: "border-blue-200 bg-blue-50 text-blue-700",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority | null | undefined }) {
    const normalizedPriority = normalizeTaskPriority(priority);
    const label = normalizedPriority.charAt(0).toUpperCase() + normalizedPriority.slice(1);
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityStyles[normalizedPriority]}`}>
            {label}
        </span>
    );
}

const agingStyles = {
    overdue: "border-red-200 bg-red-50 text-red-700",
    today: "border-amber-200 bg-amber-50 text-amber-800",
    future: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

export function TaskAgingBadge({ task, wrap = false }: { task: Pick<Task, "due_date" | "status">; wrap?: boolean }) {
    const aging = getTaskAging(task);
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${wrap ? "max-w-full whitespace-normal break-words" : "whitespace-nowrap"} ${agingStyles[aging.tone]}`}>
            {aging.label}
        </span>
    );
}
