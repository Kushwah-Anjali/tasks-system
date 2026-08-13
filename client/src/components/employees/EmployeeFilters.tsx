import { Search, ChevronDown, X, Plus } from "lucide-react";
import type { EmployeeStatus } from "./types";

const statusOptions: EmployeeStatus[] = ["Active", "Inactive", "On Leave"];

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white pl-4 pr-9 text-sm text-[#0F172A] outline-none transition-all duration-150 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";

interface EmployeeFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  departments: string[];
  status: EmployeeStatus | "";
  onStatusChange: (value: EmployeeStatus | "") => void;
  onClearFilters: () => void;
  onAddEmployee?: () => void;
}

export default function EmployeeFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  departments,
  status,
  onStatusChange,
  onClearFilters,
  onAddEmployee,
}: EmployeeFiltersProps) {
  const hasActiveFilters = Boolean(search || department || status);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:flex-wrap sm:items-center">
      {/* ============================== */}
      {/* Search */}
      {/* ============================== */}
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
          strokeWidth={2}
        />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search employees..."
          className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all duration-150 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </div>

      {/* ============================== */}
      {/* Department Filter */}
      {/* ============================== */}
      <div className="relative w-full sm:w-44">
        <select
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
          className={selectClass}
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
          strokeWidth={2}
        />
      </div>

      {/* ============================== */}
      {/* Status Filter */}
      {/* ============================== */}
      <div className="relative w-full sm:w-40">
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as EmployeeStatus | "")}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {statusOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
          strokeWidth={2}
        />
      </div>

      {/* ============================== */}
      {/* Clear Filters */}
      {/* ============================== */}
      {hasActiveFilters ? (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[#64748B] transition-colors duration-150 hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        >
          <X className="h-4 w-4" />
          Clear filters
        </button>
      ) : null}

      {/* ============================== */}
      {/* Add Employee */}
      {/* ============================== */}
      <button
        onClick={onAddEmployee}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1D4ED8] sm:ml-auto"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Add Employee
      </button>
    </div>
  );
}