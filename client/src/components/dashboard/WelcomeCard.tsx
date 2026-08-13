import dayjs from "dayjs";

interface WelcomeCardProps {
  name: string;
}

export default function WelcomeCard({ name }: WelcomeCardProps) {
  const now = dayjs();

  const currentDate = now.format("dddd, DD MMMM YYYY");
  const currentTime = now.format("hh:mm A");

  return (
    <div className="mb-7">
      <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
        Welcome back, {name} 👋
      </h1>

      <p className="mt-1 text-sm text-[#64748B]">
        {currentDate} • {currentTime}
      </p>
    </div>
  );
}