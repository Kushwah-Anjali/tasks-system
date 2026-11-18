import {
    ChevronDown,
    X,
    Search,
} from "lucide-react";

import type { TaskAssignee } from "../../types/task";
import type { TaskPriorityFilter } from "../../services/taskService";

interface TaskFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;

    priority: TaskPriorityFilter;
    onPriorityChange: (value: TaskPriorityFilter) => void;
    view: "active" | "completed";
    onViewChange: (view: "active" | "completed") => void;
    assignees: TaskAssignee[];
    assignedTo: number | "";
    onAssignedToChange: (value: number | "") => void;
    hideAssignedTo?: boolean;
    isLoadingAssignees?: boolean;
    onClearFilters: () => void;
}

export default function TaskFilters({
    search,
    onSearchChange,
    priority,
    onPriorityChange,
    view,
    onViewChange,
    assignees,
    assignedTo,
    onAssignedToChange,
    hideAssignedTo = false,
    isLoadingAssignees = false,
    onClearFilters,
}: TaskFiltersProps) {
    const hasActiveFilters = Boolean(search.trim() || priority !== "all" || assignedTo !== "");

    return (
        <div className="app-filter-panel flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                    strokeWidth={2}
                />

                <input
                    aria-label="Search tasks"
                    type="text"
                    value={search}
                    onChange={(event) =>
                        onSearchChange(
                            event.target.value
                        )
                    }
                    placeholder="Search tasks..."
                    className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
            </div>

            <div className="flex w-full items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 sm:w-auto" role="group" aria-label="Task view">
                <button
                    type="button"
                    aria-pressed={view === "active"}
                    onClick={() => onViewChange("active")}
                    className={`h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors sm:flex-none ${view === "active" ? "bg-white text-[#1D4ED8] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}
                >
                    Active Tasks
                </button>
                <button
                    type="button"
                    aria-pressed={view === "completed"}
                    onClick={() => onViewChange("completed")}
                    className={`h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors sm:flex-none ${view === "completed" ? "bg-white text-[#1D4ED8] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}
                >
                    Completed Tasks
                </button>
            </div>

            <div className="relative w-full sm:w-48">
                <select
                    aria-label="Filter by priority"
                    value={priority}
                    onChange={(event) => onPriorityChange(event.target.value as TaskPriorityFilter)}
                    className="h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white pl-4 pr-9 text-sm text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                    <option value="all">All priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                    strokeWidth={2}
                />
            </div>

            {!hideAssignedTo ? <div className="relative w-full sm:w-52">
                <select
                    aria-label="Filter by assigned team member"
                    value={assignedTo}
                    disabled={isLoadingAssignees}
                    onChange={(event) => onAssignedToChange(event.target.value ? Number(event.target.value) : "")}
                    className="h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white pl-4 pr-9 text-sm text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 disabled:cursor-wait disabled:opacity-60"
                >
                    <option value="">All team members</option>
                    {assignees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                            {employee.full_name} — {employee.role === "manager" ? "Manager" : "Employee"}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                    strokeWidth={2}
                />
            </div> : null}

            <button
                type="button"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear Filters
            </button>
        </div>
    );
}
