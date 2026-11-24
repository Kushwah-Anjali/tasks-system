export const LEAD_AGE_THRESHOLDS = { neutralMax: 3, amberMax: 7 } as const;
export const LEAD_TIME_ZONE = "Asia/Kolkata";

export function todayInKolkata(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LEAD_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function calendarDayDifference(from: string, to: string): number {
  const fromParts = from.split("-").map(Number);
  const toParts = to.split("-").map(Number);
  const fromUtc = Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2]);
  const toUtc = Date.UTC(toParts[0], toParts[1] - 1, toParts[2]);
  return Math.max(0, Math.floor((toUtc - fromUtc) / 86_400_000));
}

export function formatLeadDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: LEAD_TIME_ZONE }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatLeadTimestamp(value: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? new Date(`${value.replace(" ", "T")}+05:30`)
    : new Date(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: LEAD_TIME_ZONE }).format(parsed);
}

export function timestampKolkataDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LEAD_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function ageLabel(leadDate: string, today = todayInKolkata()): string {
  const days = calendarDayDifference(leadDate, today);
  return days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`;
}

export function ageTone(days: number): "neutral" | "amber" | "red" {
  if (days <= LEAD_AGE_THRESHOLDS.neutralMax) return "neutral";
  return days <= LEAD_AGE_THRESHOLDS.amberMax ? "amber" : "red";
}

export function isValidIndianPhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}

export function phoneLookupKey(value: string): string {
  return value.replace(/[\s().-]/g, "").replace(/^(?:\+?91|0091|0)/, "");
}
