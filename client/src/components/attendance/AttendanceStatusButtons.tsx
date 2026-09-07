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

export default function AttendanceStatusButtons({
    employeeId,
    value,
    onChange,
}: AttendanceStatusButtonsProps) {
    return (
        <div className="flex min-w-[245px] gap-2">
            {statuses.map((status) => {
                const selected = value === status.value;

                return (
                    <button
                        key={status.value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${status.label} for employee ${employeeId}`}
                        onClick={() => onChange(status.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            selected
                                ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]"
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
