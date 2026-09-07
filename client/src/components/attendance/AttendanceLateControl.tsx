interface AttendanceLateControlProps {
    employeeId: number;
    checked: boolean;
    lateTime: string;
    disabled: boolean;
    onToggle: (checked: boolean) => void;
    onTimeChange: (value: string) => void;
}

export default function AttendanceLateControl({
    employeeId,
    checked,
    lateTime,
    disabled,
    onToggle,
    onTimeChange,
}: AttendanceLateControlProps) {
    return (
        <div className="flex min-w-[150px] flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#334155]">
                <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) =>
                        onToggle(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] disabled:cursor-not-allowed"
                />
                Late
            </label>

            {checked && !disabled ? (
                <input
                    type="time"
                    aria-label={`Late time for employee ${employeeId}`}
                    value={lateTime}
                    onChange={(event) =>
                        onTimeChange(event.target.value)
                    }
                    className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10"
                />
            ) : null}
        </div>
    );
}
