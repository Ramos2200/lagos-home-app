import type { RentFrequency } from "./types";

export function naira(n: number): string {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

export function nairaCompact(n: number): string {
  if (n >= 1_000_000_000) return "₦" + trim(n / 1_000_000_000) + "B";
  if (n >= 1_000_000) return "₦" + trim(n / 1_000_000) + "M";
  if (n >= 1_000) return "₦" + trim(n / 1_000) + "k";
  return "₦" + n;
}

function trim(x: number): string {
  return x.toFixed(x < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

export const FREQUENCY_LABEL: Record<RentFrequency, string> = {
  annual: "per year",
  monthly: "per month",
  quarterly: "per quarter",
};

export const FREQUENCY_SHORT: Record<RentFrequency, string> = {
  annual: "/yr",
  monthly: "/mo",
  quarterly: "/qtr",
};

export function annualize(amount: number, freq?: RentFrequency): number {
  if (freq === "monthly") return amount * 12;
  if (freq === "quarterly") return amount * 4;
  return amount;
}

/** Local calendar date as yyyy-mm-dd (never UTC, so dates don't shift late in the evening). */
function localISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayISO(): string {
  return localISO(new Date());
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localISO(d);
}

export function daysFromNowISO(days: number): string {
  return daysAgoISO(-days);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(iso: string): number {
  const then = new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).getTime();
  const now = new Date(todayISO() + "T00:00:00").getTime();
  return Math.round((now - then) / 86_400_000);
}

export function relativeDays(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  const months = Math.round(d / 30);
  return months === 1 ? "about a month ago" : `about ${months} months ago`;
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Local calendar date (yyyy-mm-dd) of an ISO date-time, so late-evening times don't show as tomorrow. */
export function localDateOf(isoDateTime: string): string {
  return localISO(new Date(isoDateTime));
}
