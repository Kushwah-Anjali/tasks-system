import {
    useEffect,
    useState,
} from "react";

import type {
    FormEvent,
} from "react";

import { createTask } from "../../services/taskService";
import { getEmployees } from "../../services/employeeService";

import type { Employee } from "../../types/employee";

import Modal from "./Modal";

interface CreateTaskModalProps {
    open: boolean;
    onClose: () => void;

    onCreated:
        | (() => void)
        | (() => Promise<void>);
}

interface FormErrors {
    title?: string;
    assignedTo?: string;
    dueDate?: string;
}

const inputClassName =
    "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-70";

const getTodayDate = (): string => {
    const today = new Date();
    const timezoneOffset =
        today.getTimezoneOffset() * 60_000;

    return new Date(
        today.getTime() - timezoneOffset
    )
        .toISOString()
        .split("T")[0];
};

export default function CreateTaskModal({
    open,
    onClose,
    onCreated,
}: CreateTaskModalProps) {
    const [employees, setEmployees] =
        useState<Employee[]>([]);

    const [
        isLoadingEmployees,
        setIsLoadingEmployees,
    ] = useState(false);

    const [title, setTitle] = useState("");

    const [assignedTo, setAssignedTo] =
        useState<number | null>(null);

    const [dueDate, setDueDate] =
        useState("");

    const [errors, setErrors] =
        useState<FormErrors>({});

    const [submitError, setSubmitError] =
        useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    useEffect(() => {
        if (!open) return;

        let isActive = true;

        setTitle("");
        setAssignedTo(null);
        setDueDate("");
        setErrors({});
        setSubmitError("");
        setIsLoadingEmployees(true);

        getEmployees()
            .then((employeeList) => {
                if (isActive) {
                    setEmployees(employeeList);
                }
            })
            .catch(() => {
                if (isActive) {
                    setSubmitError(
                        "Unable to load employees. Please try again."
                    );
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingEmployees(
                        false
                    );
                }
            });

        return () => {
            isActive = false;
        };
    }, [open]);

    const validate = (): FormErrors => {
        const nextErrors: FormErrors = {};

        if (!title.trim()) {
            nextErrors.title =
                "Task title is required.";
        }

        if (!assignedTo) {
            nextErrors.assignedTo =
                "Please select an employee.";
        }

        if (!dueDate) {
            nextErrors.dueDate =
                "Due date is required.";
        } else if (dueDate < getTodayDate()) {
            nextErrors.dueDate =
                "Due date cannot be in the past.";
        }

        return nextErrors;
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const validationErrors =
            validate();

        setErrors(validationErrors);

        if (
            Object.keys(validationErrors)
                .length > 0 ||
            assignedTo === null
        ) {
            return;
        }

        try {
            setIsSubmitting(true);
            setSubmitError("");

            await createTask({
                title: title.trim(),
                assigned_to: assignedTo,
                due_date: dueDate,
            });

            await onCreated();
            onClose();
        } catch {
            setSubmitError(
                "Failed to create task. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={() => {
                if (!isSubmitting) {
                    onClose();
                }
            }}
            title="Create Task"
        >
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
                noValidate
            >
                {submitError ? (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
                        {submitError}
                    </div>
                ) : null}

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="taskTitle"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Task title
                    </label>

                    <input
                        id="taskTitle"
                        type="text"
                        value={title}
                        onChange={(event) => {
                            setTitle(
                                event.target.value
                            );

                            setErrors(
                                (current) => ({
                                    ...current,
                                    title: undefined,
                                })
                            );
                        }}
                        placeholder="e.g. Site inspection"
                        disabled={isSubmitting}
                        className={
                            inputClassName
                        }
                    />

                    {errors.title ? (
                        <p className="text-xs font-medium text-[#EF4444]">
                            {errors.title}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="assignedTo"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Assign to
                    </label>

                    <select
                        id="assignedTo"
                        value={assignedTo ?? ""}
                        disabled={
                            isLoadingEmployees ||
                            isSubmitting
                        }
                        onChange={(event) => {
                            setAssignedTo(
                                Number(
                                    event.target
                                        .value
                                ) || null
                            );

                            setErrors(
                                (current) => ({
                                    ...current,
                                    assignedTo:
                                        undefined,
                                })
                            );
                        }}
                        className={
                            inputClassName
                        }
                    >
                        <option
                            value=""
                            disabled
                        >
                            {isLoadingEmployees
                                ? "Loading employees..."
                                : "Select employee"}
                        </option>

                        {employees.map(
                            (employee) => (
                                <option
                                    key={
                                        employee.id
                                    }
                                    value={
                                        employee.id
                                    }
                                >
                                    {
                                        employee.fullName
                                    }
                                </option>
                            )
                        )}
                    </select>

                    {errors.assignedTo ? (
                        <p className="text-xs font-medium text-[#EF4444]">
                            {
                                errors.assignedTo
                            }
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="dueDate"
                        className="text-sm font-semibold text-[#0F172A]"
                    >
                        Due date
                    </label>

                    <input
                        id="dueDate"
                        type="date"
                        min={getTodayDate()}
                        value={dueDate}
                        disabled={isSubmitting}
                        onChange={(event) => {
                            setDueDate(
                                event.target.value
                            );

                            setErrors(
                                (current) => ({
                                    ...current,
                                    dueDate:
                                        undefined,
                                })
                            );
                        }}
                        className={
                            inputClassName
                        }
                    />

                    {errors.dueDate ? (
                        <p className="text-xs font-medium text-[#EF4444]">
                            {errors.dueDate}
                        </p>
                    ) : null}
                </div>

                <div className="mt-2 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="h-11 rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            isLoadingEmployees
                        }
                        className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? "Creating..."
                            : "Create Task"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}