import type { TaskPriority } from "../types/task";

const TASK_PRIORITIES: readonly TaskPriority[] = ["high", "medium", "low"];

/** Normalize database/API priority values; older or malformed values default to Medium. */
export function normalizeTaskPriority(value: unknown): TaskPriority {
    if (typeof value !== "string") return "medium";
    const normalized = value.trim().toLowerCase();
    return TASK_PRIORITIES.includes(normalized as TaskPriority)
        ? normalized as TaskPriority
        : "medium";
}
