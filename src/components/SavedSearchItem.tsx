"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate, localDateOf, naira, relativeDays } from "@/lib/format";
import { changedAt, filtersFromParams, searchListings, searchUpdates } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { SavedSearch } from "@/lib/types";
import { Badge } from "./Badges";

/** When a saved search was last looked at; older saved searches count from the day they were saved. */
export const seenAt = (s: SavedSearch) => s.lastSeenAt ?? `${s.createdAt}T00:00:00.000Z`;

/**
 * One saved search: how many homes match now, and which matches are new or updated since
 * the person last looked. Updates are shown in the app only — no email, SMS or push.
 */
export function SavedSearchItem({ search }: { search: SavedSearch }) {
  const { data, deleteSearch, markSearchSeen } = useStore();
  const [open, setOpen] = useState(false);
  const count = searchListings(data.listings, filtersFromParams(new URLSearchParams(search.query))).length;
  const updates = searchUpdates(data.listings, search.query, seenAt(search));

  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
            {search.label}
            {updates.length > 0 && <Badge tone="green" dot>{updates.length} new or updated</Badge>}
          </p>
          <p className="text-xs text-ink-500">
            {count} {count === 1 ? "home matches" : "homes match"} now · saved {formatDate(search.createdAt)} · last checked {relativeDays(localDateOf(seenAt(search)))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/search?${search.query}`} className="btn-secondary btn-sm" onClick={() => markSearchSeen(search.id)}>
            Show homes
          </Link>
          <button className="btn-ghost btn-sm" onClick={() => deleteSearch(search.id)} aria-label={`Remove saved search: ${search.label}`}>
            Remove
          </button>
        </div>
      </div>

      {updates.length > 0 && (
        <div className="mt-3 rounded-xl bg-brand-50/60 p-3 ring-1 ring-brand-100">
          <button type="button" className="link text-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "See"} what&apos;s new or updated
          </button>
          {open && (
            <ul className="mt-2 space-y-2">
              {updates.map(({ listing: l, kind }) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <Badge tone={kind === "new" ? "green" : "amber"} className="mr-2">{kind === "new" ? "New" : "Updated"}</Badge>
                    <Link href={`/listings/${l.id}`} className="font-medium text-ink-900 hover:underline">{l.title}</Link>
                    <span className="text-ink-500"> · {l.area} · {naira(l.price)}{l.purpose === "rent" && l.rentFrequency ? (l.rentFrequency === "monthly" ? " per month" : l.rentFrequency === "quarterly" ? " per quarter" : " per year") : ""}</span>
                  </span>
                  <span className="text-xs text-ink-500">changed {relativeDays(localDateOf(changedAt(l)))}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="mt-2 block text-xs font-semibold text-ink-500 hover:text-ink-900" onClick={() => markSearchSeen(search.id)}>
            Mark as seen
          </button>
        </div>
      )}
    </li>
  );
}
