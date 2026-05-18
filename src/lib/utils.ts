import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Interpret a Postgres/SQL `date` or ISO datetime's date part as local midnight for that calendar day.
 * `parseISO("YYYY-MM-DD")` uses UTC midnight, which shifts the calendar day for `differenceInCalendarDays`
 * and grid comparisons in US (and similar) time zones.
 */
export function parseDateOnlyLocal(value: string): Date {
  const dayPart = value.includes("T") ? value.slice(0, 10) : value.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayPart);
  if (!m) return new Date(Number.NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return new Date(Number.NaN);
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}
