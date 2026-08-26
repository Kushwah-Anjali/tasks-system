import type { TaskStatus } from "./types";

const statusStyles: Record<TaskStatus, string> = {
  "Not Started": "bg-[#F1F5F9] text-[#64748B]",
  "In Progress": "bg-blue-50 text-[#2563EB]",
  Completed: "bg-green-50 text-[#16A34A]",
  Overdue: "bg-red-50 text-[#DC2626]",
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export default function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}