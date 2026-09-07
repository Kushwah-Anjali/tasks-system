interface AttendanceDateSelectorProps {
    value: string;
    max?: string;
    onChange: (value: string) => void;
}

export default function AttendanceDateSelector({
    value,
    max,
    onChange,
}: AttendanceDateSelectorProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="attendanceDate"
                className="text-sm font-semibold text-[#0F172A]"
            >
                Attendance date
            </label>
            <input
                id="attendanceDate"
                type="date"
                value={value}
                max={max}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className="h-11 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
        </div>
    );
}
