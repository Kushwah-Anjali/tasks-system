import TaskStatusBadge, { ResponseStatusBadge as AssignmentStatusBadge } from "./TaskStatusBadge";
import { TaskAgingBadge, TaskPriorityBadge } from "./TaskIndicators";
import { TaskOverviewField, TaskOverviewGrid } from "./TaskOverviewGrid";
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    ReactNode,
} from "react";

import AppModal from "../ui/AppModal";

import {
    createTask,
    deleteTask,
    handoffTask,
    rejectTask,
    reviewTask,
    submitTask,
    updateTask,
} from "../../services/taskService";

import type {
    Task,
    TaskAssignee,
} from "../../types/task";


export type TaskModalMode =
    | "create"
    | "view"
    | "edit"
    | "delete"
    | "reject"
    | "handoff"
    | "review"
    | null;


interface TaskWorkspaceModalProps {
    mode: TaskModalMode;

    task: Task | null;

    assignees: TaskAssignee[];

    currentUserId: number;

    onClose: () => void;

    onSuccess: (
        message: string
    ) => void;
}


// =====================================
// Helpers
// =====================================

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


const getStatusLabel = (
    status: Task["status"]
): string => {
    const labels:
        Record<
            Task["status"],
            string
        > = {
        assigned:
            "Assigned",

        in_progress:
            "In Progress",

        submitted:
            "Submitted",

        under_review:
            "Under Review",

        changes_required:
            "Changes Required",

        completed:
            "Completed",
    };

    return labels[status];
};


const getAssignmentLabel = (
    status:
        Task["assignment_status"]
): string => {
    const labels:
        Record<
            Task["assignment_status"],
            string
        > = {
        pending:
            "Pending",

        accepted:
            "Accepted",

        rejected:
            "Rejected",
    };

    return labels[status];
};


// =====================================
// Component
// =====================================

