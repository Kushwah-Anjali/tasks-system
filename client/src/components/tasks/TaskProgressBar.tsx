interface TaskProgressBarProps {
  progress: number;
}

export default function TaskProgressBar({ progress }: TaskProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-medium text-[#64748B]">{clamped}%</span>
    </div>
  );
}