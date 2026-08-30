import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import type {
    Employee,
} from "../../types/employee";

interface EmployeePaginationProps {
  table: Table<Employee>;
}

export default function EmployeePagination({ table }: EmployeePaginationProps) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(totalRows, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-[#64748B]">
        Showing <span className="font-medium text-[#0F172A]">{start}</span>–
        <span className="font-medium text-[#0F172A]">{end}</span> of{" "}
        <span className="font-medium text-[#0F172A]">{totalRows}</span> employees
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] transition-colors duration-150 hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-[#0F172A]">
          Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] transition-colors duration-150 hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}