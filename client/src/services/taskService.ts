import api from "./api";

import type {
    CreateTaskPayload,
    MessageResponse,
    Task,
    TasksResponse,
    TaskStatus,
} from "../types/task";

const normalizeTaskStatus = (
    status: string
): TaskStatus => {
    const normalized = status
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    switch (normalized) {
        case "not_started":
        case "assigned":
            return "assigned";

        case "in_progress":
            return "in_progress";

        case "submitted":
            return "submitted";

        case "completed":
            return "completed";

        case "overdue":
            return "overdue";

        default:
            return "assigned";
    }
};

const normalizeTask = (task: Task): Task => {
    return {
        ...task,
        status: normalizeTaskStatus(task.status),
        progress: Number(task.progress) || 0,
        assigned_date: task.assigned_date ?? null,
    };
};

export const createTask = async (
    payload: CreateTaskPayload
): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>(
        "/tasks",
        payload
    );

    return response.data;
};

export const getAllTasks = async (): Promise<Task[]> => {
    const response =
        await api.get<TasksResponse>("/tasks");

    return response.data.tasks.map(normalizeTask);
};

export const getMyTasks = async (): Promise<Task[]> => {
    const response =
        await api.get<TasksResponse>("/tasks/my");

    return response.data.tasks.map(normalizeTask);
};

export const updateTaskProgress = async (
    taskId: number,
    progress: number
): Promise<MessageResponse> => {
    const response = await api.patch<MessageResponse>(
        `/tasks/${taskId}/progress`,
        { progress }
    );

    return response.data;
};

export const submitTaskForReview = async (
    taskId: number
): Promise<MessageResponse> => {
    const response = await api.patch<MessageResponse>(
        `/tasks/${taskId}/submit`
    );

    return response.data;
};

export const deleteTask = async (
    taskId: number
): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(
        `/tasks/${taskId}`
    );

    return response.data;
};