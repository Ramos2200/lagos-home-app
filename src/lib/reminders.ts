import { OPEN_VIEWING, STALE_AFTER_DAYS } from "./constants";
import { daysFromNowISO, daysSince, todayISO } from "./format";
import { effectiveStatus } from "./listing-utils";
import type { AppData, Inquiry, Listing } from "./types";

/**
 * In-app reminders for owners and agents. Shown only inside IleLagos — nothing is emailed,
 * texted or pushed to a phone.
 */
export interface Reminder {
  id: string;
  /** urgent: renters already see a problem; soon: due within a week; tip: would improve the listing. */
  tone: "urgent" | "soon" | "tip";
  title: string;
  body: string;
  listingId?: string;
  /** "confirm" shows a one-tap button to confirm availability; otherwise a link. */
  action: { kind: "confirm"; listingId: string } | { kind: "link"; href: string; label: string };
}

const live = (l: Listing) => ["available", "under_offer", "unconfirmed"].includes(effectiveStatus(l));

/** Listings this person manages: their own (listed by them as owner) and the ones they list as an agent. */
export function managedListings(data: AppData, userId: string): Listing[] {
  return data.listings.filter((l) => l.agentId === userId || (l.ownerId === userId && l.listedBy === "owner"));
}

export function listerReminders(listings: Listing[], inquiries: Inquiry[], hasPhotos: (id: string) => boolean): Reminder[] {
  const out: Reminder[] = [];
  const ids = new Set(listings.map((l) => l.id));
  const mine = inquiries.filter((i) => ids.has(i.listingId));
  const title = (id: string) => listings.find((l) => l.id === id)?.title ?? "your listing";

  // 1. Availability checks: overdue first, then due within a week.
  for (const l of listings.filter(live)) {
    const age = daysSince(l.lastConfirmed);
    if (age > STALE_AFTER_DAYS || l.status === "unconfirmed") {
      out.push({
        id: `due-${l.id}`,
        tone: "urgent",
        title: `Confirm “${l.title}” is still available`,
        body: `Last confirmed ${age} days ago. Renters now see “Availability unconfirmed”.`,
        listingId: l.id,
        action: { kind: "confirm", listingId: l.id },
      });
    } else if (age > STALE_AFTER_DAYS - 7) {
      out.push({
        id: `soon-${l.id}`,
        tone: "soon",
        title: `Confirm “${l.title}” is still available`,
        body: `Due in ${STALE_AFTER_DAYS - age} day${STALE_AFTER_DAYS - age === 1 ? "" : "s"} — confirm now to keep it marked as available.`,
        listingId: l.id,
        action: { kind: "confirm", listingId: l.id },
      });
    }
  }

  // 2. People waiting for a reply.
  const waiting = mine.filter((i) => i.status === "new");
  const old = waiting.filter((i) => daysSince(i.createdAt) >= 1);
  if (waiting.length) {
    out.push({
      id: "replies",
      tone: old.length ? "urgent" : "soon",
      title: `${waiting.length} ${waiting.length === 1 ? "person is" : "people are"} waiting for a reply`,
      body: old.length ? `${old.length} ${old.length === 1 ? "has" : "have"} been waiting a day or more.` : "Replying quickly helps you find a tenant or buyer sooner.",
      action: { kind: "link", href: "/messages", label: "Open messages" },
    });
  }

  // 3. Viewings today or tomorrow.
  const today = todayISO();
  const tomorrow = daysFromNowISO(1);
  for (const i of mine.filter((x) => x.type === "viewing" && OPEN_VIEWING.includes(x.status) && x.status !== "new")) {
    const date = i.status === "reschedule" ? i.proposedDate : i.preferredDate;
    if (date !== today && date !== tomorrow) continue;
    out.push({
      id: `viewing-${i.id}`,
      tone: "soon",
      title: `Viewing ${date === today ? "today" : "tomorrow"}: ${title(i.listingId)}`,
      body: `With ${i.name}${i.preferredTime ? `, ${i.preferredTime.toLowerCase()}` : ""}${i.status === "reschedule" ? " (new time not yet agreed)" : ""}.`,
      listingId: i.listingId,
      action: { kind: "link", href: `/messages#${i.id}`, label: "Open conversation" },
    });
  }

  // 4. Tips that make a live listing more useful (at most three, so the list stays short).
  const tips: Reminder[] = [];
  for (const l of listings.filter(live)) {
    const edit = `/dashboard/listings/${l.id}/edit`;
    if (!hasPhotos(l.id)) tips.push({ id: `photos-${l.id}`, tone: "tip", title: `Add photos to “${l.title}”`, body: "Listings with real photos are easier to trust and compare.", listingId: l.id, action: { kind: "link", href: edit, label: "Add photos" } });
    else if (!l.details.flooding) tips.push({ id: `flood-${l.id}`, tone: "tip", title: `Say whether “${l.title}” floods`, body: "Flooding is one of the first things renters ask about.", listingId: l.id, action: { kind: "link", href: edit, label: "Add flooding info" } });
  }
  return [...out, ...tips.slice(0, 3)];
}

/** Reminders that need doing (not tips), for the badge in the header. */
export function reminderCount(rs: Reminder[]): number {
  return rs.filter((r) => r.tone !== "tip").length;
}
