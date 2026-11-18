import type { Task } from "../../types/task";

const getCalendarDayNumber = (value: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
    if (!match) return null;
    const yearValue = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (yearValue < 1 || month < 1 || month > 12 || day < 1) return null;
    const leapYear = yearValue % 4 === 0 && (yearValue % 100 !== 0 || yearValue % 400 === 0);
    const monthLength = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (day > monthLength) return null;

    const year = yearValue - (month <= 2 ? 1 : 0);
    const era = Math.floor(year / 400);
    const yearOfEra = year - era * 400;
    const adjustedMonth = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
    const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
    return era * 146097 + dayOfEra;
};

const getTodayInKolkata = (): string => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
};

export function getTaskAging(task: Pick<Task, "due_date" | "status">) {
    if (!task.due_date) return { label: "No due date", tone: "neutral" as const };
    if (task.status === "completed") return { label: "Completed", tone: "neutral" as const };

    const dueDay = getCalendarDayNumber(task.due_date);
    const today = getCalendarDayNumber(getTodayInKolkata());
    if (dueDay === null || today === null) return { label: "Invalid due date", tone: "neutral" as const };

    const daysRemaining = dueDay - today;
    if (daysRemaining < 0) {
        const daysOverdue = Math.abs(daysRemaining);
        return { label: `Overdue · ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"}`, tone: "overdue" as const };
    }
    if (daysRemaining === 0) return { label: "Due today", tone: "today" as const };
    return { label: `Due in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`, tone: "future" as const };
}

export function formatTaskDate(value: string | null): string {
    if (!value) return "No due date";
    const date = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return value;
    const localCalendarDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return localCalendarDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}
