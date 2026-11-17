"use client";

import Link from "next/link";
import { useState } from "react";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE, OPEN_VIEWING, STALE_AFTER_DAYS } from "@/lib/constants";
import { FREQUENCY_LABEL, daysSince, naira, relativeDays, todayISO } from "@/lib/format";
import { effectiveStatus } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Inquiry, Listing } from "@/lib/types";
import { Badge, StatusBadge } from "./Badges";
import { CheckIcon } from "./Icons";
import { ContactLine, unreadFor, whenText } from "./InquiryBits";
import { ListingCover } from "./ListingCover";

/* ── Grouping helpers ─────────────────────────────────────── */

export const isLive = (l: Listing) => ["available", "under_offer", "unconfirmed"].includes(effectiveStatus(l));
export const isHidden = (l: Listing) => !isLive(l);
/** Live listings whose availability check is overdue (shown to renters as unconfirmed). */
export const isCheckDue = (l: Listing) => isLive(l) && (daysSince(l.lastConfirmed) > STALE_AFTER_DAYS || l.status === "unconfirmed");
/** Live listings that will need a check within the next week. */
export const isCheckSoon = (l: Listing) => isLive(l) && !isCheckDue(l) && daysSince(l.lastConfirmed) > STALE_AFTER_DAYS - 7;

export const upcomingViewings = (inquiries: Inquiry[]) =>
  inquiries
    .filter((i) => i.type === "viewing" && OPEN_VIEWING.includes(i.status) && (!i.preferredDate || i.preferredDate >= todayISO()))
    .sort((a, b) => (a.preferredDate ?? "").localeCompare(b.preferredDate ?? ""));

/* ── Demo activity (only real counts recorded in this browser) ── */

export function DemoActivity({ listing }: { listing: Listing }) {
  const { data } = useStore();
  const views = data.viewCounts[listing.id] ?? 0;
  const saved = data.savedListingIds.includes(listing.id);
  if (!views && !saved) return null; // never show made-up numbers
  return (
    <p className="text-xs text-ink-500">
      <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase">This browser</span>
      {views > 0 && <>{views} page {views === 1 ? "view" : "views"}</>}
      {views > 0 && saved && " · "}
      {saved && "saved"} in this browser only
    </p>
  );
}

/* ── Availability check row ───────────────────────────────── */

