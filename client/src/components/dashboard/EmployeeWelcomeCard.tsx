interface EmployeeWelcomeCardProps {
  name: string;
}

export default function EmployeeWelcomeCard({ name }: EmployeeWelcomeCardProps) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
        Good morning, {name} 👋
      </h1>
      <p className="mt-1 text-sm text-[#64748B]">Here&apos;s your attendance overview.</p>
    </div>
  );
}