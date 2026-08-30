import { Trash2 } from "lucide-react";

import type { Task } from "../../types/task";

import TaskProgressBar from "./TaskProgressBar";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskTableProps {
    tasks: Task[];

    onTaskClick?: (task: Task) => void;

    onTaskDelete?: (
        taskId: number
    ) => Promise<void> | void;
}

const getInitials = (
    name: string
): string => {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
};

const formatDate = (
    value: string | null | undefined
): string => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export default function TaskTable({
    tasks,
    onTaskClick,
    onTaskDelete,
}: TaskTableProps) {
    const handleDelete = async (
        taskId: number
    ) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this task?"
        );

        if (!confirmed) return;

        await onTaskDelete?.(taskId);
    };

    return (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                    <thead>
                        <tr className="border-b border-[#E2E8F0]">
                            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Task
                            </th>

                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Assigned To
                            </th>

                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Assigned Date
                            </th>

                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Due Date
                            </th>

                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Status
                            </th>

                            <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Progress
                            </th>

                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {tasks.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-16 text-center"
                                >
                                    <p className="text-sm font-medium text-[#0F172A]">
                                        No tasks found
                                    </p>

                                    <p className="mt-1 text-xs text-[#94A3B8]">
                                        Try changing
                                        your search or
                                        status filter.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            tasks.map((task) => {
                                const employeeName =
                                    task.assigned_to_name ||
                                    "Unknown employee";

                                return (
                                    <tr
                                        key={
                                            task.id
                                        }
                                        onClick={() =>
                                            onTaskClick?.(
                                                task
                                            )
                                        }
                                        className={`border-b border-[#E2E8F0] transition-colors last:border-none hover:bg-[#F8FAFC] ${
                                            onTaskClick
                                                ? "cursor-pointer"
                                                : ""
                                        }`}
                                    >
                                        <td className="px-6 py-3.5">
                                            <p className="text-sm font-medium text-[#0F172A]">
                                                {
                                                    task.title
                                                }
                                            </p>
                                        </td>

                                        <td className="px-3 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[11px] font-semibold text-[#475569]">
                                                    {getInitials(
                                                        employeeName
                                                    )}
                                                </div>

                                                <span className="text-sm text-[#334155]">
                                                    {
                                                        employeeName
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-3 py-3.5 text-sm text-[#334155]">
                                            {formatDate(
                                                task.assigned_date
                                            )}
                                        </td>

                                        <td className="px-3 py-3.5 text-sm text-[#334155]">
                                            {formatDate(
                                                task.due_date
                                            )}
                                        </td>

                                        <td className="px-3 py-3.5">
                                            <TaskStatusBadge
                                                status={
                                                    task.status
                                                }
                                            />
                                        </td>

                                        <td className="px-3 py-3.5">
                                            <TaskProgressBar
                                                progress={
                                                    task.progress
                                                }
                                            />
                                        </td>

                                        <td className="px-6 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={(
                                                    event
                                                ) => {
                                                    event.stopPropagation();

                                                    void handleDelete(
                                                        task.id
                                                    );
                                                }}
                                                className="rounded-lg p-2 text-[#EF4444] transition-colors hover:bg-red-50"
                                                aria-label={`Delete ${task.title}`}
                                                title="Delete task"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}