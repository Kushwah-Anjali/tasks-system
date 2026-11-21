import { useCallback, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import {
    ArrowRightLeft,
    ArrowDown,
    ArrowDownUp,
    ArrowUp,
    Check,
    Eye,
    Pencil,
    Trash2,
    X,
} from "lucide-react";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";

import type { Task } from "../../types/task";
import TaskStatusBadge, { ResponseStatusBadge } from "./TaskStatusBadge";
import { TaskAgingBadge, TaskPriorityBadge } from "./TaskIndicators";
import { formatTaskDate } from "./taskDateUtils";
import type { TaskModalMode } from "./TaskWorkspaceModal";

interface TaskTableProps {
    tasks: Task[];
    totalCount: number;
    pageIndex: number;
    pageSize: number;
    sorting: SortingState;
    onPageIndexChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSortingChange: (sorting: SortingState) => void;
    onTaskEdit?: (task: Task) => void;
    onTaskDelete?: (taskId: number) => Promise<void> | void;
    personalScope?: "assigned" | "created";
    currentUserId?: number;
    onPersonalAction?: (task: Task, mode: Exclude<TaskModalMode, "create" | "edit" | "delete" | null>) => void;
    onTaskAccept?: (task: Task) => void;
    acceptingTaskId?: number | null;
}

function SortHeader({
    column,
    children,
}: {
    column: {
        getCanSort: () => boolean;
        getIsSorted: () => false | "asc" | "desc";
        getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
    };
    children: string;
}) {
    const sorted = column.getIsSorted();
    const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowDownUp;
    return (
        <button
            type="button"
            onClick={column.getToggleSortingHandler() as React.MouseEventHandler<HTMLButtonElement>}
            disabled={!column.getCanSort()}
            className="inline-flex items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B] disabled:cursor-default"
        >
            {children}
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
    );
}

export default function TaskTable({
    tasks,
    totalCount,
    pageIndex,
    pageSize,
    sorting,
    onPageIndexChange,
    onPageSizeChange,
    onSortingChange,
    onTaskEdit,
    onTaskDelete,
    personalScope,
    currentUserId,
    onPersonalAction,
    onTaskAccept,
    acceptingTaskId = null,
}: TaskTableProps) {
    const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

    const handleDelete = useCallback(async (task: Task) => {
        const confirmation = await Swal.fire({
            title: "Permanently delete this task?",
            text: `“${task.title}” and its forwarding history will be permanently deleted. This cannot be undone.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete permanently",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#DC2626",
            reverseButtons: true,
            focusCancel: true,
        });
        if (!confirmation.isConfirmed || !onTaskDelete) return;

        setDeletingTaskId(task.id);
        try {
            await onTaskDelete(task.id);
            await Swal.fire({
                title: "Task deleted",
                text: `“${task.title}” was permanently deleted.`,
                icon: "success",
                confirmButtonColor: "#2563EB",
            });
        } catch (error) {
            const message = isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message || "The task could not be deleted. Please try again."
                : "The task could not be deleted. Please try again.";
            await Swal.fire({
                title: "Unable to delete task",
                text: message,
                icon: "error",
                confirmButtonColor: "#2563EB",
            });
        } finally {
            setDeletingTaskId(null);
        }
    }, [onTaskDelete]);

    const columns = useMemo<ColumnDef<Task>[]>(() => [
        {
            id: "title",
            accessorKey: "title",
            header: ({ column }) => <SortHeader column={column}>Task</SortHeader>,
            cell: ({ row }) => (
                <>
                    <span aria-hidden="true" className="invisible block min-h-[3.25rem] w-full break-words px-6 py-3.5 text-sm font-semibold leading-5">
                        {row.original.title}
                    </span>
                    <Link
                        to={`/tasks/${row.original.id}`}
                        aria-label={`Open task details for ${row.original.title || "task"}`}
                        className="absolute inset-0 flex cursor-pointer items-start px-6 py-3.5 text-left text-sm font-semibold leading-5 text-[#0F172A] transition-colors hover:bg-[#F8FAFC] hover:text-[#2563EB] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2563EB]"
                    >
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{row.original.title}</span>
                    </Link>
                </>
            ),
        },
        {
            id: "assigned_to_name",
            accessorFn: (task) => personalScope === "assigned"
                ? task.created_by_name || `User #${task.created_by}`
                : task.assigned_to_name || `User #${task.assigned_to}`,
            header: ({ column }) => <SortHeader column={column}>{personalScope === "assigned" ? "Assigned By" : "Assigned To"}</SortHeader>,
            cell: ({ row }) => (
                <span className="text-sm font-semibold text-[#334155]">
                    {personalScope === "assigned"
                        ? row.original.created_by_name || `User #${row.original.created_by}`
                        : row.original.assigned_to_name || `User #${row.original.assigned_to}`}
                </span>
            ),
        },
        ...(personalScope === "assigned" ? [] : [{
            id: "assigned_by_name",
            accessorFn: (task: Task) => task.created_by_name || "Name unavailable",
            header: () => <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Assigned By</span>,
            enableSorting: false,
            cell: ({ row }: { row: { original: Task } }) => (
                <span className="text-sm font-semibold text-[#334155]">{row.original.created_by_name || "Name unavailable"}</span>
            ),
        }]),
        {
            id: "assigned_date",
            accessorKey: "assigned_date",
            header: ({ column }) => <SortHeader column={column}>Assigned Date</SortHeader>,
            cell: ({ row }) => <span className="text-sm text-[#334155]">{formatTaskDate(row.original.assigned_date)}</span>,
        },
        {
            id: "due_date",
            accessorKey: "due_date",
            header: ({ column }) => <SortHeader column={column}>Due Date</SortHeader>,
            cell: ({ row }) => (
                <div className="flex flex-col items-start gap-1.5">
                    {row.original.due_date ? <span className="text-sm text-[#334155]">{formatTaskDate(row.original.due_date)}</span> : null}
                    <TaskAgingBadge task={row.original} />
                </div>
            ),
        },
        {
            id: "pending_assignee_name",
            accessorKey: "pending_assignee_name",
            header: () => <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Forward</span>,
            enableSorting: false,
            cell: ({ row }) => row.original.pending_assignee_id ? (
                <span className="text-sm font-medium text-amber-700">
                    Waiting for {row.original.pending_assignee_name || `User #${row.original.pending_assignee_id}`}
                </span>
            ) : <span className="text-sm text-[#64748B]">—</span>,
        },
        {
            id: "priority",
            accessorKey: "priority",
            header: ({ column }) => <SortHeader column={column}>Priority</SortHeader>,
            cell: ({ row }) => <TaskPriorityBadge priority={row.original.priority} />,
        },
        {
            id: "status",
            accessorKey: "status",
            header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
            cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
        },
        {
            id: "assignment",
            accessorKey: "assignment_status",
            header: () => <span className="text-xs font-semibold text-slate-600">Assignment</span>,
            enableSorting: false,
            cell: ({ row }) => <ResponseStatusBadge status={row.original.assignment_status} />,
        },
        {
            id: "actions",
            header: () => <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Action</span>,
            enableSorting: false,
            cell: ({ row }) => {
                const task = row.original;
                if (personalScope) {
                    const canRespond = personalScope === "assigned" && currentUserId !== undefined && (
                        (task.assigned_to === currentUserId && task.assignment_status === "pending") ||
                        task.pending_assignee_id === currentUserId
                    );
                    const canHandoff = personalScope === "assigned" && task.assigned_to === currentUserId &&
                        task.assignment_status === "accepted" && !task.pending_assignee_id &&
                        task.status !== "submitted" && task.status !== "completed";
                    const canEdit = personalScope === "created" && task.status !== "completed";
                    const canReview = personalScope === "created" && task.status === "submitted";
                    const canSubmit = task.assigned_to === currentUserId && task.assignment_status === "accepted" &&
                        !task.pending_assignee_id && task.status !== "submitted" && task.status !== "completed";

                    return (
                        <div className="flex min-w-[260px] flex-wrap justify-end gap-2">
                            {canRespond ? <>
                                <button type="button" disabled={acceptingTaskId === task.id} onClick={() => onTaskAccept?.(task)} className="inline-flex h-9 items-center gap-1 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"><Check className="h-4 w-4" /> Accept</button>
                                <button type="button" disabled={acceptingTaskId === task.id} onClick={() => onPersonalAction?.(task, "reject")} className="inline-flex h-9 items-center gap-1 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"><X className="h-4 w-4" /> Reject</button>
                            </> : null}
                            <button type="button" onClick={() => onPersonalAction?.(task, "view")} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"><Eye className="h-4 w-4" /> {canSubmit ? "View / Submit" : "View"}</button>
                            {canHandoff ? <button type="button" onClick={() => onPersonalAction?.(task, "handoff")} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"><ArrowRightLeft className="h-4 w-4" /> Forward Task</button> : null}
                            {canEdit ? <button type="button" onClick={() => onTaskEdit?.(task)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"><Pencil className="h-4 w-4" /> Edit</button> : null}
                            {canEdit && onTaskDelete ? <button type="button" disabled={deletingTaskId !== null} onClick={() => void handleDelete(task)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete</button> : null}
                            {canReview ? <button type="button" onClick={() => onPersonalAction?.(task, "review")} className="inline-flex h-9 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">Review</button> : null}
                        </div>
                    );
                }
                return (
                    <div className="flex justify-end gap-2">
                        {task.status !== "completed" && onTaskEdit ? (
                            <button
                                type="button"
                                onClick={() => onTaskEdit(task)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                                aria-label={`Edit ${task.title}`}
                            >
                                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                            </button>
                        ) : null}
                        <button
                            type="button"
                            disabled={deletingTaskId !== null}
                            onClick={() => void handleDelete(task)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm font-semibold text-[#DC2626] transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                            aria-label={`Delete ${task.title}`}
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                );
            },
        },
    ], [acceptingTaskId, currentUserId, deletingTaskId, handleDelete, onPersonalAction, onTaskAccept, onTaskDelete, onTaskEdit, personalScope]);

    const table = useReactTable({
        data: tasks,
        columns,
        state: {
            sorting,
            pagination: { pageIndex, pageSize },
            columnVisibility: {
                pending_assignee_name: Boolean(personalScope),
                assigned_by_name: personalScope !== "assigned",
            },
        },
        manualPagination: true,
        manualSorting: true,
        pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
        onSortingChange: (updater) => {
            const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
            onSortingChange(nextSorting);
        },
        onPaginationChange: (updater) => {
            const current = { pageIndex, pageSize };
            const next = typeof updater === "function" ? updater(current) : updater;
            if (next.pageSize !== pageSize) onPageSizeChange(next.pageSize);
            onPageIndexChange(next.pageSize !== pageSize ? 0 : next.pageIndex);
        },
        getCoreRowModel: getCoreRowModel(),
    });

    const firstResult = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
    const lastResult = Math.min((pageIndex + 1) * pageSize, totalCount);

    return (
        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm" aria-label="Task results">
            <div className="overflow-x-auto">
                <table className="app-table w-full min-w-[1120px] text-left">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-[#E2E8F0]">
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="px-4 py-3 first:pl-6 last:pr-6">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={table.getVisibleLeafColumns().length} className="px-6 py-16 text-center">
                                    <p className="text-base font-semibold text-[#0F172A]">No tasks match the selected filters.</p>
                                    <p className="mt-1 text-xs text-[#64748B]">Change the priority, employee, search, or task view to see more results.</p>
                                </td>
                            </tr>
                        ) : table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="border-b border-[#E2E8F0] last:border-none hover:bg-[#F8FAFC]">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className={cell.column.id === "title" ? "app-task-title-cell" : "px-4 py-3.5 first:pl-6 last:pr-6"}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-4 py-4 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex items-center gap-2">
                        Rows per page
                        <select
                            aria-label="Rows per page"
                            value={pageSize}
                            onChange={(event) => table.setPageSize(Number(event.target.value))}
                            className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-2 text-sm text-[#0F172A]"
                        >
                            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                    <span>Showing {firstResult}–{lastResult} of {totalCount} tasks</span>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-9 rounded-lg border border-[#CBD5E1] px-3 font-semibold text-[#334155] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="whitespace-nowrap">Page {pageIndex + 1} of {table.getPageCount()}</span>
                    <button
                        type="button"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-9 rounded-lg border border-[#CBD5E1] px-3 font-semibold text-[#334155] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </section>
    );
}
