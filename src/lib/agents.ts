import { isPubliclySearchable } from "./listing-utils";
import type { AppData, Listing, User } from "./types";

export interface AgentStats {
  /** Listings shown publicly right now. */
  live: Listing[];
  /** Rented, sold or paused listings (not shown publicly). */
  pastCount: number;
  rentCount: number;
  saleCount: number;
  /** Areas the agent has live listings in, plus the areas they say they serve. */
  areas: string[];
  /** Median minutes from a seeker's first message to the agent's first reply, in this browser's demo data. */
  medianReplyMinutes: number | null;
  repliesMeasured: number;
}

export function isAgent(u: User): boolean {
  return u.roles.includes("agent");
}

/** Facts for an agent's profile page, worked out from demo data stored in this browser. */
export function agentStats(agent: User, data: AppData): AgentStats {
  const mine = data.listings.filter((l) => l.agentId === agent.id);
  const live = mine.filter(isPubliclySearchable);
  const ids = new Set(mine.map((l) => l.id));

  const waits: number[] = [];
  for (const i of data.inquiries) {
    if (!ids.has(i.listingId)) continue;
    const msgs = i.messages ?? [];
    const asked = msgs.find((m) => m.from === "seeker");
    const replied = asked && msgs.find((m) => m.from === "lister" && m.at >= asked.at);
    if (asked && replied) waits.push((Date.parse(replied.at) - Date.parse(asked.at)) / 60000);
  }
  waits.sort((a, b) => a - b);
  const median = waits.length ? waits[Math.floor((waits.length - 1) / 2)] : null;

  const areas = [...new Set([...(agent.areasServed ?? []), ...live.map((l) => l.area)])];
  return {
    live,
    pastCount: mine.length - live.length,
    rentCount: live.filter((l) => l.purpose === "rent").length,
    saleCount: live.filter((l) => l.purpose === "sale").length,
    areas,
    medianReplyMinutes: median,
    repliesMeasured: waits.length,
  };
}

/** "Usually replies within an hour" — or a plain note when there isn't enough to say. */
export function replyTimeLabel(s: AgentStats): string {
  const m = s.medianReplyMinutes;
  if (m === null) return "No replies yet to measure";
  if (m < 60) return "Usually replies within an hour";
  if (m < 60 * 6) return "Usually replies within a few hours";
  if (m < 60 * 24) return "Usually replies within a day";
  return `Usually replies in about ${Math.round(m / (60 * 24))} days`;
}

/** "Agency name" without the demo "(fictional)" suffix. */
export function agencyLabel(u: User): string {
  return u.agencyName?.replace(/ \(fictional\)$/, "") ?? "Independent agent";
}
