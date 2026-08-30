interface TaskSummaryCardsProps {
    total: number;
    inProgress: number;
    completed: number;
    pending: number;
}

interface SummaryCard {
    key: keyof TaskSummaryCardsProps;
    label: string;
    valueClassName: string;
}

const summaryCards: SummaryCard[] = [
    {
        key: "total",
        label: "Total Tasks",
        valueClassName: "text-[#0F172A]",
    },
    {
        key: "inProgress",
        label: "In Progress",
        valueClassName: "text-[#2563EB]",
    },
    {
        key: "completed",
        label: "Completed",
        valueClassName: "text-[#16A34A]",
    },
    {
        key: "pending",
        label: "Pending",
        valueClassName: "text-[#D97706]",
    },
];

export default function TaskSummaryCards(
    props: TaskSummaryCardsProps
) {
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map((card) => (
                <div
                    key={card.key}
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
                >
                    <p className="text-sm font-medium text-[#64748B]">
                        {card.label}
                    </p>

                    <p
                        className={`mt-2 text-2xl font-bold ${card.valueClassName}`}
                    >
                        {props[card.key]}
                    </p>
                </div>
            ))}
        </div>
    );
}