export const TASK_STATUSES = [
    "assigned",
    "in_progress",
    "submitted",
    "completed",
    "overdue",
] as const;

export type TaskStatus =
    (typeof TASK_STATUSES)[number];

export interface Task {
    id: number;
    title: string;

    created_by: number;
    assigned_to: number;

    created_by_name?: string;
    assigned_to_name?: string;

    assigned_date?: string | null;
    due_date: string;

    status: TaskStatus;
    progress: number;

    review_note?: string | null;
}

export interface CreateTaskPayload {
    title: string;
    assigned_to: number;
    due_date: string;
}

export interface TasksResponse {
    tasks: Task[];
}

export interface MessageResponse {
    message: string;
}