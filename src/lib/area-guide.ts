import { comparablePrice, isPubliclySearchable } from "./listing-utils";
import type { Listing } from "./types";

export interface PriceSummary {
  count: number;
  median: number;
  low: number;
  high: number;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Median and range of asking prices (rent turned into a yearly figure). Null when there's nothing to summarise. */
export function priceSummary(listings: Listing[]): PriceSummary | null {
  if (!listings.length) return null;
  const prices = listings.map(comparablePrice);
  return { count: prices.length, median: median(prices), low: Math.min(...prices), high: Math.max(...prices) };
}

export interface AreaSummary {
  rent: Listing[];
  sale: Listing[];
  rentPrices: PriceSummary | null;
  salePrices: PriceSummary | null;
  /** Yearly rent by number of bedrooms ("3" = 3 bedrooms; "4+" = 4 or more). */
  rentByBeds: { beds: string; summary: PriceSummary }[];
}

/** Live listings in these areas and their asking prices — demo data in this browser, not market prices. */
export function areaSummary(all: Listing[], areas: string[]): AreaSummary {
  const live = all.filter((l) => areas.includes(l.area) && isPubliclySearchable(l));
  const rent = live.filter((l) => l.purpose === "rent");
  const sale = live.filter((l) => l.purpose === "sale");
  const groups: Record<string, Listing[]> = {};
  for (const l of rent) {
    const k = l.bedrooms >= 4 ? "4+" : String(l.bedrooms);
    (groups[k] ??= []).push(l);
  }
  const rentByBeds = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([beds, ls]) => ({ beds, summary: priceSummary(ls)! }));
  return { rent, sale, rentPrices: priceSummary(rent), salePrices: priceSummary(sale), rentByBeds };
}

/** Link to an area guide. Works for single areas ("Yaba") and groups people search for ("Lekki", "Mainland"). */
export function areaHref(name: string): string {
  return `/areas/${encodeURIComponent(name)}`;
}
