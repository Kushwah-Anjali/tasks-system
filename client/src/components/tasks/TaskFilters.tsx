import {
    ChevronDown,
    Search,
} from "lucide-react";

import type { TaskStatus } from "../../types/task";

interface StatusOption {
    value: TaskStatus;
    label: string;
}

const statusOptions: StatusOption[] = [
    {
        value: "assigned",
        label: "Assigned",
    },
    {
        value: "in_progress",
        label: "In Progress",
    },
    {
        value: "submitted",
        label: "Submitted",
    },
    {
        value: "completed",
        label: "Completed",
    },
    {
        value: "overdue",
        label: "Overdue",
    },
];

interface TaskFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;

    status: TaskStatus | "";
    onStatusChange: (
        value: TaskStatus | ""
    ) => void;
}

export default function TaskFilters({
    search,
    onSearchChange,
    status,
    onStatusChange,
}: TaskFiltersProps) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                    strokeWidth={2}
                />

                <input
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

            <div className="relative w-full sm:w-48">
                <select
                    value={status}
                    onChange={(event) =>
                        onStatusChange(
                            event.target.value as
                                | TaskStatus
                                | ""
                        )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white pl-4 pr-9 text-sm text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                    <option value="">
                        All statuses
                    </option>

                    {statusOptions.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
                    strokeWidth={2}
                />
            </div>
        </div>
    );
}