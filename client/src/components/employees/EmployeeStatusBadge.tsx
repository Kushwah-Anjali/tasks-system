import type { EmployeeStatus } from "../../types/employee";
import StatusBadge, { type StatusTone } from "../ui/StatusBadge";

const tones: Record<EmployeeStatus, StatusTone> = {
    Active: "success",
    Inactive: "danger",
    "On Leave": "warning",
};

export default function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
    return <StatusBadge tone={tones[status]}>{status}</StatusBadge>;
}
