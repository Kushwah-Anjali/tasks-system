import {
    useEffect,
    useState,
} from "react";

import {
    submitTaskForReview,
    updateTaskProgress,
} from "../../services/taskService";

import type { Task } from "../../types/task";

import Modal from "./Modal";
import TaskProgressBar from "./TaskProgressBar";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskDetailsModalProps {
    task: Task | null;
    onClose: () => void;
    onUpdated: (task: Task) => void;
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

export default function TaskDetailsModal({
    task,
    onClose,
    onUpdated,
}: TaskDetailsModalProps) {
    const [progressInput, setProgressInput] =
        useState(0);

    const [
        isSavingProgress,
        setIsSavingProgress,
    ] = useState(false);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    useEffect(() => {
        if (!task) return;

        setProgressInput(task.progress);
        setErrorMessage("");
    }, [task]);

    if (!task) return null;

    const handleProgressChange = (
        value: number
    ) => {
        const normalizedValue = Math.min(
            100,
            Math.max(0, value)
        );

        setProgressInput(normalizedValue);
    };

    const handleUpdateProgress = async () => {
        try {
            setIsSavingProgress(true);
            setErrorMessage("");

            await updateTaskProgress(
                task.id,
                progressInput
            );

            const updatedTask: Task = {
                ...task,
                progress: progressInput,

                status:
                    task.status === "assigned" &&
                    progressInput > 0
                        ? "in_progress"
                        : task.status,
            };

            onUpdated(updatedTask);
        } catch {
            setErrorMessage(
                "Failed to update progress. Please try again."
            );
        } finally {
            setIsSavingProgress(false);
        }
    };

    const handleSubmitForReview = async () => {
        try {
            setIsSubmitting(true);
            setErrorMessage("");

            await submitTaskForReview(task.id);

            onUpdated({
                ...task,
                progress: progressInput,
                status: "submitted",
            });

            onClose();
        } catch {
            setErrorMessage(
                "Failed to submit the task. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const cannotUpdate =
        task.status === "submitted" ||
        task.status === "completed";

    return (
        <Modal
            open={Boolean(task)}
            onClose={onClose}
            title={task.title}
        >
            <div className="flex flex-col gap-5">
                {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium text-[#64748B]">
                            Assigned Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                            {formatDate(
                                task.assigned_date
                            )}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-[#64748B]">
                            Due Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                            {formatDate(
                                task.due_date
                            )}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-xs font-medium text-[#64748B]">
                        Status
                    </p>

                    <div className="mt-1.5">
                        <TaskStatusBadge
                            status={task.status}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-[#64748B]">
                        Current Progress
                    </p>

                    <TaskProgressBar
                        progress={progressInput}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="progressInput"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Update progress (%)
                    </label>

                    <input
                        id="progressInput"
                        type="number"
                        min={0}
                        max={100}
                        value={progressInput}
                        disabled={cannotUpdate}
                        onChange={(event) =>
                            handleProgressChange(
                                Number(
                                    event.target.value
                                )
                            )
                        }
                        className="h-11 w-full rounded-xl border border-[#E2E8F0] px-4 text-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={
                            handleUpdateProgress
                        }
                        disabled={
                            cannotUpdate ||
                            isSavingProgress ||
                            progressInput ===
                                task.progress
                        }
                        className="h-11 rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155] hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSavingProgress
                            ? "Saving..."
                            : "Update Progress"}
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleSubmitForReview
                        }
                        disabled={
                            cannotUpdate ||
                            isSubmitting
                        }
                        className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? "Submitting..."
                            : "Submit for Review"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}