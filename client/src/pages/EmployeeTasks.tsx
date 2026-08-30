import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";

import TaskSummaryCards from "../components/employeeTasks/TaskSummaryCards";
import EmployeeTaskTable from "../components/tasks/EmployeeTaskTable";
import TaskDetailsModal from "../components/tasks/TaskDetailsModal";

import { getMyTasks } from "../services/taskService";

import type { Task } from "../types/task";

interface StoredUser {
    id: number;
    full_name: string;
    email: string;
    role: "manager" | "employee";
}

const getStoredUser = (): StoredUser | null => {
    const storedUser =
        localStorage.getItem("user");

    if (!storedUser) return null;

    try {
        return JSON.parse(
            storedUser
        ) as StoredUser;
    } catch {
        localStorage.removeItem("user");
        return null;
    }
};

const getInitials = (name: string): string => {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
};

export default function EmployeeTasks() {
    const user = getStoredUser();

    const [tasks, setTasks] = useState<
        Task[]
    >([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [selectedTask, setSelectedTask] =
        useState<Task | null>(null);

    const loadTasks = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const employeeTasks =
                await getMyTasks();

            setTasks(employeeTasks);
        } catch {
            setErrorMessage(
                "Unable to load your tasks. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);

    const summary = useMemo(() => {
        const completed = tasks.filter(
            (task) =>
                task.status === "completed"
        ).length;

        const inProgress = tasks.filter(
            (task) =>
                task.status === "in_progress"
        ).length;

        const pending = tasks.filter(
            (task) =>
                task.status === "assigned" ||
                task.status === "submitted"
        ).length;

        return {
            total: tasks.length,
            completed,
            inProgress,
            pending,
        };
    }, [tasks]);

    const handleTaskUpdated = (
        updatedTask: Task
    ) => {
        setTasks((currentTasks) =>
            currentTasks.map((task) =>
                task.id === updatedTask.id
                    ? updatedTask
                    : task
            )
        );

        setSelectedTask(updatedTask);
    };

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
                <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
                    Your login information is
                    missing. Please log in again.
                </div>
            </div>
        );
    }

    return (
        <EmployeeDashboardLayout
            employeeName={user.full_name}
            employeeInitials={getInitials(
                user.full_name
            )}
        >
            <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                    My Tasks
                </h1>

                <p className="mt-1 text-sm text-[#64748B]">
                    View and update tasks assigned
                    to you.
                </p>
            </div>

            <div className="flex flex-col gap-5">
                <TaskSummaryCards
                    total={summary.total}
                    inProgress={
                        summary.inProgress
                    }
                    completed={
                        summary.completed
                    }
                    pending={summary.pending}
                />

                {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
                        {errorMessage}
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
                        <p className="text-sm text-[#64748B]">
                            Loading your tasks...
                        </p>
                    </div>
                ) : (
                    <EmployeeTaskTable
                        tasks={tasks}
                        onView={setSelectedTask}
                    />
                )}
            </div>

            <TaskDetailsModal
                task={selectedTask}
                onClose={() =>
                    setSelectedTask(null)
                }
                onUpdated={
                    handleTaskUpdated
                }
            />
        </EmployeeDashboardLayout>
    );
}