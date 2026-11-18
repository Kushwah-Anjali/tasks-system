import type { HandoffStatus, TaskStatus } from "../../types/task";
import StatusBadge, { type StatusTone } from "../ui/StatusBadge";

const statuses: Record<TaskStatus, { label: string; tone: StatusTone }> = {
    assigned: { label: "Assigned", tone: "neutral" },
    in_progress: { label: "In Progress", tone: "blue" },
    submitted: { label: "Submitted", tone: "info" },
    under_review: { label: "Under Review", tone: "info" },
    changes_required: { label: "Changes Required", tone: "orange" },
    completed: { label: "Completed", tone: "success" },
};

export default function TaskStatusBadge({ status, prominent = false }: { status: TaskStatus; prominent?: boolean }) {
    const config = statuses[status];
    return <StatusBadge tone={config.tone} prominent={prominent}>{config.label}</StatusBadge>;
}

const responses: Record<HandoffStatus, { label: string; tone: StatusTone }> = {
    pending: { label: "Pending", tone: "warning" },
    accepted: { label: "Accepted", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
};

export function ResponseStatusBadge({ status, prominent = false }: { status: HandoffStatus; prominent?: boolean }) {
    const config = responses[status];
    return <StatusBadge tone={config.tone} prominent={prominent}>{config.label}</StatusBadge>;
}
