import StatsCard, { type StatCard } from "./StatsCard";

interface StatisticsSectionProps {
  stats: StatCard[];
}

export default function StatisticsSection({ stats }: StatisticsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <StatsCard key={stat.label} {...stat} delay={index * 0.05} />
      ))}
    </div>
  );
}