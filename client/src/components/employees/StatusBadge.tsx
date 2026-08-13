import type { EmployeeStatus } from "./types";

const statusStyles: Record<EmployeeStatus, string> = {
  Active: "bg-green-50 text-[#16A34A]",
  "On Leave": "bg-amber-50 text-[#D97706]",
  Inactive: "bg-red-50 text-[#DC2626]",
};

interface StatusBadgeProps {
  status: EmployeeStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}