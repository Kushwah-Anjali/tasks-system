export type TaskStatus =
    | "assigned"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "changes_required"
    | "completed";

export type TaskPriority = "high" | "medium" | "low";


export type AssignmentStatus =
    | "pending"
    | "accepted"
    | "rejected";
export type HandoffStatus =
    | "pending"
    | "accepted"
    | "rejected";


export interface TaskHandoff {
    id: number;
    task_id: number;

    from_user_id: number;
    from_user_name: string | null;

    to_user_id: number;
    to_user_name: string | null;

    note: string;
    status: HandoffStatus;

    rejection_reason: string | null;

    created_at: string;
    responded_at: string | null;
}

export interface TaskDetailsResponse {
    task: Task;
    handoffs: TaskHandoff[];
    timeline: TaskTimelineEvent[];
}

export type TaskTimelineEventType =
    | "assigned"
    | "accepted"
    | "assignment_rejected"
    | "forward_requested"
    | "forward_accepted"
    | "forward_rejected"
    | "forward_cancelled"
    | "reassigned"
    | "progress_updated"
    | "submitted"
    | "changes_requested"
    | "completed";

export interface TaskTimelineEvent {
    id: string;
    task_id: number;
    event_type: TaskTimelineEventType;
    actor_user_id: number | null;
    actor_name: string | null;
    recipient_user_id: number | null;
    recipient_name: string | null;
    previous_assignee_user_id: number | null;
    previous_assignee_name: string | null;
    message: string | null;
    created_at: string;
}
export interface Task {
    id: number;

    title: string;

    created_by: number;
    created_by_name?: string | null;

    assigned_to: number;
    assigned_to_name?: string | null;

    pending_assignee_id: number | null;
    pending_assignee_name?: string | null;

    assigned_date: string;
    due_date: string | null;
    priority: TaskPriority;

    status: TaskStatus;

    assignment_status:
    AssignmentStatus;

    rejection_reason:
    string | null;

    responded_at:
    string | null;

    review_note:
    string | null;

    completed_at:
    string | null;
}


export interface HandoffTaskPayload {
    assigned_to: number;
    note: string;
}


export interface TaskAssignee {
    id: number;
    full_name: string;
    role: "manager" | "employee";
}


export interface CreateTaskPayload {
    title: string;

    assigned_to: number;
    due_date: string | null;
    priority?: TaskPriority;
}


export interface UpdateTaskPayload {
    title: string;

    assigned_to: number;
    due_date: string | null;
    priority?: TaskPriority;
}


export interface ReviewTaskPayload {
    status:
    | "completed"
    | "changes_required";

    review_note:
    string | null;
}
