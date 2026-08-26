import TaskStatusBadge from "./TaskStatusBadge";
import TaskProgressBar from "./TaskProgressBar";
import type { Task } from "./types";
import { Trash2 } from "lucide-react";
function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
} 
interface TaskTableProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskDelete?: (taskId: number) => void;
}
export default function TaskTable({ tasks, onTaskClick ,onTaskDelete}: TaskTableProps) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8] sm:px-6">
                Task
              </th>

              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Assigned to
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8] sm:px-6">
                Assigned Date
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Due date
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Status
              </th>
              <th className="px-3 py-3 pr-5 text-xs font-semibold uppercase tracking-wide text-[#94A3B8] sm:pr-6">
                Progress
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
  Action
</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-[#0F172A]">No tasks found</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">Try adjusting your search or filters.</p>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="cursor-pointer border-b border-[#E2E8F0] last:border-none transition-colors duration-150 hover:bg-[#F8FAFC]"
                >
                  <td className="px-5 py-3.5 sm:px-6">
                    <p className="text-sm font-medium text-[#0F172A]">{task.title}</p>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[11px] font-semibold text-[#475569]">
                        {getInitials(task.assigned_to_name)}
                      </div>
                      <span className="text-sm text-[#334155]">{task.assigned_to_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#334155] sm:px-6">
  {task.assigned_date}
</td>
                  <td className="px-3 py-3.5 text-sm text-[#334155]">{task.due_date}</td>
                  <td className="px-3 py-3.5">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-3 py-3.5 pr-5 sm:pr-6">
                    <TaskProgressBar progress={task.progress} />
                  </td>
                  <td className="px-3 py-3.5">
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();

      if (window.confirm("Are you sure you want to delete this task?")) {
onTaskDelete?.(task.id);
      }
    }}
    className="rounded-lg p-2 text-[#EF4444] hover:bg-red-50"
    title="Delete task"
  >
    <Trash2 className="h-4 w-4" />
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