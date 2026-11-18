import {
    useEffect,
    useState,
} from "react";

import {
    submitTask,
} from "../../services/taskService";

import type { Task } from "../../types/task";

import Modal from "./Modal";
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
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [errorMessage, setErrorMessage] =
        useState("");

    useEffect(() => {
        if (!task) return;

        setErrorMessage("");
    }, [task]);

    if (!task) return null;

    const handleSubmitForReview = async () => {
        try {
            setIsSubmitting(true);
            setErrorMessage("");

            const updatedTask = await submitTask(task.id);

            onUpdated(updatedTask);

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
        task.assignment_status !== "accepted" ||
        task.pending_assignee_id !== null ||
        task.status === "under_review" ||
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

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">


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