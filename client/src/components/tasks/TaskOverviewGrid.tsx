import type { ReactNode } from "react";

export function TaskOverviewGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 items-start gap-2.5 sm:gap-3">
      {children}
    </dl>
  );
}

export function TaskOverviewField({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#E2E8F0] bg-white p-3">
      <dt className="mb-1.5 flex min-w-0 items-center gap-1.5 text-xs font-medium leading-4 text-[#64748B]">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm font-semibold leading-5 text-[#1E293B] [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}
