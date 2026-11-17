"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, StatusBadge } from "@/components/Badges";
import { ListingCover } from "@/components/ListingCover";
import { Avatar } from "@/components/SiteHeader";
import { EmptyState, MessagePage, PageHeader, StatStrip } from "@/components/ui";
import { REPORT_REASONS, REPORT_REASON_LABEL, REPORT_STATUS_LABEL } from "@/lib/constants";
import { formatDate, localDateOf, naira, relativeDays } from "@/lib/format";
import { effectiveStatus, isPubliclySearchable } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { ListingReport, ReportReason, ReportStatus, User } from "@/lib/types";

const STATUS_TONE: Record<ReportStatus, "red" | "amber" | "green"> = { open: "red", under_review: "amber", resolved: "green" };

export default function ModerationPage() {
  const { ready, currentUser, data, createStaffUser, signIn } = useStore();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-40 animate-pulse" /></div>;

  if (!currentUser?.isStaff) {
    const staff = data.users.filter((u) => u.isStaff);
    return (
      <MessagePage
        title="Staff only"
        body={
          <>
            The report queue is for IleLagos staff. During the beta, staff use a test account in this browser — there&apos;s no separate staff login yet.
            {staff.length === 0 && " No staff test account exists in this browser yet."}
          </>
        }
        actions={
          staff.length > 0 ? (
            staff.map((u) => (
              <button key={u.id} className="btn-primary" onClick={() => signIn(u.id)}>
                Continue as {u.name} (staff)
              </button>
            ))
          ) : (
            <button className="btn-primary" onClick={() => signIn(createStaffUser())}>
              Create a staff test account
            </button>
          )
        }
      />
    );
  }
  return <Queue staff={currentUser} />;
}

type Filter = ReportStatus | "all";

