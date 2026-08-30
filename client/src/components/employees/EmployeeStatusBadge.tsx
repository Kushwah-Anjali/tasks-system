import type {
    EmployeeStatus,
} from "../../types/employee";

const statusStyles: Record<
    EmployeeStatus,
    string
> = {
    Active:
        "bg-green-50 text-[#16A34A]",

    Inactive:
        "bg-red-50 text-[#DC2626]",

    "On Leave":
        "bg-amber-50 text-[#D97706]",
};

interface EmployeeStatusBadgeProps {
    status: EmployeeStatus;
}

export default function EmployeeStatusBadge({
    status,
}: EmployeeStatusBadgeProps) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
        >
            {status}
        </span>
    );
}