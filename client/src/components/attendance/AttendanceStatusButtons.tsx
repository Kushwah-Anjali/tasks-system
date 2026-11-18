import type { AttendanceStatus } from "../../types/attendance";

interface AttendanceStatusButtonsProps {
    employeeId: number;
    value: AttendanceStatus | null;
    onChange: (status: AttendanceStatus) => void;
}

const statuses: Array<{
    value: AttendanceStatus;
    label: string;
}> = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "half_day", label: "Half Day" },
];

const selectedStyles: Record<AttendanceStatus, string> = {
    present: "border-green-300 bg-green-50 text-green-800 ring-1 ring-green-200",
    absent: "border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200",
    half_day: "border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-200",
};

export default function AttendanceStatusButtons({
    employeeId,
    value,
    onChange,
}: AttendanceStatusButtonsProps) {
    return (
        <div className="flex min-w-[290px] gap-2">
            {statuses.map((status) => {
                const selected = value === status.value;

                return (
                    <button
                        key={status.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${status.label} for employee ${employeeId}`}
                        onClick={() => onChange(status.value)}
                        className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            selected
                                ? selectedStyles[status.value]
                                : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                        }`}
                    >
                        {status.label}
                    </button>
                );
            })}
        </div>
    );
}
