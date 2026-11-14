import { NEARBY, normalize, resolveAreas } from "./areas";
import { STALE_AFTER_DAYS } from "./constants";
import { FREQUENCY_SHORT, annualize, daysSince, localDateOf, nairaCompact, relativeDays } from "./format";
import type { Listing, ListingStatus, Purpose } from "./types";

/**
 * The status shown to the public. A listing the lister marked "available" but
 * has not reconfirmed within STALE_AFTER_DAYS is shown as "Availability unconfirmed".
 */
export function effectiveStatus(l: Listing): ListingStatus {
  if (l.status === "available" && daysSince(l.lastConfirmed) > STALE_AFTER_DAYS) {
    return "unconfirmed";
  }
  return l.status;
}

/** Rented, sold and paused listings are never shown in public search results. */
export function isPubliclySearchable(l: Listing): boolean {
  const s = effectiveStatus(l);
  return s === "available" || s === "under_offer" || s === "unconfirmed";
}

export interface SearchFilters {
  mode: Purpose;
  q: string;
  types: string[];
  min?: number;
  max?: number;
  beds?: number; // minimum bedrooms
  amenities: string[];
  hideUnderOffer: boolean;
  confirmedOnly: boolean;
  sort: "recommended" | "price_asc" | "price_desc" | "move_in_asc" | "newest" | "size_desc" | "reduced";
}

export const DEFAULT_FILTERS: SearchFilters = {
  mode: "rent",
  q: "",
  types: [],
  amenities: [],
  hideUnderOffer: false,
  confirmedOnly: false,
  sort: "recommended",
};

export function filtersFromParams(p: URLSearchParams): SearchFilters {
  const num = (k: string) => {
    const v = p.get(k);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const list = (k: string) => (p.get(k) ?? "").split(",").filter(Boolean);
  const sort = p.get("sort");
  return {
    mode: p.get("mode") === "sale" ? "sale" : "rent",
    q: p.get("q") ?? "",
    types: list("type"),
    min: num("min"),
    max: num("max"),
    beds: num("beds"),
    amenities: list("amen"),
    hideUnderOffer: p.get("hideOffer") === "1",
    confirmedOnly: p.get("confirmed") === "1",
    sort:
      sort === "price_asc" || sort === "price_desc" || sort === "move_in_asc" || sort === "newest" || sort === "size_desc" || sort === "reduced" ? sort : "recommended",
  };
}

export function filtersToQuery(f: SearchFilters): string {
  const p = new URLSearchParams();
  p.set("mode", f.mode);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.min) p.set("min", String(f.min));
  if (f.max) p.set("max", String(f.max));
  if (f.beds) p.set("beds", String(f.beds));
  if (f.amenities.length) p.set("amen", f.amenities.join(","));
  if (f.hideUnderOffer) p.set("hideOffer", "1");
  if (f.confirmedOnly) p.set("confirmed", "1");
  if (f.sort !== "recommended") p.set("sort", f.sort);
  return p.toString();
}

/** Budget comparisons for rent use the annual equivalent so monthly and yearly rents compare fairly. */
export function comparablePrice(l: Listing): number {
  return l.purpose === "rent" ? annualize(l.price, l.rentFrequency) : l.price;
}

export function matchesQuery(l: Listing, q: string): boolean {
  if (!q.trim()) return true;
  // "Lekki, Yaba" means either place.
  if (q.includes(",")) return q.split(",").some((part) => part.trim() && matchesQuery(l, part));
  // 1. The whole query names an area, nickname ("VI") or group ("Lekki", "Mainland").
  const areas = resolveAreas(q);
  if (areas) return areas.includes(l.area);
  // 2. Otherwise every word must appear in the location text, where a word may also be an area alias.
  const hay = normalize([l.area, l.estate, l.landmark, l.streetHint, l.title].join(" "));
  const terms = normalize(q).split(" ").filter(Boolean);
  return terms.every((t) => hay.includes(t) || (resolveAreas(t)?.includes(l.area) ?? false));
}

