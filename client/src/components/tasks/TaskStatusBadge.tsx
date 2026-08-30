import type { TaskStatus } from "../../types/task";
interface StatusConfig {
    label: string;
    className: string;
}

const statusConfig: Record<
    TaskStatus,
    StatusConfig
> = {
    assigned: {
        label: "Assigned",
        className:
            "bg-slate-100 text-slate-600",
    },

    in_progress: {
        label: "In Progress",
        className:
            "bg-blue-50 text-blue-600",
    },

    submitted: {
        label: "Submitted",
        className:
            "bg-amber-50 text-amber-600",
    },

    completed: {
        label: "Completed",
        className:
            "bg-green-50 text-green-600",
    },

    overdue: {
        label: "Overdue",
        className:
            "bg-red-50 text-red-600",
    },
};

interface TaskStatusBadgeProps {
    status: TaskStatus;
}

export default function TaskStatusBadge({
    status,
}: TaskStatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
        >
            {config.label}
        </span>
    );
}