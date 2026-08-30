interface TaskProgressBarProps {
    progress: number;
    className?: string;
}

export default function TaskProgressBar({
    progress,
    className = "",
}: TaskProgressBarProps) {
    const normalizedProgress =
        Number.isFinite(progress)
            ? Math.min(
                  100,
                  Math.max(0, progress)
              )
            : 0;

    return (
        <div
            className={`flex items-center gap-2.5 ${className}`}
        >
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F1F5F9]">
                <div
                    className="h-full rounded-full bg-[#2563EB] transition-[width] duration-300"
                    style={{
                        width: `${normalizedProgress}%`,
                    }}
                />
            </div>

            <span className="min-w-8 text-xs font-medium text-[#64748B]">
                {normalizedProgress}%
            </span>
        </div>
    );
}