export function searchListings(all: Listing[], f: SearchFilters): Listing[] {
  const out = all.filter((l) => {
    if (l.purpose !== f.mode) return false;
    if (!isPubliclySearchable(l)) return false;
    const s = effectiveStatus(l);
    if (f.hideUnderOffer && s === "under_offer") return false;
    if (f.confirmedOnly && s !== "available") return false;
    if (!matchesQuery(l, f.q)) return false;
    if (f.types.length && !f.types.includes(l.propertyType)) return false;
    const price = comparablePrice(l);
    if (f.min && price < f.min) return false;
    if (f.max && price > f.max) return false;
    if (f.beds && l.bedrooms < f.beds) return false;
    if (f.amenities.length && !f.amenities.every((a) => l.amenities.includes(a))) return false;
    return true;
  });

  const rank = (l: Listing) => {
    const s = effectiveStatus(l);
    return s === "available" ? 0 : s === "unconfirmed" ? 1 : 2;
  };

  return out.sort((a, b) => {
    switch (f.sort) {
      case "price_asc":
        return comparablePrice(a) - comparablePrice(b);
      case "price_desc":
        return comparablePrice(b) - comparablePrice(a);
      case "move_in_asc":
        return moveInTotal(a).total - moveInTotal(b).total;
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      case "size_desc":
        // Homes without a size go last; ties fall back to more bedrooms first.
        return (b.sizeSqm ?? -1) - (a.sizeSqm ?? -1) || b.bedrooms - a.bedrooms;
      case "reduced": {
        // Most recent price cut first; homes without a cut follow in the recommended order.
        const ca = priceCut(a)?.date ?? "";
        const cb = priceCut(b)?.date ?? "";
        return cb.localeCompare(ca) || rank(a) - rank(b) || b.lastConfirmed.localeCompare(a.lastConfirmed);
      }
      default:
        return rank(a) - rank(b) || b.lastConfirmed.localeCompare(a.lastConfirmed);
    }
  });
}

export interface CostLine {
  key: string;
  label: string;
  /** undefined = the lister didn't say ("Not provided"); 0 = the lister said there is none. */
  amount?: number;
  /** e.g. "per year" for recurring costs. */
  per?: string;
  note?: string;
}

export interface CostBreakdown {
  /** Paid every period: rent, service charge, recurring levies. */
  recurring: CostLine[];
  /** Paid once when moving in (or buying): deposit, agency, legal, one-off levies. */
  oneTime: CostLine[];
  /** First payment estimate, from entered amounts only. */
  firstPayment: number;
  /** Labels of costs the lister left blank — not included in the estimate. */
  notProvided: string[];
}

const PER: Record<string, string> = { annual: "per year", monthly: "per month", quarterly: "per quarter" };
const FIRST: Record<string, string> = { annual: "first year", monthly: "first month", quarterly: "first quarter" };

/**
 * Splits a listing's costs into recurring and one-time amounts and estimates the first payment
 * using only the amounts the lister actually entered. Unknown amounts are never treated as zero.
 */
export type CostInput = Pick<Listing, "purpose" | "price" | "rentFrequency" | "costs">;

