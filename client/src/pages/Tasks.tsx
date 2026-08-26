import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskTable from "../components/tasks/TaskTable";
import CreateTaskModal from "../components/tasks/CreateTaskModal";

import type { Task, TaskStatus } from "../components/tasks/types";
import { getAllTasks, deleteTask } from "../services/taskservice";
export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const data = await getAllTasks();
      setTasks(data.tasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);

      setError("Unable to load tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(undefined);
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.assigned_to_name.toLowerCase().includes(query);

      const matchesStatus =
        !status || task.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status, tasks]);

  const handleTaskCreated = async () => {
    await loadTasks();

    setSuccessMessage("Task created successfully.");
  };
const handleTaskDelete = async (taskId: number) => {
  try {
    await deleteTask(taskId);
    await loadTasks();
    setSuccessMessage("Task deleted successfully.");
  } catch {
    setSuccessMessage("Failed to delete task.");
  }
};
  return (
    <DashboardLayout user={user}>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Tasks
          </h1>

          <p className="mt-1 text-sm text-[#64748B]">
            Manage and track all tasks across your team.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1D4ED8]"
        >
          <Plus
            className="h-4 w-4"
            strokeWidth={2.5}
          />

          Create Task
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {successMessage ? (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-[#16A34A]">
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
            {error}
          </div>
        ) : null}

        <TaskFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />

        {isLoading ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">
            Loading tasks...
          </div>
        ) : (
<TaskTable
  tasks={filteredTasks}
  onTaskDelete={handleTaskDelete}
/>
        )}
      </div>

      <CreateTaskModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleTaskCreated}
      />
    </DashboardLayout>
  );
}