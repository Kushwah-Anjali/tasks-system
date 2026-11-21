import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import Swal from "sweetalert2";
import { Plus } from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import DashboardLayout from "../components/layout/DashboardLayout";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskTable from "../components/tasks/TaskTable";
import TaskWorkspaceModal, { type TaskModalMode } from "../components/tasks/TaskWorkspaceModal";
import {
    acceptTask,
    deleteTask,
    getCreatedByMe,
    getManagerTasks,
    getMyTasks,
    getTaskAssignees,
    type ManagerTaskListQuery,
    type TaskListSortField,
    type TaskPriorityFilter,
} from "../services/taskService";
import type { Task, TaskAssignee } from "../types/task";
import { getCurrentUser } from "../utils/authStorage";

interface PageMessage {
    type: "success" | "error";
    text: string;
}

const DEFAULT_SORT: SortingState = [{ id: "due_date", desc: false }];

export default function Tasks() {
    const user = getCurrentUser();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [assignedTaskCount, setAssignedTaskCount] = useState(0);
    const [createdTaskCount, setCreatedTaskCount] = useState(0);
    const [search, setSearch] = useState("");
    const [priority, setPriority] = useState<TaskPriorityFilter>("all");
    const [view, setView] = useState<"active" | "completed">("active");
    const [scope, setScope] = useState<"all" | "assigned" | "created">("all");
    const [assignedTo, setAssignedTo] = useState<number | "">("");
    const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
    const [isLoadingAssignees, setIsLoadingAssignees] = useState(true);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
    const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORT);
    const [settledQueryKey, setSettledQueryKey] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [message, setMessage] = useState<PageMessage>();
    const [workspaceMode, setWorkspaceMode] = useState<TaskModalMode>(null);
    const [workspaceTask, setWorkspaceTask] = useState<Task | null>(null);
    const [acceptingTaskId, setAcceptingTaskId] = useState<number | null>(null);

    const sort = sorting[0] || DEFAULT_SORT[0];
    const requestQuery = useMemo<ManagerTaskListQuery>(() => ({
        page: pageIndex + 1,
        pageSize,
        view,
        scope,
        priority,
        assignedTo: scope === "assigned" ? "" : assignedTo,
        search: search.trim(),
        sortBy: (scope === "assigned" && sort.id === "assigned_to_name"
            ? "created_by_name"
            : sort.id || "due_date") as TaskListSortField,
        sortDirection: sort.desc ? "desc" : "asc",
    }), [assignedTo, pageIndex, pageSize, priority, scope, search, sort.desc, sort.id, view]);
    const requestKey = useMemo(() => JSON.stringify(requestQuery), [requestQuery]);

    const currentUserId = user?.id;
    const fetchPersonalCounts = useCallback(async () => {
        if (currentUserId === undefined) return null;
        try {
            const [assignedTasks, createdTasks] = await Promise.all([
                getMyTasks(),
                getCreatedByMe(),
            ]);
            return {
                assigned: assignedTasks.filter((task) => task.assigned_to === currentUserId).length,
                created: createdTasks.length,
            };
        } catch {
            return null;
        }
    }, [currentUserId]);

    useEffect(() => {
        let active = true;
        Promise.all([getManagerTasks(requestQuery), fetchPersonalCounts()])
            .then(([result, counts]) => {
                if (!active) return;
                if (counts) {
                    setAssignedTaskCount(counts.assigned);
                    setCreatedTaskCount(counts.created);
                }
                const lastValidPage = Math.max(0, Math.ceil(result.total / pageSize) - 1);
                if (result.total > 0 && result.tasks.length === 0 && pageIndex > lastValidPage) {
                    setPageIndex(lastValidPage);
                    return;
                }
                setTasks(result.tasks);
                setTotalCount(result.total);
                setMessage(undefined);
            })
            .catch((error: unknown) => {
                if (!active) return;
                setTasks([]);
                setTotalCount(0);
                setMessage({
                    type: "error",
                    text: isAxiosError<{ message?: string }>(error)
                        ? error.response?.data?.message || "Unable to load tasks. Please try again."
                        : "Unable to load tasks. Please try again.",
                });
            })
            .finally(() => {
                if (active) setSettledQueryKey(requestKey);
            });
        return () => { active = false; };
    }, [fetchPersonalCounts, pageIndex, pageSize, requestKey, requestQuery]);

    useEffect(() => {
        let active = true;
        getTaskAssignees()
            .then((employees) => {
                if (active) setAssignees(employees);
            })
            .catch(() => {
                if (active) setMessage({ type: "error", text: "Unable to load employees for the task filter." });
            })
            .finally(() => {
                if (active) setIsLoadingAssignees(false);
            });
        return () => { active = false; };
    }, []);

    const refreshCurrentPage = useCallback(async (query = requestQuery) => {
        const [result, counts] = await Promise.all([getManagerTasks(query), fetchPersonalCounts()]);
        if (counts) {
            setAssignedTaskCount(counts.assigned);
            setCreatedTaskCount(counts.created);
        }
        const lastValidPage = Math.max(0, Math.ceil(result.total / pageSize) - 1);
        if (query.page - 1 > lastValidPage) {
            setPageIndex(lastValidPage);
            return;
        }
        setTasks(result.tasks);
        setTotalCount(result.total);
        setSettledQueryKey(JSON.stringify(query));
    }, [fetchPersonalCounts, pageSize, requestQuery]);

    useEffect(() => {
        let active = true;
        const refresh = () => {
            if (document.visibilityState !== "visible") return;
            Promise.all([getManagerTasks(requestQuery), fetchPersonalCounts()])
                .then(([result, counts]) => {
                    if (!active) return;
                    if (counts) {
                        setAssignedTaskCount(counts.assigned);
                        setCreatedTaskCount(counts.created);
                    }
                    const lastValidPage = Math.max(0, Math.ceil(result.total / pageSize) - 1);
                    if (result.total > 0 && result.tasks.length === 0 && pageIndex > lastValidPage) {
                        setPageIndex(lastValidPage);
                        return;
                    }
                    setTasks(result.tasks);
                    setTotalCount(result.total);
                    setSettledQueryKey(requestKey);
                })
                .catch(() => {
                    // Keep the current table visible when a background refresh fails.
                });
        };
        const interval = window.setInterval(refresh, 15000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [fetchPersonalCounts, pageIndex, pageSize, requestKey, requestQuery]);

    useEffect(() => {
        if (!message) return;
        const timer = window.setTimeout(() => setMessage(undefined), 4500);
        return () => window.clearTimeout(timer);
    }, [message]);

    const resetPage = () => setPageIndex(0);
    const handleViewChange = (nextView: "active" | "completed") => {
        if (nextView === view) return;
        setView(nextView);
        resetPage();
    };
    const handleScopeChange = (nextScope: "all" | "assigned" | "created") => {
        if (nextScope === scope) return;
        setScope(nextScope);
        setAssignedTo("");
        resetPage();
    };
    const handleClearFilters = () => {
        setSearch("");
        setAssignedTo("");
        setPriority("all");
        setSorting(DEFAULT_SORT);
        setPageIndex(0);
    };

    const handleTaskSaved = async () => {
        let refreshed = true;
        try {
            await refreshCurrentPage();
        } catch {
            refreshed = false;
            setMessage({ type: "error", text: "Task was saved, but the list could not refresh. It will update shortly." });
        }
        if (refreshed) setMessage(undefined);
        await Swal.fire({
            title: editingTask ? "Task updated" : "Task created",
            text: editingTask ? "Task changes were saved." : "Task was created successfully.",
            icon: "success",
            confirmButtonColor: "#2563EB",
        });
    };

    const refreshAfterAction = async (successText: string) => {
        try {
            await refreshCurrentPage();
            setMessage({ type: "success", text: successText });
        } catch {
            setMessage({ type: "error", text: "The task changed, but the list could not refresh. It will update shortly." });
        }
    };

    const handleAcceptTask = async (task: Task) => {
        try {
            setAcceptingTaskId(task.id);
            await acceptTask(task.id);
            await refreshAfterAction(`You accepted “${task.title}”.`);
        } catch (error: unknown) {
            setMessage({
                type: "error",
                text: isAxiosError<{ message?: string }>(error)
                    ? error.response?.data?.message || "Unable to accept this task."
                    : "Unable to accept this task.",
            });
        } finally {
            setAcceptingTaskId(null);
        }
    };

    const openWorkspace = (task: Task, mode: Exclude<TaskModalMode, "create" | "edit" | "delete" | null>) => {
        setWorkspaceTask(task);
        setWorkspaceMode(mode);
    };

    const handleTaskDelete = async (taskId: number) => {
        await deleteTask(taskId);

        const remainingCount = Math.max(0, totalCount - 1);
        const lastValidPage = Math.max(0, Math.ceil(remainingCount / pageSize) - 1);
        const nextPageIndex = Math.min(pageIndex, lastValidPage);
        const nextQuery = { ...requestQuery, page: nextPageIndex + 1 };

        setTotalCount(remainingCount);
        setPageIndex(nextPageIndex);
        if (nextPageIndex === pageIndex) {
            setTasks((current) => current.filter((task) => task.id !== taskId));
        } else {
            setTasks([]);
        }

        // The API confirmed deletion. Refresh from the server; retain the optimistic
        // removal and updated total if this follow-up read is temporarily unavailable.
        try {
            await refreshCurrentPage(nextQuery);
        } catch {
            // The confirmed deletion remains removed locally.
        }
    };

    if (!user) return null;

    const isLoading = settledQueryKey !== requestKey;
    return (
        <DashboardLayout user={user}>
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Tasks</h1>
                    <p className="mt-1 text-sm text-[#64748B]">Manage tasks assigned to you and work across your team.</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
                >
                    <Plus className="h-4 w-4" strokeWidth={2.5} /> Create Task
                </button>
            </div>

            <div className="mb-5 flex w-full max-w-xl items-center overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-1" role="tablist" aria-label="Task scope">
                {([
                    ["all", "All Team Tasks"],
                    ["assigned", `Assigned to Me (${assignedTaskCount})`],
                    ["created", `Created by Me (${createdTaskCount})`],
                ] as const).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={scope === value}
                        onClick={() => handleScopeChange(value)}
                        className={`h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${scope === value ? "bg-[#EFF6FF] text-[#1D4ED8]" : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-5">
                {message ? (
                    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${message.type === "success" ? "border-green-100 bg-green-50 text-[#16A34A]" : "border-red-100 bg-red-100 text-[#B91C1C]"}`} role={message.type === "error" ? "alert" : "status"}>
                        {message.text}
                    </div>
                ) : null}

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-4 text-sm text-slate-700">
                    <strong className="font-semibold text-blue-900">{scope === "all" ? "Team tasks" : scope === "assigned" ? "Assigned to you" : "Created by you"}</strong> — select a task title to see its current owner, assignment response, and forwarding history.
                </div>

                <TaskFilters
                    search={search}
                    onSearchChange={(value) => { setSearch(value); resetPage(); }}
                    priority={priority}
                    onPriorityChange={(value) => { setPriority(value); resetPage(); }}
                    view={view}
                    onViewChange={handleViewChange}
                    hideAssignedTo={scope === "assigned"}
                    assignees={assignees}
                    assignedTo={assignedTo}
                    onAssignedToChange={(value) => { setAssignedTo(value); resetPage(); }}
                    isLoadingAssignees={isLoadingAssignees}
                    onClearFilters={handleClearFilters}
                />

                {isLoading ? (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">Loading tasks...</div>
                ) : message?.type === "error" && tasks.length === 0 ? (
                    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">{message.text}</div>
                ) : (
                    <TaskTable
                        tasks={tasks}
                        totalCount={totalCount}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        sorting={sorting}
                        onPageIndexChange={setPageIndex}
                        onPageSizeChange={(value) => { setPageSize(value as 10 | 25 | 50); setPageIndex(0); }}
                        onSortingChange={(value) => { setSorting(value.length ? value : DEFAULT_SORT); setPageIndex(0); }}
                        onTaskEdit={(task) => { setEditingTask(task); setIsModalOpen(true); }}
                        onTaskDelete={handleTaskDelete}
                        personalScope={scope === "all" ? undefined : scope}
                        currentUserId={user.id}
                        onPersonalAction={openWorkspace}
                        onTaskAccept={handleAcceptTask}
                        acceptingTaskId={acceptingTaskId}
                    />
                )}
            </div>

            {isModalOpen ? <CreateTaskModal
                key={`${user.id}-${editingTask?.id ?? "new-task"}`}
                open={isModalOpen}
                accountUserId={user.id}
                task={editingTask}
                onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
                onCreated={handleTaskSaved}
            /> : null}
            {workspaceMode ? <TaskWorkspaceModal
                mode={workspaceMode}
                task={workspaceTask}
                assignees={assignees}
                currentUserId={user.id}
                onClose={() => { setWorkspaceMode(null); setWorkspaceTask(null); }}
                onSuccess={(text) => {
                    setWorkspaceMode(null);
                    setWorkspaceTask(null);
                    void refreshAfterAction(text);
                }}
            /> : null}
        </DashboardLayout>
    );
}
