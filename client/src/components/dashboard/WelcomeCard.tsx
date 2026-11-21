import dayjs from "dayjs";

interface WelcomeCardProps {
  name: string;
}

export default function WelcomeCard({ name }: WelcomeCardProps) {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  const currentDate = dayjs().format("dddd, DD MMMM YYYY");

  return (
    <div className="min-w-0">
      <h1 className="break-words text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
        Hi, {firstName} {"\u{1F44B}"}
      </h1>
      <p className="mt-0.5 text-xs text-[#64748B] sm:text-sm">{currentDate}</p>
    </div>
  );
}
