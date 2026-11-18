interface EmployeeWelcomeCardProps {
  name: string;
}

export default function EmployeeWelcomeCard({ name }: EmployeeWelcomeCardProps) {
  return (
    <div className="mb-7 rounded-2xl border border-blue-100 bg-blue-50/50 px-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
        Good morning, {name} 👋
      </h1>
      <p className="mt-1 text-sm text-[#64748B]">Here&apos;s your task overview.</p>
    </div>
  );
}