export function AvailabilityCheckItem({ listing }: { listing: Listing }) {
  const { confirmAvailability, setListingStatus } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const doneWord = listing.purpose === "rent" ? "rented" : "sold";
  const overdue = isCheckDue(listing);

  if (done) {
    return (
      <li className="flex items-center gap-2 px-4 py-3 text-sm text-brand-800" role="status">
        <CheckIcon size={16} className="text-brand-600" /> {done}
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <Link href={`/listings/${listing.id}`} className="font-semibold text-ink-900 hover:underline">{listing.title}</Link>
          <p className={`text-xs ${overdue ? "font-medium text-orange-800" : "text-ink-500"}`}>
            Last confirmed {relativeDays(listing.lastConfirmed)} · {overdue ? "renters now see “Availability unconfirmed”" : `due in ${STALE_AFTER_DAYS - daysSince(listing.lastConfirmed)} days`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`${overdue ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => {
              confirmAvailability(listing.id);
              setDone(`Confirmed — “${listing.title}” is shown as available again.`);
            }}
          >
            <CheckIcon size={14} /> Still available
          </button>
          <button className="btn-secondary btn-sm" onClick={() => setConfirming(true)}>Mark as {doneWord}</button>
        </div>
      </div>
      {confirming && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alertdialog" aria-label={`Mark as ${doneWord}`}>
          Mark as {doneWord}? It will be hidden from search. You can relist it from Listings.
          <div className="mt-2 flex gap-2">
            <button
              className="btn-danger btn-sm"
              autoFocus
              onClick={() => {
                setListingStatus(listing.id, listing.purpose === "rent" ? "rented" : "sold");
                setDone(`Marked as ${doneWord} and hidden from search.`);
              }}
            >
              Yes, mark as {doneWord}
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

/* ── Inquiry row (compact) ────────────────────────────────── */

export function InquiryItem({ inquiry, listings }: { inquiry: Inquiry; listings: Listing[] }) {
  const { setInquiryStatus, updateViewing } = useStore();
  const l = listings.find((x) => x.id === inquiry.listingId);
  const unread = unreadFor(inquiry, "lister");
  const viewing = inquiry.type === "viewing";
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 text-sm">
          <p>
            <b className="text-ink-900">{inquiry.name}</b>{" "}
            <span className="text-ink-500">{viewing ? "wants a viewing" : "sent a message"} · {relativeDays(inquiry.createdAt)}</span>
          </p>
          {l && <Link href={`/listings/${l.id}`} className="link text-[13px]">{l.title}</Link>}
          {viewing && <p className="text-xs text-ink-700">Would like to view: {whenText(inquiry.preferredDate, inquiry.preferredTime)}</p>}
          {inquiry.message && <p className="mt-1 line-clamp-2 text-xs text-ink-500">“{inquiry.message}”</p>}
          <p className="mt-0.5 text-xs text-ink-500">Contact: <ContactLine inquiry={inquiry} /></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inquiry.status === "new" && viewing && (
            <button className="btn-primary btn-sm" onClick={() => updateViewing(inquiry.id, "accepted", undefined, "lister")}>
              <CheckIcon size={14} /> Accept
            </button>
          )}
          {inquiry.status === "new" && !viewing && (
            <button className="btn-secondary btn-sm" onClick={() => setInquiryStatus(inquiry.id, "responded")}>
              <CheckIcon size={14} /> Mark as replied
            </button>
          )}
          {inquiry.status !== "new" && <Badge tone={INQUIRY_STATUS_TONE[inquiry.status]}>{INQUIRY_STATUS_LABEL[inquiry.status]}</Badge>}
          <Link href={`/messages#${inquiry.id}`} className="btn-secondary btn-sm">
            {viewing ? "Reply or reschedule" : "Reply"}
            {unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{unread}</span>}
          </Link>
        </div>
      </div>
    </li>
  );
}

/* ── Upcoming viewing row ─────────────────────────────────── */

export function ViewingItem({ inquiry, listings, side = "lister" }: { inquiry: Inquiry; listings: Listing[]; side?: "lister" | "seeker" }) {
  const l = listings.find((x) => x.id === inquiry.listingId);
  const showDate = inquiry.status === "reschedule" && inquiry.proposedDate ? inquiry.proposedDate : inquiry.preferredDate;
  const showTime = inquiry.status === "reschedule" ? inquiry.proposedTime ?? inquiry.preferredTime : inquiry.preferredTime;
  const d = new Date((showDate ?? todayISO()) + "T00:00:00");
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-brand-50 py-1.5 text-brand-800 ring-1 ring-brand-100" aria-hidden>
        <span className="text-[10px] font-semibold uppercase">{showDate ? d.toLocaleDateString("en-GB", { month: "short" }) : "Any"}</span>
        <span className="text-lg leading-none font-semibold">{showDate ? d.getDate() : "–"}</span>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink-900">
          {whenText(showDate, showTime)}
          {inquiry.status === "reschedule" && <span className="font-normal text-orange-800"> · suggested new time</span>}
        </p>
        {side === "lister" ? (
          <p className="text-ink-700">{inquiry.name} <span className="text-xs text-ink-500">· <ContactLine inquiry={inquiry} /></span></p>
        ) : null}
        {l && <Link href={`/listings/${l.id}`} className="link text-[13px]">{l.title}</Link>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge tone={INQUIRY_STATUS_TONE[inquiry.status]}>{INQUIRY_STATUS_LABEL[inquiry.status]}</Badge>
        <Link href={`/messages#${inquiry.id}`} className="link text-xs">Open conversation</Link>
      </div>
    </li>
  );
}

/* ── Small listing row ────────────────────────────────────── */

export function MiniListing({ listing, right }: { listing: Listing; right?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <ListingCover listing={listing} className="h-12 w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Link href={`/listings/${listing.id}`} className="block truncate text-sm font-semibold text-ink-900 hover:underline">{listing.title}</Link>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
          <StatusBadge status={effectiveStatus(listing)} purpose={listing.purpose} className="!px-1.5 !py-0 !text-[11px]" />
          {naira(listing.price)}
          {listing.purpose === "rent" && listing.rentFrequency ? ` ${FREQUENCY_LABEL[listing.rentFrequency]}` : ""}
        </p>
      </div>
      {right}
    </li>
  );
}

/** White surface with divided rows. */
export function RowList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
      {children}
    </ul>
  );
}

