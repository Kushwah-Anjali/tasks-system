import TaskStatusBadge, { ResponseStatusBadge as AssignmentBadge } from "../components/tasks/TaskStatusBadge";
import {
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    Check,
    Eye,
    Pencil,
    Plus,
    Trash2,
    X,
    ArrowRightLeft,
} from "lucide-react";

import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";

import TaskWorkspaceModal, {
    type TaskModalMode,
} from "../components/tasks/TaskWorkspaceModal";

import {
    acceptTask,
    getCreatedByMe,
    getMyTasks,
    getTaskAssignees,
} from "../services/taskService";

import type {
    Task,
    TaskAssignee,
} from "../types/task";

import {
    getCurrentUser,
} from "../utils/authStorage";


type TaskTab =
    | "assigned"
    | "created";


// =====================================
// Helpers
// =====================================

const getInitials = (
    name: string
): string =>
    name
        .trim()
        .split(/\s+/)
        .map(
            (part) =>
                part[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase();


const formatDate = (
    value:
        | string
        | null
        | undefined
): string => {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            `${value.slice(
                0,
                10
            )}T00:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
};


// =====================================
// Component
// =====================================

export default function EmployeeTasks() {
    const user =
        getCurrentUser();

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<TaskTab>(
            "assigned"
        );

    const [
        assignedTasks,
        setAssignedTasks,
    ] =
        useState<Task[]>([]);

    const [
        createdTasks,
        setCreatedTasks,
    ] =
        useState<Task[]>([]);

    const [
        assignees,
        setAssignees,
    ] =
        useState<
            TaskAssignee[]
        >([]);

    const [
        selectedTask,
        setSelectedTask,
    ] =
        useState<Task | null>(
            null
        );

    const [
        modalMode,
        setModalMode,
    ] =
        useState<TaskModalMode>(
            null
        );

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(true);

    const [
        acceptingTaskId,
        setAcceptingTaskId,
    ] =
        useState<
            number | null
        >(null);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState("");

    const [
        successMessage,
        setSuccessMessage,
    ] =
        useState("");


    // =====================================
    // Load Tasks
    // =====================================

    const loadTasks =
        useCallback(
            async () => {
                try {
                    setIsLoading(
                        true
                    );

                    setErrorMessage(
                        ""
                    );

                    const [
                        assigned,
                        created,
                        employees,
                    ] =
                        await Promise.all(
                            [
                                getMyTasks(),
                                getCreatedByMe(),
                                getTaskAssignees(),
                            ]
                        );

                    setAssignedTasks(
                        assigned
                    );

                    setCreatedTasks(
                        created
                    );

                    setAssignees(
                        employees
                    );

                } catch {
                    setErrorMessage(
                        "Unable to load tasks."
                    );

                } finally {
                    setIsLoading(
                        false
                    );
                }
            },
            []
        );


    useEffect(() => {
        void loadTasks();
    }, [loadTasks]);


    if (!user) {
        return null;
    }


    // =====================================
    // Modal
    // =====================================

    const openModal = (
        mode: TaskModalMode,
        task: Task | null =
            null
    ) => {
        setSelectedTask(
            task
        );

        setModalMode(
            mode
        );
    };


    const closeModal = () => {
        setSelectedTask(
            null
        );

        setModalMode(
            null
        );
    };


    // =====================================
    // Refresh After Changes
    // =====================================

    const handleSuccess = (
        message: string
    ) => {
        setSuccessMessage(
            message
        );

        setErrorMessage(
            ""
        );

        void loadTasks();
    };


    // =====================================
    // Accept
    //
    // Works for:
    // - initial assignment
    // - handoff request
    // =====================================

    const handleAccept =
        async (
            task: Task
        ) => {
            try {
                setAcceptingTaskId(
                    task.id
                );

                setErrorMessage(
                    ""
                );

                setSuccessMessage(
                    ""
                );

                await acceptTask(
                    task.id
                );

                setSuccessMessage(
                    `You accepted "${task.title}".`
                );

                await loadTasks();

            } catch {
                setErrorMessage(
                    "Unable to accept task."
                );

            } finally {
                setAcceptingTaskId(
                    null
                );
            }
        };


    const tasks =
        activeTab ===
        "assigned"
            ? assignedTasks
            : createdTasks;


    // =====================================
    // Render
    // =====================================

    return (
        <EmployeeDashboardLayout
            employeeId={user.id}
            employeeName={
                user.full_name
            }
            employeeInitials={
                getInitials(
                    user.full_name
                )
            }
        >

            {/* Header */}

            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                    <h1 className="text-2xl font-bold text-[#0F172A]">
                        Tasks
                    </h1>

                    <p className="mt-1 text-sm text-[#64748B]">
                        Manage tasks assigned to you and work you assign to others.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        openModal(
                            "create"
                        )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
                >
                    <Plus className="h-4 w-4" />

                    Create Task
                </button>

            </div>


            {/* Success */}

            {successMessage ? (
                <div className="mb-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {
                        successMessage
                    }
                </div>
            ) : null}


            {/* Error */}

            {errorMessage ? (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {
                        errorMessage
                    }
                </div>
            ) : null}


            {/* Table Container */}

            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">

                {/* Tabs */}

                <div className="flex overflow-x-auto border-b border-[#E2E8F0] p-2">

                    <Tab
                        active={
                            activeTab ===
                            "assigned"
                        }
                        onClick={() =>
                            setActiveTab(
                                "assigned"
                            )
                        }
                    >
                        Assigned to Me{" "}
                        (
                        {
                            assignedTasks.length
                        }
                        )
                    </Tab>


                    <Tab
                        active={
                            activeTab ===
                            "created"
                        }
                        onClick={() =>
                            setActiveTab(
                                "created"
                            )
                        }
                    >
                        Created by Me{" "}
                        (
                        {
                            createdTasks.length
                        }
                        )
                    </Tab>

                </div>


                <p className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    {activeTab === "assigned" ? "Highlighted rows need your response. Accept or reject new assignments; open View / Submit when your work is ready." : "Track the work you assigned, make edits, and review submitted tasks."}
                </p>

                {/* Loading */}

                {isLoading ? (

                    <div className="p-12 text-center text-sm text-[#64748B]">
                        Loading tasks...
                    </div>

                ) : tasks.length === 0 ? (

                    <div className="p-12 text-center text-sm text-[#64748B]">
                        No tasks found.
                    </div>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="app-table app-action-table w-full min-w-[1000px] text-left">

                            {/* Header */}

                            <thead className="bg-[#F8FAFC]">

                                <tr>

                                    <Th>
                                        Task
                                    </Th>

                                    <Th>
                                        {activeTab ===
                                        "assigned"
                                            ? "Assigned By"
                                            : "Assigned To"}
                                    </Th>

                                    <Th>
                                        Assigned
                                    </Th>

                                    <Th>
                                        Due
                                    </Th>

                                    <Th>
                                        Acceptance
                                    </Th>

                                    <Th>
                                        Status
                                    </Th>

                                    <Th>
                                        Forward
                                    </Th>

                                    <Th>
                                        Actions
                                    </Th>

                                </tr>

                            </thead>


                            {/* Body */}

                            <tbody>

                                {tasks.map(
                                    (
                                        task
                                    ) => {

                                        // ---------------------------------
                                        // Initial assignment waiting
                                        // ---------------------------------

                                        const isInitialPending =
                                            task.assigned_to ===
                                                user.id &&
                                            task.assignment_status ===
                                                "pending";


                                        // ---------------------------------
                                        // This user is receiving a handoff
                                        // ---------------------------------

                                        const isPendingHandoffReceiver =
                                            task.pending_assignee_id ===
                                            user.id;


                                        // ---------------------------------
                                        // User can accept/reject
                                        // ---------------------------------

                                        const canRespond =
                                            activeTab ===
                                                "assigned" &&
                                            (
                                                isInitialPending ||
                                                isPendingHandoffReceiver
                                            );


                                        // ---------------------------------
                                        // Current owner can hand off
                                        // ---------------------------------

                                        const canHandoff =
                                            activeTab ===
                                                "assigned" &&
                                            task.assigned_to ===
                                                user.id &&
                                            task.assignment_status ===
                                                "accepted" &&
                                            !task.pending_assignee_id &&
                                            task.status !==
                                                "submitted" &&
                                            task.status !==
                                                "completed";


                                        // ---------------------------------
                                        // Creator actions
                                        // ---------------------------------

                                        const canEditOrDelete =
                                            activeTab ===
                                                "created" &&
                                            task.status !==
                                                "completed";


                                        const canReview =
                                            activeTab ===
                                                "created" &&
                                            task.status ===
                                                "submitted";


                                        return (
                                            <tr
                                                key={
                                                    task.id
                                                }
                                                className={"border-t border-[#E2E8F0] transition hover:bg-[#F8FAFC]/70 " + (canRespond ? "task-row-attention" : "")}
                                            >

                                                {/* Task */}

                                                <Td>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openModal(
                                                                "view",
                                                                task
                                                            )
                                                        }
                                                        className="max-w-[280px] text-left text-base font-bold text-[#0F172A] hover:text-[#2563EB]"
                                                    >
                                                        {
                                                            task.title
                                                        }
                                                    </button>

                                                </Td>


                                                {/* Assigned By / To */}

                                                <Td>
                                                    {activeTab ===
                                                    "assigned"
                                                        ? task.created_by_name ||
                                                          "—"
                                                        : task.assigned_to_name ||
                                                          "—"}
                                                </Td>


                                                {/* Assigned Date */}

                                                <Td>
                                                    {
                                                        formatDate(
                                                            task.assigned_date
                                                        )
                                                    }
                                                </Td>


                                                {/* Due */}

                                                <Td>
                                                    {
                                                        formatDate(
                                                            task.due_date
                                                        )
                                                    }
                                                </Td>


                                                {/* Acceptance */}

                                                <Td>

                                                    {isPendingHandoffReceiver ? (

                                                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                                                            Forward Pending
                                                        </span>

                                                    ) : (

                                                        <AssignmentBadge
                                                            status={
                                                                task.assignment_status
                                                            }
                                                        />

                                                    )}

                                                </Td>


                                                {/* Status */}

                                                <Td>
                                                    <TaskStatusBadge
                                                        status={
                                                            task.status
                                                        }
                                                    />
                                                </Td>


                                                {/* Handoff */}

                                                <Td>

                                                    {task.pending_assignee_id ? (

                                                        <div className="max-w-[180px]">

                                                            <p className="text-xs font-medium text-amber-700">
                                                                Waiting for
                                                            </p>

                                                            <p className="mt-0.5 text-sm font-semibold text-[#334155]">
                                                                {
                                                                    task.pending_assignee_name ||
                                                                    "Employee"
                                                                }
                                                            </p>

                                                        </div>

                                                    ) : (

                                                        <span className="text-sm text-[#64748B]">
                                                            —
                                                        </span>

                                                    )}

                                                </Td>


                                                {/* Actions */}

                                                <Td>

                                                    <div className="flex min-w-[260px] flex-wrap items-center gap-2">

                                                        {/* Accept / Reject */}

                                                        {canRespond ? (
                                                            <>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        acceptingTaskId ===
                                                                        task.id
                                                                    }
                                                                    onClick={() =>
                                                                        void handleAccept(
                                                                            task
                                                                        )
                                                                    }
                                                                    title="Accept"
                                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-current/15 px-3 text-xs font-semibold bg-green-600 text-white transition hover:bg-green-700 disabled:opacity-50"
                                                                >
                                                                    <Check className="h-4 w-4" /> Accept
                                                                </button>


                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        acceptingTaskId ===
                                                                        task.id
                                                                    }
                                                                    onClick={() =>
                                                                        openModal(
                                                                            "reject",
                                                                            task
                                                                        )
                                                                    }
                                                                    title="Reject"
                                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-current/15 px-3 text-xs font-semibold bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                                                >
                                                                    <X className="h-4 w-4" /> Reject
                                                                </button>

                                                            </>
                                                        ) : null}


                                                        {/* View */}

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openModal(
                                                                    "view",
                                                                    task
                                                                )
                                                            }
                                                            title="View"
                                                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-current/15 px-3 text-xs font-semibold text-[#64748B] transition hover:bg-[#F1F5F9]"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {canHandoff ? "View / Submit" : "View"}
                                                        </button>


                                                        {/* Forward Task */}

                                                        {canHandoff ? (

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openModal(
                                                                        "handoff",
                                                                        task
                                                                    )
                                                                }
                                                                title="Forward Task"
                                                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-[#475569] transition hover:bg-[#F8FAFC]"
                                                            >
                                                                <ArrowRightLeft className="h-4 w-4" />

                                                                Forward Task
                                                            </button>

                                                        ) : null}


                                                        {/* Creator Edit/Delete */}

                                                        {canEditOrDelete ? (
                                                            <>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openModal(
                                                                            "edit",
                                                                            task
                                                                        )
                                                                    }
                                                                    title="Edit"
                                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-current/15 px-3 text-xs font-semibold text-[#64748B] transition hover:bg-[#F1F5F9]"
                                                                >
                                                                    <Pencil className="h-4 w-4" /> Edit
                                                                </button>


                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openModal(
                                                                            "delete",
                                                                            task
                                                                        )
                                                                    }
                                                                    title="Delete"
                                                                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-current/15 px-3 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" /> Delete
                                                                </button>

                                                            </>
                                                        ) : null}


                                                        {/* Review */}

                                                        {canReview ? (

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openModal(
                                                                        "review",
                                                                        task
                                                                    )
                                                                }
                                                                className="ml-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                                                            >
                                                                Review
                                                            </button>

                                                        ) : null}

                                                    </div>

                                                </Td>

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>


            {/* Modal */}

            <TaskWorkspaceModal
                mode={
                    modalMode
                }
                task={
                    selectedTask
                }
                assignees={
                    assignees
                }
                currentUserId={
                    user.id
                }
                onClose={
                    closeModal
                }
                onSuccess={
                    handleSuccess
                }
            />

        </EmployeeDashboardLayout>
    );
}


// =====================================
// Tab
// =====================================

function Tab({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                    ? "bg-blue-100 text-blue-800 shadow-[inset_0_-3px_0_#2563EB]"
                    : "text-[#64748B] hover:bg-[#F8FAFC]"
            }`}
        >
            {
                children
            }
        </button>
    );
}


// =====================================
// Table Header
// =====================================

function Th({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
            {
                children
            }
        </th>
    );
}


// =====================================
// Table Cell
// =====================================

function Td({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <td className="px-4 py-4 align-middle text-sm text-[#334155]">
            {
                children
            }
        </td>
    );
}