export function costBreakdown(l: CostInput): CostBreakdown {
  const c = l.costs;
  const rent = l.purpose === "rent";
  const recurring: CostLine[] = [];
  const oneTime: CostLine[] = [];

  if (rent) {
    recurring.push({ key: "rent", label: "Rent", amount: l.price, per: PER[l.rentFrequency ?? "annual"], note: `Paid ${l.rentFrequency === "monthly" ? "monthly" : l.rentFrequency === "quarterly" ? "quarterly" : "annually (once a year)"}` });
  }
  recurring.push({
    key: "service",
    label: "Service charge",
    amount: c.serviceCharge,
    per: c.serviceChargeFrequency ? PER[c.serviceChargeFrequency] : undefined,
    note: "Estate or building costs such as security, water and power backup",
  });
  for (const [i, o] of (c.other ?? []).entries()) {
    if (o.recurring) recurring.push({ key: `other-r-${i}`, label: o.label, amount: o.amount, per: o.frequency ? PER[o.frequency] : undefined });
  }

  if (rent) oneTime.push({ key: "caution", label: "Caution deposit", amount: c.cautionDeposit, note: "Usually refundable when you move out" });
  oneTime.push({ key: "agency", label: "Agency fee", amount: c.agencyFee });
  oneTime.push({ key: "legal", label: rent ? "Legal / agreement fee" : "Legal fee", amount: c.legalFee });
  for (const [i, o] of (c.other ?? []).entries()) {
    if (!o.recurring) oneTime.push({ key: `other-o-${i}`, label: o.label, amount: o.amount });
  }

  const known = (x: CostLine) => typeof x.amount === "number";
  const firstPayment =
    (rent ? 0 : l.price) +
    recurring.filter(known).reduce((s, x) => s + (x.amount ?? 0), 0) +
    oneTime.filter(known).reduce((s, x) => s + (x.amount ?? 0), 0);
  const notProvided = [...recurring, ...oneTime].filter((x) => !known(x)).map((x) => x.label);
  return { recurring, oneTime, firstPayment, notProvided };
}

/** Label for one period of a recurring cost in the first payment, e.g. "first year". */
export function firstPeriodLabel(freq?: string): string {
  return FIRST[freq ?? "annual"] ?? "first period";
}

/** Total paid up front, from entered amounts only. Kept for cards, sorting and the sticky bar. */
export function moveInTotal(l: CostInput): { total: number; notProvided: string[] } {
  const b = costBreakdown(l);
  return { total: b.firstPayment, notProvided: b.notProvided };
}

export function locationLine(l: Listing): string {
  return [l.estate, l.area, "Lagos"].filter(Boolean).join(", ");
}

/** Other live listings for the same purpose, nearest area and closest size first. */
export function similarListings(all: Listing[], l: Listing, n = 3): Listing[] {
  const near = NEARBY[l.area] ?? [];
  const score = (x: Listing) =>
    (x.area === l.area ? 0 : near.includes(x.area) ? 1 : 3) +
    Math.abs(x.bedrooms - l.bedrooms) * 0.5 +
    Math.abs(Math.log(comparablePrice(x) / comparablePrice(l)));
  return all
    .filter((x) => x.id !== l.id && x.purpose === l.purpose && isPubliclySearchable(x))
    .sort((a, b) => score(a) - score(b))
    .slice(0, n);
}

export interface AvailabilityInfo {
  /** Short label for cards, e.g. "Available now", "Available from 20 Nov". */
  label: string;
  tone: "green" | "amber" | "orange" | "slate";
  /** Secondary line, e.g. "Confirmed by lister 3 days ago". */
  detail: string;
}

export function availabilityInfo(l: Listing): AvailabilityInfo {
  const s = effectiveStatus(l);
  const confirmed = `Confirmed by lister ${relativeDays(l.lastConfirmed)}`;
  const from = new Date(l.availableFrom + "T00:00:00");
  const future = daysSince(l.availableFrom) < 0;
  const fromLabel = from.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  switch (s) {
    case "available":
      return { label: future ? `Available from ${fromLabel}` : "Available now", tone: "green", detail: confirmed };
    case "under_offer":
      return { label: "Under offer", tone: "amber", detail: confirmed };
    case "unconfirmed":
      return {
        label: "Availability unconfirmed",
        tone: "orange",
        detail: `Last confirmed ${relativeDays(l.lastConfirmed)} — ask before visiting`,
      };
    case "rented":
      return { label: "Rented", tone: "slate", detail: "No longer available" };
    case "sold":
      return { label: "Sold", tone: "slate", detail: "No longer available" };
    default:
      return { label: "Paused", tone: "slate", detail: "Hidden by the lister" };
  }
}