function Queue({ staff }: { staff: User }) {
  const { data } = useStore();
  const [filter, setFilter] = useState<Filter>("open");
  const [reason, setReason] = useState<ReportReason | "">("");

  const reports = [...data.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (s: Filter) => reports.filter((r) => s === "all" || r.status === s).length;
  const shown = reports.filter((r) => (filter === "all" || r.status === filter) && (!reason || r.reason === reason));
  const listingsWithOpen = new Set(reports.filter((r) => r.status !== "resolved").map((r) => r.listingId)).size;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow={`Moderation · signed in as ${staff.name}`}
        title="Report queue"
        description="Reports from visitors about scams, duplicates, wrong prices and homes that are no longer available. Stored in this browser only — nothing is sent to the lister or any authority."
      />

      <div className="mt-6">
        <StatStrip
          stats={[
            { label: "Open", value: count("open"), warn: count("open") > 0 },
            { label: "Under review", value: count("under_review") },
            { label: "Resolved", value: count("resolved") },
            { label: "Listings with open reports", value: listingsWithOpen },
          ]}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by status">
          {(["open", "under_review", "resolved", "all"] as Filter[]).map((s) => (
            <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)} className={`chip shrink-0 ${filter === s ? "chip-on" : ""}`}>
              {s === "all" ? "All" : REPORT_STATUS_LABEL[s]} <span className="text-ink-500">({count(s)})</span>
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-700">
          Reason
          <select className="field !min-h-9 !w-auto !py-1 text-sm" value={reason} onChange={(e) => setReason(e.target.value as ReportReason | "")}>
            <option value="">All reasons</option>
            {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5">
        {reports.length === 0 ? (
          <EmptyState
            title="No reports yet"
            body="When a visitor uses “Report this listing” on a property page, the report lands here for review."
            action={<Link href="/search?mode=rent" className="btn-secondary btn-sm">Browse listings</Link>}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            title={filter === "open" ? "No open reports" : "Nothing matches these filters"}
            body={filter === "open" ? "Everything has been picked up. Check Under review for reports still in progress." : undefined}
            action={<button className="btn-secondary btn-sm" onClick={() => { setFilter("all"); setReason(""); }}>Show all reports</button>}
          />
        ) : (
          <ul className="space-y-4">
            {shown.map((r) => <ReportCard key={r.id} report={r} staff={staff} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report: r, staff }: { report: ListingReport; staff: User }) {
  const { data, updateReport, setListingStatus } = useStore();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmPause, setConfirmPause] = useState(false);
  const l = data.listings.find((x) => x.id === r.listingId);
  const lister = l ? data.users.find((u) => u.id === (l.agentId ?? l.ownerId)) : undefined;
  const dup = r.duplicateOfId ? data.listings.find((x) => x.id === r.duplicateOfId) : undefined;
  const sameListing = data.reports.filter((x) => x.listingId === r.listingId && x.id !== r.id && x.status !== "resolved").length;
  const noteId = `note-${r.id}`;

  const change = (status: ReportStatus | undefined) => {
    if (status === "resolved" && !note.trim()) {
      setError("Add a short note explaining the outcome before resolving.");
      document.getElementById(noteId)?.focus();
      return;
    }
    if (!status && !note.trim()) {
      setError("Write a note first.");
      document.getElementById(noteId)?.focus();
      return;
    }
    updateReport(r.id, status, note, staff.name);
    setNote("");
    setError("");
  };

  return (
    <li className={`card overflow-hidden ${r.status === "open" ? "border-l-4 !border-l-red-600" : ""}`}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={r.reason === "scam" ? "red" : "slate"}>{REPORT_REASON_LABEL[r.reason]}</Badge>
          <Badge tone={STATUS_TONE[r.status]} dot>{REPORT_STATUS_LABEL[r.status]}</Badge>
          <span className="ml-auto text-xs text-ink-500">
            {r.id.toUpperCase()} · reported {relativeDays(localDateOf(r.createdAt))} by {r.reporterName}
          </span>
        </div>

        {l ? (
          <div className="mt-3 flex gap-3">
            <ListingCover listing={l} className="h-16 w-20 shrink-0 rounded-lg" />
            <div className="min-w-0 text-sm">
              <Link href={`/listings/${l.id}`} className="font-semibold text-ink-900 hover:underline">{l.title}</Link>
              <p className="text-xs text-ink-500">
                {l.area} · {naira(l.price)}
                {l.purpose === "rent" && l.rentFrequency ? (l.rentFrequency === "monthly" ? " per month" : l.rentFrequency === "quarterly" ? " per quarter" : " per year") : ""} · listed by{" "}
                {lister?.name ?? "unknown"} {l.listedBy === "agent" ? "(agent)" : "(owner)"}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <StatusBadge status={effectiveStatus(l)} purpose={l.purpose} className="!px-1.5 !py-0 !text-[11px]" />
                <span className="text-ink-500">{isPubliclySearchable(l) ? "Shown in search" : "Hidden from search"}</span>
                {sameListing > 0 && <span className="font-medium text-red-800">{sameListing} other open {sameListing === 1 ? "report" : "reports"} on this listing</span>}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-500">This listing no longer exists.</p>
        )}

        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-ink-500">Reporter&apos;s details</dt>
            <dd className="text-ink-900">{r.details ? `“${r.details}”` : <span className="text-ink-500">No details given</span>}</dd>
          </div>
          {r.reason === "duplicate" && (
            <div>
              <dt className="text-xs text-ink-500">Possible duplicate of</dt>
              <dd>{dup ? <Link href={`/listings/${dup.id}`} className="link">{dup.title} — {dup.area}</Link> : <span className="text-ink-500">Not specified</span>}</dd>
            </div>
          )}
          {r.reason === "price" && (
            <div>
              <dt className="text-xs text-ink-500">Price the reporter was told</dt>
              <dd>{r.suggestedPrice ? <>{naira(r.suggestedPrice)} <span className="text-ink-500">(listing shows {l ? naira(l.price) : "—"})</span></> : <span className="text-ink-500">Not given</span>}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Staff actions */}
      <div className="space-y-3 border-t border-sand-200 bg-sand-50 p-4 sm:px-5">
        <div>
          <label htmlFor={noteId} className="mb-1 block text-xs font-medium text-ink-700">
            Staff note {r.status !== "resolved" && <span className="font-normal text-ink-500">(required to resolve)</span>}
          </label>
          <textarea
            id={noteId}
            rows={2}
            className={`field ${error ? "!border-red-500 ring-2 ring-red-100" : ""}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Asked the lister to update the price; listing paused while we check."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${noteId}-error` : undefined}
          />
          {error && <p id={`${noteId}-error`} className="mt-1 text-sm font-medium text-red-700" role="alert">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === "open" && <button className="btn-primary btn-sm" onClick={() => change("under_review")}>Mark under review</button>}
          {r.status !== "resolved" && <button className={`${r.status === "under_review" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => change("resolved")}>Mark resolved</button>}
          {r.status !== "open" && <button className="btn-secondary btn-sm" onClick={() => change("open")}>Reopen</button>}
          <button className="btn-ghost btn-sm" onClick={() => change(undefined)}>Add note only</button>
          {l && r.status !== "resolved" && isPubliclySearchable(l) && !confirmPause && (
            <button className="btn-ghost btn-sm ml-auto text-red-700" onClick={() => setConfirmPause(true)}>Pause listing</button>
          )}
        </div>
        {confirmPause && l && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alertdialog" aria-label="Pause listing">
            Pause “{l.title}”? It will be hidden from search until the lister resumes it. (During the beta, no message is sent to the lister.)
            <div className="mt-2 flex gap-2">
              <button
                className="btn-danger btn-sm"
                autoFocus
                onClick={() => {
                  setListingStatus(l.id, "paused");
                  updateReport(r.id, undefined, "Listing paused by staff while the report is reviewed.", staff.name);
                  setConfirmPause(false);
                }}
              >
                Yes, pause it
              </button>
              <button className="btn-secondary btn-sm" onClick={() => setConfirmPause(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <details className="border-t border-sand-200 px-4 py-3 sm:px-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink-700">History ({r.history.length})</summary>
        <ol className="mt-2 space-y-2">
          {r.history.map((h, idx) => (
            <li key={idx} className="flex gap-2 text-xs">
              <Avatar name={h.by} size={22} />
              <span className="min-w-0">
                <b className="text-ink-900">{h.by}</b>
                <span className="text-ink-500"> · {formatDate(localDateOf(h.at))} {new Date(h.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                {h.status && <span className="text-ink-700"> · set to <b>{REPORT_STATUS_LABEL[h.status]}</b></span>}
                {h.note && <span className="block text-ink-700">“{h.note}”</span>}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}
