import { useEffect, useState, type FormEvent } from "react";
import Modal from "./Modal";
import { getEmployees } from "../../services/employeeService";
import { createTask } from "../../services/taskservice";
import type { Employee } from "../employees/types";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
onCreated: () => void;
}

interface FormErrors {
  title?: string;
  assignedTo?: string;
  dueDate?: string;
}

const inputClass =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all duration-150 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";


export default function CreateTaskModal({ open, onClose, onCreated }: CreateTaskModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (!open) return;

    setTitle("");
    setAssignedTo(null);
    setDueDate("");
    setErrors({});
    setSubmitError(undefined);

    setIsLoadingEmployees(true);
    getEmployees()
      .then(setEmployees)
      .catch(() => setSubmitError("Unable to load employees. Please try again."))
      .finally(() => setIsLoadingEmployees(false));
  }, [open]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!title.trim()) nextErrors.title = "Task title is required.";
    if (!assignedTo) nextErrors.assignedTo = "Please select an employee.";
    if (!dueDate) nextErrors.dueDate = "Due date is required.";
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const validationErrors = validate();
  setErrors(validationErrors);

  if (Object.keys(validationErrors).length > 0) return;

  setSubmitError(undefined);
  setIsSubmitting(true);

  try {
    await createTask({
      title: title.trim(),
      assigned_to: assignedTo as number,
      due_date: dueDate,
    });

    onCreated();
    onClose();
  } catch {
    setSubmitError("Failed to create task. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Modal open={open} onClose={onClose} title="Create Task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {submitError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
            {submitError}
          </div>
        ) : null}

        {/* ============================== */}
        {/* Task Title */}
        {/* ============================== */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="taskTitle" className="text-sm font-semibold text-[#0F172A]">
            Task title
          </label>
          <input
            id="taskTitle"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Site inspection"
            className={inputClass}
          />
          {errors.title ? (
            <p className="text-xs font-medium text-[#EF4444]">{errors.title}</p>
          ) : null}
        </div>

        {/* ============================== */}
        {/* Assign To */}
        {/* ============================== */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="assignedTo" className="text-sm font-semibold text-[#0F172A]">
            Assign to
          </label>
          <select
            id="assignedTo"
            value={assignedTo ?? ""}
            onChange={(event) => setAssignedTo(Number(event.target.value) || null)}
            disabled={isLoadingEmployees}
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="" disabled>
              {isLoadingEmployees ? "Loading employees..." : "Select employee"}
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
          {errors.assignedTo ? (
            <p className="text-xs font-medium text-[#EF4444]">{errors.assignedTo}</p>
          ) : null}
        </div>

        {/* ============================== */}
        {/* Due Date */}
        {/* ============================== */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dueDate" className="text-sm font-semibold text-[#0F172A]">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={inputClass}
          />
          {errors.dueDate ? (
            <p className="text-xs font-medium text-[#EF4444]">{errors.dueDate}</p>
          ) : null}
        </div>

        {/* ============================== */}
        {/* Actions */}
        {/* ============================== */}
        <div className="mt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center justify-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#334155] transition-colors duration-150 hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}