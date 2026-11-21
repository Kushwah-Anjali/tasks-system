import StatsCard, { type StatCard } from "./StatsCard";

interface StatisticsSectionProps {
  stats: StatCard[];
}

export default function StatisticsSection({ stats }: StatisticsSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatsCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
