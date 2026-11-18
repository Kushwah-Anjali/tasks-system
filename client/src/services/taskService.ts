import api from "./api";

import type {
    CreateTaskPayload,
    HandoffTaskPayload,
    ReviewTaskPayload,
    Task,
    TaskAssignee,
    TaskDetailsResponse,
    TaskPriority,
    UpdateTaskPayload,
} from "../types/task";
import { normalizeTaskPriority } from "../utils/taskPriority";


interface TasksResponse {
    tasks: Task[];
}

export type TaskPriorityFilter = TaskPriority | "all";
export type TaskListSortField =
    | "title"
    | "assigned_to_name"
    | "created_by_name"
    | "assigned_date"
    | "due_date"
    | "priority"
    | "status";

export interface ManagerTaskListQuery {
    page: number;
    pageSize: 10 | 25 | 50;
    view: "active" | "completed";
    scope: "all" | "assigned" | "created";
    priority: TaskPriorityFilter;
    assignedTo: number | "";
    search: string;
    sortBy: TaskListSortField;
    sortDirection: "asc" | "desc";
}

export interface ManagerTaskPage {
    tasks: Task[];
    total: number;
    page: number;
    pageSize: number;
}

export interface TaskDraft {
    title: string | null;
    assigned_to: number | null;
    due_date: string | null;
    priority: TaskPriority;
    clarifications: string[];
}

interface TaskResponse {
    task: Task;
}

interface AssigneesResponse {
    employees: TaskAssignee[];
}

const normalizeTask = (task: Task): Task => ({
    ...task,
    priority: normalizeTaskPriority((task as Task & { priority?: unknown }).priority),
});

const normalizeTasks = (tasks: Task[]): Task[] => tasks.map(normalizeTask);


// ==============================
// Manager - All Tasks
// ==============================

export const getAllTasks =
    async (): Promise<Task[]> => {
        const response =
            await api.get<TasksResponse>(
                "/tasks"
            );

        return normalizeTasks(response.data.tasks);
    };

export const getManagerTasks = async (
    query: ManagerTaskListQuery
): Promise<ManagerTaskPage> => {
    const response = await api.get<ManagerTaskPage>("/tasks", { params: query });
    return { ...response.data, tasks: normalizeTasks(response.data.tasks) };
};


// ==============================
// Assigned To Me
// ==============================

export const getMyTasks =
    async (): Promise<Task[]> => {
        const response =
            await api.get<TasksResponse>(
                "/tasks/my"
            );

        return normalizeTasks(response.data.tasks);
    };


// ==============================
// Created By Me
// ==============================

export const getCreatedByMe =
    async (): Promise<Task[]> => {
        const response =
            await api.get<TasksResponse>(
                "/tasks/created-by-me"
            );

        return normalizeTasks(response.data.tasks);
    };


// ==============================
// Available Employees
// ==============================

export const getTaskAssignees =
    async (): Promise<TaskAssignee[]> => {
        const response =
            await api.get<AssigneesResponse>(
                "/tasks/assignees"
            );

        return response.data.employees;
    };

export const generateTaskDraft = async (description: string, signal?: AbortSignal): Promise<TaskDraft> => {
    const response = await api.post<{ draft: TaskDraft }>("/ai/task-draft", { description }, { signal });
    return response.data.draft;
};

export const transcribeTaskInstruction = async (
    audio: Blob,
    language: "auto" | "hi" | "en",
    signal?: AbortSignal
): Promise<{ transcript: string; qualityWarning: boolean }> => {
    const response = await api.post<{ transcript: string; qualityWarning: boolean }>("/ai/transcribe", audio, {
        params: { language },
        headers: { "Content-Type": audio.type || "application/octet-stream" },
        signal,
    });
    return response.data;
};


// ==============================
// Create Task
// ==============================

export const createTask =
    async (
        payload: CreateTaskPayload
    ): Promise<Task> => {
        const response =
            await api.post<TaskResponse>(
                "/tasks",
                payload
            );

        return normalizeTask(response.data.task);
    };


// ==============================
// Accept Task
// ==============================

export const acceptTask =
    async (
        taskId: number
    ): Promise<Task> => {
        const response =
            await api.patch<TaskResponse>(
                `/tasks/${taskId}/accept`
            );

        return normalizeTask(response.data.task);
    };


// ==============================
// Reject Task
// ==============================

export const rejectTask =
    async (
        taskId: number,
        reason: string
    ): Promise<Task> => {
        const response =
            await api.patch<TaskResponse>(
                `/tasks/${taskId}/reject`,
                {
                    reason,
                }
            );

        return normalizeTask(response.data.task);
    };


// ==============================
// Hand Off Task
// ==============================

export const handoffTask =
    async (
        taskId: number,
        payload: HandoffTaskPayload
    ): Promise<Task> => {
        const response =
            await api.post<TaskResponse>(
                `/tasks/${taskId}/handoff`,
                payload
            );

        return normalizeTask(response.data.task);
    };


// ==============================
// Edit Task
// ==============================

export const updateTask =
    async (
        taskId: number,
        payload: UpdateTaskPayload
    ): Promise<Task> => {
        const response =
            await api.patch<TaskResponse>(
                `/tasks/${taskId}/edit`,
                payload
            );

        return normalizeTask(response.data.task);
    };


// ==============================
// Delete Task
// ==============================

export const deleteTask =
    async (
        taskId: number
    ): Promise<void> => {
        await api.delete(
            `/tasks/${taskId}`
        );
    };


// ==============================
// Submit Work
// ==============================

export const submitTask =
    async (
        taskId: number
    ): Promise<Task> => {
        const response =
            await api.patch<TaskResponse>(
                `/tasks/${taskId}/submit`
            );

        return normalizeTask(response.data.task);
    };


// ==============================
// Review Task
// ==============================

export const reviewTask =
    async (
        taskId: number,
        payload: ReviewTaskPayload
    ): Promise<Task> => {
        const response =
            await api.patch<TaskResponse>(
                `/tasks/${taskId}/review`,
                payload
            );

        return normalizeTask(response.data.task);
    };

export const getTaskDetails =
    async (
        taskId: number
    ): Promise<TaskDetailsResponse> => {
        const response =
            await api.get<TaskDetailsResponse>(
                `/tasks/${taskId}`
            );

        return {
            ...response.data,
            task: normalizeTask(response.data.task),
        };
    };
