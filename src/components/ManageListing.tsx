"use client";

import { SeekerProfileView } from "./SeekerProfileView";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE, STALE_AFTER_DAYS, STATUS_OPTIONS, statusLabel } from "@/lib/constants";
import { FREQUENCY_LABEL, daysSince, formatDate, naira, relativeDays, todayISO } from "@/lib/format";
import { effectiveStatus, locationLine } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Inquiry, Listing, ListingStatus } from "@/lib/types";
import { Badge, OccupancyBadge, StatusBadge } from "./Badges";
import { CheckIcon } from "./Icons";
import { DemoActivity } from "./DashboardParts";
import { ListingPhoto } from "./ListingPhoto";
import { EmptyState } from "./ui";
import { ListingCheckList } from "./ListingChecks";
import { ContactLine, unreadFor, whenText } from "./InquiryBits";

type Snapshot = Pick<Listing, "status" | "lastConfirmed" | "checks">;

export function ManageListingRow({
  listing,
  inquiryCount,
  readOnlyReason,
  onViewInquiries,
}: {
  listing: Listing;
  inquiryCount: number;
  readOnlyReason?: string;
  onViewInquiries?: () => void;
}) {
  const { data, setListingStatus, confirmAvailability, setListingCheck, updateListing } = useStore();
  const openReports = data.reports.filter((r) => r.listingId === listing.id && r.status !== "resolved").length;
  const [menu, setMenu] = useState<null | "main" | "status">(null);
  const [confirming, setConfirming] = useState<ListingStatus | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: Snapshot } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = effectiveStatus(listing);
  const stale = daysSince(listing.lastConfirmed) > STALE_AFTER_DAYS || listing.status === "unconfirmed";
  const live = status === "available" || status === "unconfirmed" || status === "under_offer";

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const snapshot = (): Snapshot => ({ status: listing.status, lastConfirmed: listing.lastConfirmed, checks: listing.checks });
  const notify = (msg: string, undo?: Snapshot) => {
    setToast({ msg, undo });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 6000);
  };
  const close = () => {
    setMenu(null);
    setConfirming(null);
  };

  const changeStatus = (s: ListingStatus) => {
    // Rented and Sold remove a listing from search, so ask first.
    if ((s === "rented" || s === "sold") && confirming !== s) {
      setConfirming(s);
      return;
    }
    const before = snapshot();
    setListingStatus(listing.id, s);
    close();
    notify(
      s === "rented" || s === "sold" || s === "paused"
        ? `Marked ${statusLabel(s, listing.purpose)} — hidden from search.`
        : `Status set to ${statusLabel(s, listing.purpose)}.`,
      before,
    );
  };

  const confirmNow = () => {
    const before = snapshot();
    confirmAvailability(listing.id);
    close();
    notify("Availability confirmed for today.", before);
  };

  const doneStatus: ListingStatus = listing.purpose === "rent" ? "rented" : "sold";
  const doneWord = listing.purpose === "rent" ? "rented" : "sold";
  const closed = listing.status === "rented" || listing.status === "sold";

  const visibility = live
    ? { text: "Shown in search", tone: "text-brand-700", dot: "bg-brand-500" }
    : listing.status === "paused"
      ? { text: "Hidden from search · paused", tone: "text-stone-600", dot: "bg-stone-400" }
      : { text: `Hidden from search · marked ${doneWord}`, tone: "text-stone-600", dot: "bg-stone-400" };

  return (
    <li className="card overflow-hidden">
      <div className="flex gap-3 p-3 sm:p-4">
        <Link href={`/listings/${listing.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
          <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} className="h-20 w-24 rounded-lg sm:h-24 sm:w-32" showTag={false} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={status} purpose={listing.purpose} />
            <Badge tone="white" className="!border-sand-200">{listing.purpose === "rent" ? "For rent" : "For sale"}</Badge>
            {listing.occupancy !== "vacant" && <OccupancyBadge occupancy={listing.occupancy} />}
          </div>
          <Link href={`/listings/${listing.id}`} className="mt-1 line-clamp-2 leading-snug font-semibold hover:text-brand-700 hover:underline">
            {listing.title}
          </Link>
          <p className="truncate text-sm text-ink-500">{locationLine(listing)}</p>
          <p className="text-sm font-semibold">
            {naira(listing.price)}
            {listing.rentFrequency && listing.purpose === "rent" && <span className="font-normal text-ink-500"> {FREQUENCY_LABEL[listing.rentFrequency]}</span>}
          </p>
          <DemoActivity listing={listing} />
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-1.5 border-t border-sand-200 bg-sand-50 px-3 py-2.5 text-xs text-ink-500 sm:grid-cols-2 sm:px-4">
        <p className={`flex items-center gap-1.5 font-semibold ${visibility.tone}`}>
          <span className={`h-2 w-2 rounded-full ${visibility.dot}`} aria-hidden />
          {visibility.text}
        </p>
        <p>
          Availability confirmed{" "}
          <b className={stale && live ? "text-orange-700" : "text-ink-700"}>{relativeDays(listing.lastConfirmed)}</b> ({formatDate(listing.lastConfirmed)})
        </p>
        {inquiryCount > 0 ? (
          onViewInquiries ? (
            <button type="button" onClick={onViewInquiries} className="link text-left text-xs">
              {inquiryCount} new {inquiryCount > 1 ? "inquiries" : "inquiry"} — view
            </button>
          ) : (
            <p className="font-semibold text-brand-700">{inquiryCount} new {inquiryCount > 1 ? "inquiries" : "inquiry"}</p>
          )
        ) : (
          <p>No new inquiries</p>
        )}
        <div className="border-t border-sand-200 pt-2 sm:col-span-2">
          <ListingCheckList listing={listing} lister={data.users.find((u) => u.id === listing.ownerId)} agent={listing.agentId ? data.users.find((u) => u.id === listing.agentId) : undefined} />
        </div>
        {openReports > 0 && (
          <p className="font-medium text-red-800 sm:col-span-2">
            {openReports} open {openReports === 1 ? "report" : "reports"} from visitors — IleLagos demo staff are reviewing {openReports === 1 ? "it" : "them"}.
          </p>
        )}
      </div>

      {live && stale && !readOnlyReason && (
        <p className="border-t border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900 sm:px-4">
          Not confirmed for over 30 days, so renters see “Availability unconfirmed”. Tap <b>Still available</b> if nothing has changed.
        </p>
      )}

      {readOnlyReason ? (
        <p className="border-t border-sand-200 px-4 py-2 text-xs text-ink-500">{readOnlyReason}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-t border-sand-200 px-3 py-3 sm:px-4">
            {listing.status === "paused" && (
              <button className="btn-primary btn-sm" onClick={() => changeStatus("available")}>Resume listing</button>
            )}
            {closed && (
              <button className="btn-secondary btn-sm" onClick={() => changeStatus("available")}>Relist as available</button>
            )}
            {live && (
              <button className={`${stale ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={confirmNow}>
                <CheckIcon size={15} /> Still available
              </button>
            )}
            {live && (
              <button className="btn-secondary btn-sm" onClick={() => { setMenu(null); setConfirming(doneStatus); }}>
                Mark as {doneWord}
              </button>
            )}
            <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn-secondary btn-sm">Edit details</Link>
            <button className="btn-ghost btn-sm ml-auto" aria-expanded={menu !== null} onClick={() => (menu ? close() : setMenu("main"))}>
              More options {menu ? "▴" : "▾"}
            </button>
          </div>

          {confirming && menu === null && (
            <div className="border-t border-sand-200 bg-white p-3 sm:px-4" role="alertdialog" aria-label="Confirm status change">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <p>
                  Mark this home as <b>{statusLabel(confirming, listing.purpose).toLowerCase()}</b>? It will be removed from search results. You can undo straight after.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-danger btn-sm" onClick={() => changeStatus(confirming)} autoFocus>
                    Yes, mark as {statusLabel(confirming, listing.purpose).toLowerCase()}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {menu === "main" && (
            <div className="grid border-t border-sand-200 bg-white text-sm" role="menu">
              <MenuItem onClick={() => setMenu("status")}>Change status…</MenuItem>
              {listing.status !== "paused" && <MenuItem onClick={() => changeStatus("paused")}>Pause (hide from search for now)</MenuItem>}
              {listing.checks.documentReview.state === "not_started" && (
                <MenuItem
                  onClick={() => {
                    setListingCheck(listing.id, "documentReview", { state: "submitted", date: todayISO() });
                    close();
                    notify("Document review requested (demo placeholder — nothing uploaded).");
                  }}
                >
                  Request document review
                </MenuItem>
              )}
              {listing.listedBy === "agent" && listing.checks.ownerAuthorization.state === "not_started" && (
                <MenuItem
                  onClick={() => {
                    setListingCheck(listing.id, "ownerAuthorization", { state: "submitted", date: todayISO() });
                    close();
                    notify("Owner authorization marked as submitted (demo — no document uploaded).");
                  }}
                >
                  Mark owner authorization submitted
                </MenuItem>
              )}
              <MenuItem href={`/listings/${listing.id}`}>View public page</MenuItem>
            </div>
          )}

          {menu === "status" && (
            <div className="border-t border-sand-200 bg-white p-3" role="menu">
              <p className="mb-2 text-xs font-semibold text-ink-500">Set status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS[listing.purpose].map((s) => (
                  <button
                    key={s}
                    role="menuitemradio"
                    aria-checked={listing.status === s}
                    disabled={listing.status === s}
                    onClick={() => changeStatus(s)}
                    className={`chip ${confirming === s ? "!border-red-400 !bg-red-50 !text-red-800" : listing.status === s ? "chip-on" : ""}`}
                  >
                    {statusLabel(s, listing.purpose)}
                  </button>
                ))}
              </div>
              {confirming && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alertdialog" aria-label="Confirm status change">
                  <p>
                    Mark as <b>{statusLabel(confirming, listing.purpose)}</b>? It will be removed from search results. You can undo straight after.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn !bg-red-700 btn-sm text-white hover:!bg-red-800" onClick={() => changeStatus(confirming)}>
                      Yes, mark {statusLabel(confirming, listing.purpose)}
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
                  </div>
                </div>
              )}
              <button className="mt-3 text-sm font-semibold text-ink-500" onClick={() => { setConfirming(null); setMenu("main"); }}>
                ← Back
              </button>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="flex items-center gap-3 bg-ink-900 px-4 py-2.5 text-sm text-white" role="status">
          <span className="flex-1">{toast.msg}</span>
          {toast.undo && (
            <button
              className="font-semibold text-brand-200 underline-offset-2 hover:underline"
              onClick={() => {
                updateListing(listing.id, toast.undo!);
                setToast({ msg: "Change undone." });
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function MenuItem({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = "block w-full border-b border-sand-100 px-4 py-3 text-left text-ink-900 last:border-0 hover:bg-sand-50";
  return href ? (
    <Link href={href} role="menuitem" className={cls}>
      {children}
    </Link>
  ) : (
    <button role="menuitem" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

type InqFilter = "action" | "accepted" | "reschedule" | "completed" | "closed" | "all";

const INQ_FILTERS: { value: InqFilter; label: string; match: (i: Inquiry) => boolean }[] = [
  { value: "action", label: "New", match: (i) => i.status === "new" },
  { value: "accepted", label: "Accepted", match: (i) => i.status === "accepted" || i.status === "responded" },
  { value: "reschedule", label: "Reschedule requested", match: (i) => i.status === "reschedule" },
  { value: "completed", label: "Completed", match: (i) => i.status === "completed" },
  { value: "closed", label: "Declined or closed", match: (i) => ["declined", "cancelled", "closed"].includes(i.status) },
  { value: "all", label: "All", match: () => true },
];

export function InquiryList({ inquiries, listings }: { inquiries: Inquiry[]; listings: Listing[] }) {
  const [filter, setFilter] = useState<InqFilter>(() => (inquiries.some((i) => i.status === "new") ? "action" : "all"));
  const current = INQ_FILTERS.find((f) => f.value === filter)!;
  const shown = inquiries.filter(current.match);
  const count = (f: (typeof INQ_FILTERS)[number]) => inquiries.filter(f.match).length;

  if (!inquiries.length) {
    return (
      <EmptyState
        title="No inquiries yet"
        body="When someone requests a viewing or sends a message from your listing page, it appears here."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter inquiries">
        {INQ_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value} className={`chip shrink-0 ${filter === f.value ? "chip-on" : ""}`}>
            {f.label} <span className="text-ink-500">({count(f)})</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title={filter === "action" ? "You're all caught up" : `Nothing under “${current.label}”`}
          body={filter === "action" ? "There are no new requests waiting for you." : undefined}
          action={<button className="btn-secondary btn-sm" onClick={() => setFilter("all")}>Show all inquiries</button>}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((i) => (
            <InquiryCard key={i.id} inquiry={i} listing={listings.find((x) => x.id === i.listingId)} />
          ))}
        </ul>
      )}
    </div>
  );
}

const TIMES = ["Morning", "Afternoon", "Evening"];

function InquiryCard({ inquiry: i, listing: l }: { inquiry: Inquiry; listing?: Listing }) {
  const { updateViewing, setInquiryStatus } = useStore();
  const [mode, setMode] = useState<null | "reschedule" | "decline">(null);
  const [date, setDate] = useState(i.preferredDate ?? todayISO());
  const [time, setTime] = useState(i.preferredTime ?? "Morning");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const viewing = i.type === "viewing";
  const unread = unreadFor(i, "lister");
  const last = [...(i.messages ?? [])].reverse().find((m) => m.from !== "system");

  const submitReschedule = () => {
    if (!date && !time) return setErr("Suggest a date, a time of day, or both.");
    if (date && date < todayISO()) return setErr("Choose today or a later date.");
    updateViewing(i.id, "reschedule", note, "lister", { date: date || undefined, time: time || undefined });
    setMode(null);
    setNote("");
    setErr("");
  };

  return (
    <li className={`card p-4 sm:p-5 ${i.status === "new" ? "border-l-4 !border-l-brand-600" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={viewing ? "green" : "blue"}>{viewing ? "Viewing request" : "Message"}</Badge>
        <Badge tone={INQUIRY_STATUS_TONE[i.status]}>{INQUIRY_STATUS_LABEL[i.status]}</Badge>
        <span className="ml-auto text-xs text-ink-500">Received {formatDate(i.createdAt)}</span>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-500">From</dt>
          <dd className="font-semibold text-ink-900">{i.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Contact</dt>
          <dd><ContactLine inquiry={i} /></dd>
        </div>
        {l && (
          <div>
            <dt className="text-xs text-ink-500">About</dt>
            <dd><Link href={`/listings/${l.id}`} className="link font-medium">{l.title}</Link></dd>
          </div>
        )}
        {viewing && (
          <div>
            <dt className="text-xs text-ink-500">{i.status === "accepted" ? "Agreed time" : "Requested time"}</dt>
            <dd className="font-medium text-ink-900">{whenText(i.preferredDate, i.preferredTime)}</dd>
          </div>
        )}
        {i.status === "reschedule" && (
          <div>
            <dt className="text-xs text-ink-500">You suggested</dt>
            <dd className="font-medium text-orange-800">{whenText(i.proposedDate, i.proposedTime)} · waiting for {i.name.split(" ")[0]}</dd>
          </div>
        )}
      </dl>
      <SeekerProfileView profile={i.profile} purpose={l?.purpose} className="mt-3" />
      {last && <p className="mt-3 line-clamp-2 rounded-lg bg-sand-50 p-3 text-sm text-ink-700 ring-1 ring-sand-200">{last.from === "lister" ? "You: " : ""}“{last.text}”</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/messages#${i.id}`} className="btn-secondary btn-sm">
          Open conversation{unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{unread} new</span>}
        </Link>
        {viewing && i.status === "new" && (
          <>
            <button className="btn-primary btn-sm" onClick={() => updateViewing(i.id, "accepted", undefined, "lister")}>
              <CheckIcon size={14} /> Accept
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setMode("reschedule")}>Suggest another time</button>
            <button className="btn-ghost btn-sm" onClick={() => setMode("decline")}>Decline</button>
          </>
        )}
        {viewing && i.status === "reschedule" && (
          <button className="btn-secondary btn-sm" onClick={() => updateViewing(i.id, "accepted", "The original time works after all.", "lister")}>Accept original time</button>
        )}
        {viewing && i.status === "accepted" && (
          <>
            <button className="btn-primary btn-sm" onClick={() => updateViewing(i.id, "completed", undefined, "lister")}>Mark as completed</button>
            <button className="btn-secondary btn-sm" onClick={() => setMode("reschedule")}>Change time</button>
          </>
        )}
        {!viewing && i.status === "new" && (
          <button className="btn-primary btn-sm" onClick={() => setInquiryStatus(i.id, "responded")}><CheckIcon size={14} /> Mark as replied</button>
        )}
        {!viewing && i.status !== "closed" && <button className="btn-ghost btn-sm" onClick={() => setInquiryStatus(i.id, "closed")}>Close</button>}
        {!viewing && i.status === "closed" && <button className="btn-ghost btn-sm" onClick={() => setInquiryStatus(i.id, "new")}>Reopen</button>}
      </div>

      {mode === "reschedule" && (
        <div className="mt-3 rounded-xl border border-sand-200 bg-sand-50 p-3" role="group" aria-label="Suggest another time">
          <p className="text-sm font-semibold text-ink-900">Suggest another time</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor={`rs-date-${i.id}`}>Date</label>
              <input id={`rs-date-${i.id}`} type="date" min={todayISO()} className="field" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={err ? true : undefined} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor={`rs-time-${i.id}`}>Time of day</label>
              <select id={`rs-time-${i.id}`} className="field" value={time} onChange={(e) => setTime(e.target.value)}>
                <option value="">No preference</option>
                {TIMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <label className="mt-2 mb-1 block text-xs font-medium text-ink-500" htmlFor={`rs-note-${i.id}`}>Note (optional)</label>
          <input id={`rs-note-${i.id}`} className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The tenant is still moving out that day" />
          {err && <p className="mt-1 text-sm font-medium text-red-700" role="alert">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button className="btn-primary btn-sm" onClick={submitReschedule}>Send suggestion</button>
            <button className="btn-ghost btn-sm" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "decline" && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alertdialog" aria-label="Decline viewing">
          <label className="mb-1 block text-xs font-medium" htmlFor={`dc-note-${i.id}`}>Reason (optional — shown to {i.name.split(" ")[0]})</label>
          <input id={`dc-note-${i.id}`} className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The home has just been let" />
          <div className="mt-2 flex gap-2">
            <button className="btn-danger btn-sm" onClick={() => { updateViewing(i.id, "declined", note, "lister"); setMode(null); }}>Decline request</button>
            <button className="btn-secondary btn-sm" onClick={() => setMode(null)}>Keep it</button>
          </div>
        </div>
      )}
    </li>
  );
}

export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "warn" }) {
  return (
    <div className="card p-3 sm:p-4">
      <div className={`text-2xl font-bold ${tone === "warn" ? "text-orange-700" : ""}`}>{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}
