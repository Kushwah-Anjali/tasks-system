import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Users } from "lucide-react";
import StatusBadge from "./StatusBadge";
import EmployeeActionsMenu from "./EmployeeActionMenu";
import EmployeePagination from "./EmployeePagination";
import type { Employee } from "./types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

const columnHelper = createColumnHelper<Employee>();

const columns = [
  columnHelper.accessor("fullName", {
    id: "employee",
    header: "Employee",
    cell: (info) => {
      const employee = info.row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-[#475569]">
            {getInitials(employee.fullName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[#0F172A]">{employee.fullName}</p>
            <p className="text-xs text-[#94A3B8]">{employee.email}</p>
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("registrationNumber", {
    header: "Registration No.",
    cell: (info) => <span className="text-sm text-[#334155]">{info.getValue()}</span>,
  }),
  columnHelper.accessor("department", {
    header: "Department",
    cell: (info) => <span className="text-sm text-[#334155]">{info.getValue()}</span>,
  }),
  columnHelper.accessor("designation", {
    header: "Designation",
    cell: (info) => <span className="text-sm text-[#334155]">{info.getValue()}</span>,
  }),
  columnHelper.accessor("joiningDate", {
    header: "Joining Date",
    cell: (info) => <span className="text-sm text-[#334155]">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: () => <EmployeeActionsMenu />,
    enableSorting: false,
  }),
];

interface EmployeeTableProps {
  employees: Employee[];
  isLoading?: boolean;
}

export default function EmployeeTable({ employees, isLoading = false }: EmployeeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "employee", desc: false }]);

  const data = useMemo(() => employees, [employees]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* ============================== */}
      {/* Table */}
      {/* ============================== */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[#E2E8F0]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#94A3B8] first:pl-6 last:pr-6"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1.5 transition-colors duration-150 hover:text-[#0F172A]"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-[#E2E8F0] last:border-none">
                  {columns.map((_, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-4 first:pl-6 last:pr-6">
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-[#F1F5F9]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-[#0F172A]">No employees found</p>
                    <p className="text-xs text-[#94A3B8]">Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#E2E8F0] last:border-none transition-colors duration-150 hover:bg-[#F8FAFC]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5 first:pl-6 last:pr-6">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================== */}
      {/* Pagination */}
      {/* ============================== */}
      {!isLoading && rows.length > 0 ? <EmployeePagination table={table} /> : null}
    </div>
  );
}