export interface FeePart {
  label: string;
  short: string;
  amount: number;
  suffix?: string;
}

/** Fees and charges on top of the rent or price, only those the lister provided. */
export function feeParts(l: Listing): FeePart[] {
  const c = l.costs;
  const parts: FeePart[] = [];
  if (c.agencyFee) parts.push({ label: "Agency fee", short: "Agency", amount: c.agencyFee });
  if (c.legalFee) parts.push({ label: "Legal / agreement fee", short: "Legal", amount: c.legalFee });
  if (l.purpose === "rent" && c.cautionDeposit) parts.push({ label: "Caution deposit", short: "Caution", amount: c.cautionDeposit });
  if (c.serviceCharge)
    parts.push({
      label: "Service charge",
      short: "Service",
      amount: c.serviceCharge,
      suffix: c.serviceChargeFrequency ? FREQUENCY_SHORT[c.serviceChargeFrequency] : undefined,
    });
  for (const o of c.other ?? []) if (o.amount) parts.push({ label: o.label, short: o.label.replace(/\s*\(.*\)$/, ""), amount: o.amount });
  return parts;
}

export interface SearchUpdate {
  listing: Listing;
  kind: "new" | "updated";
}

/** When a listing last changed. Older demo data only has a date, so it counts from the start of that day. */
export function changedAt(l: Listing): string {
  return l.modifiedAt ?? `${l.updatedAt}T00:00:00.000Z`;
}

/**
 * Listings matching a saved search that were added or changed since the person last looked.
 * In-app only — nothing is emailed, texted or pushed.
 */
export function searchUpdates(all: Listing[], query: string, lastSeenAt?: string): SearchUpdate[] {
  if (!lastSeenAt) return [];
  const seenDay = localDateOf(lastSeenAt);
  return searchListings(all, filtersFromParams(new URLSearchParams(query)))
    .filter((l) => changedAt(l) > lastSeenAt)
    .map((l) => ({ listing: l, kind: l.createdAt >= seenDay ? ("new" as const) : ("updated" as const) }));
}

/** A listing counts as "New" for this many days after it was first listed. */
export const NEW_FOR_DAYS = 7;
/** A price drop shows as "Price cut" for this many days. */
export const PRICE_CUT_FOR_DAYS = 45;

/** The latest asking-price drop, if the most recent change in the price history was a reduction. */
export function priceCut(l: Listing): { amount: number; date: string } | null {
  const pts = [...l.priceHistory].sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (last.price >= prev.price) return null;
  return { amount: prev.price - last.price, date: last.date };
}

export interface ListingBadge {
  key: "new" | "price_cut";
  label: string;
  /** Longer text for screen readers and tooltips. */
  title: string;
}

/** Short labels shown on cards and the listing page: "New" and "Price cut". */
export function listingBadges(l: Listing): ListingBadge[] {
  const out: ListingBadge[] = [];
  const age = daysSince(l.createdAt);
  if (age <= NEW_FOR_DAYS) out.push({ key: "new", label: "New", title: `Listed ${relativeDays(l.createdAt)}` });
  const cut = priceCut(l);
  if (cut && daysSince(cut.date) <= PRICE_CUT_FOR_DAYS) {
    const per = l.purpose === "rent" && l.rentFrequency ? FREQUENCY_SHORT[l.rentFrequency] : "";
    out.push({ key: "price_cut", label: `Price cut ${nairaCompact(cut.amount)}${per}`, title: `Asking price lowered ${relativeDays(cut.date)}` });
  }
  return out;
}

/** "today", "1 day ago", "23 days ago" — how long since the listing was first put up. */
export function daysListedLabel(l: Listing): string {
  const d = Math.max(daysSince(l.createdAt), 0);
  return d === 0 ? "today" : `${d} day${d === 1 ? "" : "s"} ago`;
}