export default function TaskWorkspaceModal({
    mode,
    task,
    assignees,
    currentUserId,
    onClose,
    onSuccess,
}: TaskWorkspaceModalProps) {

    // ---------------------------------
    // Create / Edit
    // ---------------------------------

    const [
        title,
        setTitle,
    ] = useState("");

    const [
        assignedTo,
        setAssignedTo,
    ] = useState("");

    const [
        dueDate,
        setDueDate,
    ] = useState("");


    // ---------------------------------
    // Reject
    // ---------------------------------

    const [
        rejectionReason,
        setRejectionReason,
    ] = useState("");


    // ---------------------------------
    // Handoff
    // ---------------------------------

    const [
        handoffTo,
        setHandoffTo,
    ] = useState("");

    const [
        handoffNote,
        setHandoffNote,
    ] = useState("");


    // ---------------------------------
    // Review
    // ---------------------------------

    const [
        reviewAction,
        setReviewAction,
    ] =
        useState<
            | "completed"
            | "changes_required"
        >("completed");

    const [
        reviewNote,
        setReviewNote,
    ] = useState("");


    // ---------------------------------
    // UI State
    // ---------------------------------

    const [
        isSaving,
        setIsSaving,
    ] = useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");


    // =====================================
    // Reset form when modal changes
    // =====================================

    useEffect(() => {
        setErrorMessage("");
        setIsSaving(false);

        if (
            mode === "create"
        ) {
            setTitle("");
            setAssignedTo("");
            setDueDate("");
        }


        if (
            mode === "edit" &&
            task
        ) {
            setTitle(
                task.title
            );

            setAssignedTo(
                String(
                    task.assigned_to
                )
            );

            setDueDate(
                task.due_date?.slice(0, 10) || ""
            );
        }


        if (
            mode === "reject"
        ) {
            setRejectionReason("");
        }


        if (
            mode === "handoff"
        ) {
            setHandoffTo("");
            setHandoffNote("");
        }


        if (
            mode === "review"
        ) {
            setReviewAction(
                "completed"
            );

            setReviewNote(
                task?.review_note ||
                ""
            );
        }

    }, [
        mode,
        task,
    ]);


    // =====================================
    // Modal Title
    // =====================================

    const modalTitle =
        useMemo(() => {

            switch (mode) {

                case "create":
                    return "Create Task";

                case "edit":
                    return "Edit Task";

                case "delete":
                    return "Delete Task";

                case "reject":
                    return "Reject Task";

                case "handoff":
                    return "Forward Task";

                case "review":
                    return "Review Task";

                default:
                    return "Task Details";
            }

        }, [mode]);


    // =====================================
    // Create
    // =====================================

    const handleCreate =
        async () => {

            if (
                !title.trim() ||
                !assignedTo ||
                !dueDate
            ) {
                setErrorMessage(
                    "Title, team member and due date are required."
                );

                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await createTask({
                    title:
                        title.trim(),

                    assigned_to:
                        Number(
                            assignedTo
                        ),

                    due_date:
                        dueDate,
                });

                onSuccess(
                    "Task created successfully."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to create task."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Edit
    // =====================================

    const handleEdit =
        async () => {

            if (
                !task ||
                !title.trim() ||
                !assignedTo ||
                !dueDate
            ) {
                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await updateTask(
                    task.id,
                    {
                        title:
                            title.trim(),

                        assigned_to:
                            Number(
                                assignedTo
                            ),

                        due_date:
                            dueDate,
                    }
                );

                onSuccess(
                    "Task updated successfully."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to update task."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Reject
    // =====================================

    const handleReject =
        async () => {

            if (!task) {
                return;
            }

            if (
                !rejectionReason.trim()
            ) {
                setErrorMessage(
                    "Please give a reason for rejecting this task."
                );

                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await rejectTask(
                    task.id,
                    rejectionReason.trim()
                );

                onSuccess(
                    "Task rejected."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to reject task."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Hand Off
    // =====================================

    const handleHandoff =
        async () => {

            if (!task) {
                return;
            }

            if (
                !handoffTo
            ) {
                setErrorMessage(
                    "Please select a team member."
                );

                return;
            }

            if (
                !handoffNote.trim()
            ) {
                setErrorMessage(
                    "Please write a reply."
                );

                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await handoffTask(
                    task.id,
                    {
                        assigned_to:
                            Number(
                                handoffTo
                            ),

                        note:
                            handoffNote,
                    }
                );

                onSuccess(
                    "Forward request sent."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to forward task."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Delete
    // =====================================

    const handleDelete =
        async () => {

            if (!task) {
                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await deleteTask(
                    task.id
                );

                onSuccess(
                    "Task deleted successfully."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to delete task."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Submit
    // =====================================

    const handleSubmit =
        async () => {

            if (!task) {
                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await submitTask(
                    task.id
                );

                onSuccess(
                    "Work submitted for review."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to submit work."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Review
    // =====================================

    const handleReview =
        async () => {

            if (!task) {
                return;
            }

            if (
                reviewAction ===
                    "changes_required" &&
                !reviewNote.trim()
            ) {
                setErrorMessage(
                    "Please explain what needs to be changed."
                );

                return;
            }

            try {
                setIsSaving(true);
                setErrorMessage("");

                await reviewTask(
                    task.id,
                    {
                        status:
                            reviewAction,

                        review_note:
                            reviewNote.trim() ||
                            null,
                    }
                );

                onSuccess(
                    reviewAction ===
                        "completed"
                        ? "Task completed."
                        : "Changes requested."
                );

                onClose();

            } catch {
                setErrorMessage(
                    "Unable to review task."
                );

            } finally {
                setIsSaving(false);
            }
        };


    // =====================================
    // Styles
    // =====================================

    const fieldClass =
        "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";

    const textareaClass =
        "w-full resize-none rounded-xl border border-[#E2E8F0] bg-slate-50 p-4.5 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";


    // =====================================
    // Footer
    // =====================================

    let footer:
        ReactNode |
        undefined;


    if (
        mode === "create"
    ) {
        footer = (
            <ModalButtons
                onCancel={
                    onClose
                }
                actionLabel={
                    isSaving
                        ? "Creating..."
                        : "Create Task"
                }
                onAction={() =>
                    void handleCreate()
                }
                disabled={
                    isSaving
                }
            />
        );
    }


    if (
        mode === "edit"
    ) {
        footer = (
            <ModalButtons
                onCancel={
                    onClose
                }
                actionLabel={
                    isSaving
                        ? "Saving..."
                        : "Save Changes"
                }
                onAction={() =>
                    void handleEdit()
                }
                disabled={
                    isSaving
                }
            />
        );
    }


    if (
        mode === "reject"
    ) {
        footer = (
            <ModalButtons
                onCancel={
                    onClose
                }
                actionLabel={
                    isSaving
                        ? "Rejecting..."
                        : "Reject Task"
                }
                onAction={() =>
                    void handleReject()
                }
                disabled={
                    isSaving
                }
                danger
            />
        );
    }


    if (
        mode === "handoff"
    ) {
        footer = (
            <ModalButtons
                onCancel={
                    onClose
                }
                actionLabel={
                    isSaving
                        ? "Sending..."
                        : "Forward Task"
                }
                onAction={() =>
                    void handleHandoff()
                }
                disabled={
                    isSaving
                }
            />
        );
    }


    if (
        mode === "delete"
    ) {
        footer = (
            <ModalButtons
                onCancel={
                    onClose
                }
                actionLabel={
                    isSaving
                        ? "Deleting..."
                        : "Delete Task"
                }
                onAction={() =>
                    void handleDelete()
                }
                disabled={
                    isSaving
                }
                danger
            />
        );
    }


    if (
        mode === "review"
    ) {
        footer = (
            <ModalButtons
                onCancel={
                    onClose
                }
                actionLabel={
                    isSaving
                        ? "Saving..."
                        : "Save Review"
                }
                onAction={() =>
                    void handleReview()
                }
                disabled={
                    isSaving
                }
            />
        );
    }


    // =====================================
    // Render
    // =====================================

    return (
        <AppModal
            open={
                mode !== null
            }
            onClose={
                onClose
            }
            title={
                modalTitle
            }
            size="lg"
            footer={
                footer
            }
        >
            <div className="flex flex-col gap-6">

                {/* Error */}

                {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                        {
                            errorMessage
                        }
                    </div>
                ) : null}


                {/* =================================
                    CREATE / EDIT
                ================================= */}

                {(
                    mode ===
                        "create" ||
                    mode ===
                        "edit"
                ) ? (
                    <>

                        {/* Title */}

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Task title
                            </label>

                            <input
                                value={
                                    title
                                }
                                onChange={(
                                    event
                                ) =>
                                    setTitle(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="What needs to be done?"
                                className={
                                    fieldClass
                                }
                            />
                        </div>


                        {/* Employee */}

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Assign to
                            </label>

                            <select
                                value={
                                    assignedTo
                                }
                                onChange={(
                                    event
                                ) =>
                                    setAssignedTo(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className={
                                    fieldClass
                                }
                            >
                                <option value="">
                                    Select team member
                                </option>

                                {assignees.map(
                                    (
                                        employee
                                    ) => (
                                        <option
                                            key={
                                                employee.id
                                            }
                                            value={
                                                employee.id
                                            }
                                        >
                                            {employee.full_name} — {employee.role === "manager" ? "Manager" : "Employee"}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>


                        {/* Due Date */}

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Due date
                            </label>

                            <input
                                type="date"
                                value={
                                    dueDate
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDueDate(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className={
                                    fieldClass
                                }
                            />
                        </div>
                    </>
                ) : null}


                {/* =================================
                    VIEW
                ================================= */}

                {mode === "view" &&
                task ? (
                    <>

                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                                <div>
                                    <h3 className="text-lg font-bold text-[#0F172A]">
                                        {
                                            task.title
                                        }
                                    </h3>

                                    <div className="mt-3"><TaskStatusBadge status={task.status} /></div>
                                </div>

                                <AssignmentStatusBadge
                                    status={
                                        task.assignment_status
                                    }
                                />

                            </div>
                        </div>


                        {/* Task Info */}

                        <TaskOverviewGrid>
                            <TaskOverviewField label="Creator">
                                {task.created_by_name || "\u2014"}
                            </TaskOverviewField>
                            <TaskOverviewField label="Current Assignee">
                                {task.assigned_to_name || "\u2014"}
                            </TaskOverviewField>
                            <TaskOverviewField label="Due Date">
                                <span className="block">{formatDate(task.due_date)}</span>
                                <span className="mt-1 flex flex-col items-start">
                                    <TaskAgingBadge task={task} wrap />
                                </span>
                            </TaskOverviewField>
                            <TaskOverviewField label="Assigned Date">
                                {formatDate(task.assigned_date)}
                            </TaskOverviewField>
                            <TaskOverviewField label="Task Status">
                                {getStatusLabel(task.status)}
                            </TaskOverviewField>
                            <TaskOverviewField label="Priority">
                                <TaskPriorityBadge priority={task.priority} />
                            </TaskOverviewField>
                            <TaskOverviewField label="Acceptance">
                                {getAssignmentLabel(task.assignment_status)}
                            </TaskOverviewField>
                        </TaskOverviewGrid>


                        {/* Pending Handoff */}

                        {task.pending_assignee_id ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                    Forward Pending
                                </p>

                                <p className="mt-2 text-sm text-amber-800">
                                    Waiting for{" "}
                                    <strong>
                                        {
                                            task.pending_assignee_name ||
                                            "the selected team member"
                                        }
                                    </strong>{" "}
                                    to accept or reject this task.
                                </p>

                            </div>
                        ) : null}


                        {/* Initial rejection */}

                        {task.rejection_reason ? (
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                                    Rejection Reason
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
                                    {
                                        task.rejection_reason
                                    }
                                </p>

                            </div>
                        ) : null}


                        {/* Submit */}

                        {task.assigned_to ===
                            currentUserId &&
                        task.assignment_status ===
                            "accepted" &&
                        !task.pending_assignee_id &&
                        task.status !==
                            "submitted" &&
                        task.status !==
                            "completed" ? (

                            <button
                                type="button"
                                disabled={
                                    isSaving
                                }
                                onClick={() =>
                                    void handleSubmit()
                                }
                                className="w-full rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {
                                    isSaving
                                        ? "Submitting..."
                                        : "Submit Work"
                                }
                            </button>

                        ) : null}

                    </>
                ) : null}


                {/* =================================
                    REJECT
                ================================= */}

                {mode === "reject" &&
                task ? (
                    <>

                        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">

                            <p className="text-xs font-medium text-[#64748B]">
                                Task
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {
                                    task.title
                                }
                            </p>

                        </div>


                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Why are you rejecting this task?
                            </label>

                            <textarea
                                value={
                                    rejectionReason
                                }
                                onChange={(
                                    event
                                ) =>
                                    setRejectionReason(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                rows={5}
                                placeholder="Example: This task belongs to another department, I do not have access to the required information..."
                                className={
                                    textareaClass
                                }
                            />
                        </div>

                    </>
                ) : null}


                {/* =================================
                    FORWARD
                ================================= */}

                {mode === "handoff" &&
                task ? (
                    <>

                        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">

                            <p className="text-xs font-medium text-[#64748B]">
                                Current Task
                            </p>

                            <p className="mt-1 font-semibold text-[#0F172A]">
                                {
                                    task.title
                                }
                            </p>

                            <p className="mt-2 text-xs text-[#64748B]">
                                You remain responsible until the next team member accepts the forward request.
                            </p>

                        </div>


                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Forward to
                            </label>

                            <select
                                value={
                                    handoffTo
                                }
                                onChange={(
                                    event
                                ) =>
                                    setHandoffTo(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className={
                                    fieldClass
                                }
                            >
                                <option value="">
                                    Select team member
                                </option>

                                {assignees
                                    .filter(
                                        (
                                            employee
                                        ) =>
                                            employee.id !==
                                            currentUserId
                                    )
                                    .map(
                                        (
                                            employee
                                        ) => (
                                            <option
                                                key={
                                                    employee.id
                                                }
                                                value={
                                                    employee.id
                                                }
                                            >
                                                {employee.full_name} — {employee.role === "manager" ? "Manager" : "Employee"}
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>


                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Reply
                            </label>

                            <textarea
                                value={
                                    handoffNote
                                }
                                onChange={(
                                    event
                                ) =>
                                    setHandoffNote(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                rows={5}
                                placeholder="Write your reply…"
                                className={
                                    textareaClass
                                }
                            />

                            <p className="mt-1.5 text-xs text-[#64748B]">
                                This reply will appear in the task timeline.
                            </p>
                        </div>

                    </>
                ) : null}


                {/* =================================
                    DELETE
                ================================= */}

                {mode === "delete" &&
                task ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                        <p className="text-sm text-red-700">
                            Are you sure you want to delete{" "}
                            <strong>
                                {
                                    task.title
                                }
                            </strong>
                            ?
                        </p>

                        <p className="mt-2 text-xs text-red-500">
                            This action cannot be undone.
                        </p>

                    </div>
                ) : null}


                {/* =================================
                    REVIEW
                ================================= */}

                {mode === "review" &&
                task ? (
                    <>

                        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">

                            <p className="text-xs text-[#64748B]">
                                Submitted Task
                            </p>

                            <p className="mt-1 font-semibold text-[#0F172A]">
                                {
                                    task.title
                                }
                            </p>

                        </div>


                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Review decision
                            </label>

                            <select
                                value={
                                    reviewAction
                                }
                                onChange={(
                                    event
                                ) =>
                                    setReviewAction(
                                        event
                                            .target
                                            .value as
                                        | "completed"
                                        | "changes_required"
                                    )
                                }
                                className={
                                    fieldClass
                                }
                            >
                                <option value="completed">
                                    Complete Task
                                </option>

                                <option value="changes_required">
                                    Request Changes
                                </option>
                            </select>
                        </div>


                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#334155]">
                                Review note
                            </label>

                            <textarea
                                value={
                                    reviewNote
                                }
                                onChange={(
                                    event
                                ) =>
                                    setReviewNote(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                rows={5}
                                placeholder={
                                    reviewAction ===
                                    "changes_required"
                                        ? "Explain what needs to be changed..."
                                        : "Optional completion note..."
                                }
                                className={
                                    textareaClass
                                }
                            />
                        </div>

                    </>
                ) : null}

            </div>
        </AppModal>
    );
}


// =====================================
// Assignment Badge
// =====================================

// =====================================
// Footer Buttons
// =====================================

function ModalButtons({
    onCancel,
    actionLabel,
    onAction,
    disabled,
    danger = false,
}: {
    onCancel: () => void;
    actionLabel: string;
    onAction: () => void;
    disabled: boolean;
    danger?: boolean;
}) {
    return (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">

            <button
                type="button"
                disabled={
                    disabled
                }
                onClick={
                    onCancel
                }
                className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#F8FAFC] disabled:opacity-60"
            >
                Cancel
            </button>

            <button
                type="button"
                disabled={
                    disabled
                }
                onClick={
                    onAction
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    danger
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                }`}
            >
                {
                    actionLabel
                }
            </button>

        </div>
    );
}
