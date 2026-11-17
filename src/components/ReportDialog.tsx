"use client";

import { useState } from "react";
import { REPORT_REASONS, REPORT_STATUS_LABEL } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Listing, ReportReason } from "@/lib/types";
import { CheckIcon } from "./Icons";
import { MoneyField } from "./MoneyField";
import { useDialog } from "./useDialog";

const MAX = 500;

/**
 * Lets a visitor report a listing. The report is saved in this browser's demo storage and
 * appears in the demo moderation queue — nothing is submitted anywhere else.
 */
export function ReportDialog({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { data, currentUser, addReport } = useStore();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [duplicateOf, setDuplicateOf] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<{ reason?: string; details?: string }>({});
  const [sentId, setSentId] = useState<string | null>(null);
  const ref = useDialog<HTMLDivElement>(onClose);

  const reporterName = currentUser?.name ?? "Guest visitor";
  const previous = data.reports.find((r) => r.listingId === listing.id && r.status !== "resolved" && (currentUser ? r.reporterUserId === currentUser.id : !r.reporterUserId));
  const others = data.listings.filter((l) => l.id !== listing.id && l.purpose === listing.purpose);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!reason) next.reason = "Choose what's wrong with this listing.";
    if (reason === "scam" && details.trim().length < 15) next.details = "Tell us briefly what made you suspicious (at least 15 characters).";
    if (details.length > MAX) next.details = `Keep it under ${MAX} characters.`;
    setErrors(next);
    if (next.reason) return document.querySelector<HTMLInputElement>('input[name="report-reason"]')?.focus();
    if (next.details) return document.getElementById("rep-details")?.focus();
    const id = addReport({
      listingId: listing.id,
      reason: reason as ReportReason,
      details: details.trim(),
      duplicateOfId: reason === "duplicate" && duplicateOf ? duplicateOf : undefined,
      suggestedPrice: reason === "price" && Number(price) > 0 ? Number(price) : undefined,
      reporterUserId: currentUser?.id,
      reporterName,
    });
    setSentId(id);
  }

  const errText = (m?: string, id?: string) =>
    m ? (
      <p id={id} className="mt-1 text-sm font-medium text-red-700">
        <span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>
        {m}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rep-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl sm:p-6">
        {sentId ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700"><CheckIcon size={24} /></div>
            <h2 id="rep-title" className="section-title mt-3">Thanks — report received</h2>
            <p className="mt-1 text-sm text-ink-500">
              Reference <b className="text-ink-900">{sentId.toUpperCase()}</b>. IleLagos staff review reports in the moderation queue and mark them Open, Under review or Resolved.
            </p>
            <p className="mt-2 text-xs text-ink-500">During the beta, the report is saved in this browser. Nothing is sent to the lister or any authority.</p>
            <button className="btn-primary mt-5 w-full" onClick={onClose} data-autofocus>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="rep-title" className="section-title">Report this listing</h2>
                <p className="text-sm text-ink-500">{listing.title}</p>
              </div>
              <button type="button" className="btn-ghost btn-icon !min-h-9 !min-w-9" onClick={onClose} aria-label="Close">✕</button>
            </div>

            {previous && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                You already reported this listing — status: <b>{REPORT_STATUS_LABEL[previous.status]}</b>. You can still add another report if something else is wrong.
              </p>
            )}

            <fieldset aria-describedby={errors.reason ? "rep-reason-error" : undefined}>
              <legend className="label">What&apos;s wrong?</legend>
              <div className="space-y-2">
                {REPORT_REASONS.map((r, idx) => (
                  <label
                    key={r.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${reason === r.value ? "border-brand-600 bg-brand-50" : "border-sand-200 hover:border-ink-300"}`}
                  >
                    <input type="radio" name="report-reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" {...(idx === 0 ? { "data-autofocus": true } : {})} />
                    <span>
                      <span className="block font-semibold text-ink-900">{r.label}</span>
                      <span className="block text-xs text-ink-500">{r.help}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errText(errors.reason, "rep-reason-error")}
            </fieldset>

            {reason === "duplicate" && (
              <div>
                <label className="label" htmlFor="rep-dup">Which listing is the same home? <span className="font-normal text-ink-500">(optional)</span></label>
                <select id="rep-dup" className="field" value={duplicateOf} onChange={(e) => setDuplicateOf(e.target.value)}>
                  <option value="">I&apos;m not sure</option>
                  {others.map((l) => <option key={l.id} value={l.id}>{l.title} — {l.area}</option>)}
                </select>
              </div>
            )}

            {reason === "price" && (
              <div>
                <label className="label" htmlFor="rep-price">What price were you told? <span className="font-normal text-ink-500">(optional)</span></label>
                <MoneyField id="rep-price" value={price} onChange={setPrice} placeholder="Leave blank if you don't know" />
              </div>
            )}

            {reason && (
              <div>
                <label className="label" htmlFor="rep-details">
                  {reason === "scam" ? "What made you suspicious?" : "Anything else we should know?"}{" "}
                  <span className="font-normal text-ink-500">{reason === "scam" ? "(required)" : "(optional)"}</span>
                </label>
                <textarea
                  id="rep-details"
                  rows={3}
                  className={`field ${errors.details ? "!border-red-500 ring-2 ring-red-100" : ""}`}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  aria-invalid={errors.details ? true : undefined}
                  aria-describedby={["rep-details-hint", errors.details && "rep-details-error"].filter(Boolean).join(" ")}
                  placeholder={reason === "scam" ? "e.g. They asked me to pay an inspection fee before showing the home" : undefined}
                />
                <p id="rep-details-hint" className={`mt-1 text-right text-xs ${details.length > MAX ? "text-red-700" : "text-ink-500"}`}>
                  {details.length}/{MAX} · don&apos;t include bank details, ID numbers or phone numbers
                </p>
                {errText(errors.details, "rep-details-error")}
              </div>
            )}

            <p className="rounded-xl bg-sand-100 p-3 text-xs text-ink-700">
              Reporting as <b>{reporterName}</b>. We don&apos;t ask for your phone, email or ID. If you&apos;ve lost money, contact your bank and the police directly — IleLagos can&apos;t do that for you.
            </p>
            <button type="submit" className="btn-primary w-full">Send report</button>
          </form>
        )}
      </div>
    </div>
  );
}
