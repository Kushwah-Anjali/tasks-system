import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { Plus } from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskTable from "../components/tasks/TaskTable";

import {
    deleteTask,
    getAllTasks,
} from "../services/taskService";

import type {
    Task,
    TaskStatus,
} from "../types/task";

import { getCurrentUser } from "../utils/authStorage";

interface PageMessage {
    type: "success" | "error";
    text: string;
}

export default function Tasks() {
    const user = getCurrentUser();

    const [tasks, setTasks] = useState<
        Task[]
    >([]);

    const [search, setSearch] =
        useState("");

    const [status, setStatus] = useState<
        TaskStatus | ""
    >("");

    const [isModalOpen, setIsModalOpen] =
        useState(false);

    const [isLoading, setIsLoading] =
        useState(true);

    const [message, setMessage] =
        useState<PageMessage>();

    const loadTasks =
        useCallback(async () => {
            try {
                setIsLoading(true);
                setMessage(undefined);

                const allTasks =
                    await getAllTasks();

                setTasks(allTasks);
            } catch {
                setMessage({
                    type: "error",
                    text: "Unable to load tasks. Please try again.",
                });
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        if (!message) return;

        const timer = window.setTimeout(
            () => {
                setMessage(undefined);
            },
            4000
        );

        return () => {
            window.clearTimeout(timer);
        };
    }, [message]);

    const filteredTasks = useMemo(() => {
        const query = search
            .trim()
            .toLowerCase();

        return tasks.filter((task) => {
            const employeeName =
                task.assigned_to_name ?? "";

            const matchesSearch =
                !query ||
                task.title
                    .toLowerCase()
                    .includes(query) ||
                employeeName
                    .toLowerCase()
                    .includes(query);

            const matchesStatus =
                !status ||
                task.status === status;

            return (
                matchesSearch &&
                matchesStatus
            );
        });
    }, [tasks, search, status]);

    const handleTaskCreated =
        async () => {
            await loadTasks();

            setMessage({
                type: "success",
                text: "Task created successfully.",
            });
        };

    const handleTaskDelete = async (
        taskId: number
    ) => {
        try {
            await deleteTask(taskId);

            setTasks((currentTasks) =>
                currentTasks.filter(
                    (task) =>
                        task.id !== taskId
                )
            );

            setMessage({
                type: "success",
                text: "Task deleted successfully.",
            });
        } catch {
            setMessage({
                type: "error",
                text: "Failed to delete task.",
            });
        }
    };

    if (!user) return null;

    return (
        <DashboardLayout user={user}>
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                        Tasks
                    </h1>

                    <p className="mt-1 text-sm text-[#64748B]">
                        Manage and track all
                        tasks across your team.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        setIsModalOpen(true)
                    }
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
                >
                    <Plus
                        className="h-4 w-4"
                        strokeWidth={2.5}
                    />

                    Create Task
                </button>
            </div>

            <div className="flex flex-col gap-5">
                {message ? (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                            message.type ===
                            "success"
                                ? "border-green-100 bg-green-50 text-[#16A34A]"
                                : "border-red-100 bg-red-50 text-[#EF4444]"
                        }`}
                    >
                        {message.text}
                    </div>
                ) : null}

                <TaskFilters
                    search={search}
                    onSearchChange={setSearch}
                    status={status}
                    onStatusChange={
                        setStatus
                    }
                />

                {isLoading ? (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">
                        Loading tasks...
                    </div>
                ) : (
                    <TaskTable
                        tasks={
                            filteredTasks
                        }
                        onTaskDelete={
                            handleTaskDelete
                        }
                    />
                )}
            </div>

            <CreateTaskModal
                open={isModalOpen}
                onClose={() =>
                    setIsModalOpen(false)
                }
                onCreated={
                    handleTaskCreated
                }
            />
        </DashboardLayout>
    );
}