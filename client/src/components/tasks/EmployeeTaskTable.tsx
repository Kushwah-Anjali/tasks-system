import TaskProgressBar from "./TaskProgressBar";
import TaskStatusBadge from "./TaskStatusBadge";

import type { Task } from "../../types/task";

interface EmployeeTaskTableProps {
    tasks: Task[];
    onView: (task: Task) => void;
}

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

export default function EmployeeTaskTable({
    tasks,
    onView,
}: EmployeeTaskTableProps) {
    return (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                    <thead>
                        <tr className="border-b border-[#E2E8F0]">
                            <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                Task
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
                                    colSpan={6}
                                    className="px-6 py-16 text-center"
                                >
                                    <p className="text-sm font-medium text-[#0F172A]">
                                        No tasks assigned yet
                                    </p>

                                    <p className="mt-1 text-xs text-[#94A3B8]">
                                        New tasks assigned to
                                        you will appear here.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            tasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className="border-b border-[#E2E8F0] transition-colors last:border-none hover:bg-[#F8FAFC]"
                                >
                                    <td className="px-6 py-3.5">
                                        <p className="text-sm font-medium text-[#0F172A]">
                                            {task.title}
                                        </p>
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
                                            onClick={() =>
                                                onView(task)
                                            }
                                            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#2563EB]/10"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}