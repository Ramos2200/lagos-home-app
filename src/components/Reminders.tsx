"use client";

import Link from "next/link";
import { useState } from "react";
import { usePhotoStore } from "@/lib/photos";
import { listerReminders, type Reminder } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { LISTING_IMAGES } from "@/lib/images";

const TONE: Record<Reminder["tone"], { dot: string; label: string }> = {
  urgent: { dot: "bg-red-600", label: "Overdue" },
  soon: { dot: "bg-amber-500", label: "Soon" },
  tip: { dot: "bg-sky-500", label: "Tip" },
};

/** A short to-do list for owners and agents, shown inside the app only. */
export function RemindersPanel({ listings }: { listings: Listing[] }) {
  const { data, confirmAvailability } = useStore();
  const { uploaded } = usePhotoStore();
  const [done, setDone] = useState("");
  const reminders = listerReminders(listings, data.inquiries, (id) => uploaded(id).length > 0 || !!LISTING_IMAGES[id]?.length);

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="reminders-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reminders-title" className="section-title">Reminders</h2>
        <p className="text-xs text-ink-500">Shown here in the app only — nothing is sent to your phone or email.</p>
      </div>
      <p className="sr-only" role="status">{done}</p>
      {done && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800" aria-hidden>{done}</p>}
      {reminders.length === 0 ? (
        <p className="mt-3 text-sm text-ink-700">You&apos;re all caught up. Availability is confirmed and no one is waiting for a reply.</p>
      ) : (
        <ul className="mt-3 divide-y divide-sand-200">
          {reminders.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[r.tone].dot}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  <span className="sr-only">{TONE[r.tone].label}: </span>
                  {r.title}
                </p>
                <p className="text-xs text-ink-500">{r.body}</p>
              </div>
              {r.action.kind === "confirm" ? (
                <button
                  type="button"
                  className={r.tone === "urgent" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                  onClick={() => {
                    if (r.action.kind !== "confirm") return;
                    confirmAvailability(r.action.listingId);
                    setDone(`Confirmed — “${listings.find((l) => l.id === r.listingId)?.title}” is shown as available, checked today.`);
                  }}
                >
                  Yes, still available
                </button>
              ) : (
                <Link href={r.action.href} className="btn-secondary btn-sm">{r.action.label}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {reminders.some((r) => r.action.kind === "confirm") && (
        <p className="mt-2 text-xs text-ink-500">If a home has been rented, sold or paused, change its status from your listings instead.</p>
      )}
    </section>
  );
}
