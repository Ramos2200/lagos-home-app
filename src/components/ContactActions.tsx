"use client";

import { useState } from "react";
import { useDialog } from "./useDialog";
import { FREQUENCY_SHORT, naira } from "@/lib/format";
import { locationLine } from "@/lib/listing-utils";
import type { Listing } from "@/lib/types";

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

export function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  );
}

export function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function whatsappMessage(l: Listing): string {
  const price = `${naira(l.price)}${l.purpose === "rent" && l.rentFrequency ? FREQUENCY_SHORT[l.rentFrequency] : ""}`;
  return `Hello, I saw your listing on IleLagos: "${l.title}" in ${locationLine(l)} (${price}). Is it still available? I'd like to arrange a viewing.`;
}

type Kind = "whatsapp" | "call";

/** Placeholder sheets: the prototype never opens WhatsApp, dials a number or reveals contact details. */
export function ContactPlaceholder({ kind, listing, name, onClose }: { kind: Kind; listing: Listing; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const msg = whatsappMessage(listing);
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="cp-title" className="flex items-center gap-2 text-lg font-bold">
            {kind === "whatsapp" ? <span className="text-[#1f9d55]"><WhatsAppIcon size={22} /></span> : <PhoneIcon size={20} />}
            {kind === "whatsapp" ? `WhatsApp ${name.split(" ")[0]}` : `Call ${name.split(" ")[0]}`}
          </h2>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
          Placeholder — this demo doesn&apos;t open WhatsApp, place calls or show real phone numbers.
        </p>
        {kind === "whatsapp" ? (
          <>
            <p className="mt-3 text-sm text-ink-700">In the live app this opens WhatsApp with this message ready to send:</p>
            <blockquote className="mt-2 rounded-xl bg-[#e7f6ec] p-3 text-sm text-ink-900">{msg}</blockquote>
            <button
              className="btn-secondary mt-4 w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(msg);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Message copied" : "Copy message"}
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-700">
            In the live app, tapping Call dials the lister directly. Best times to call are usually weekdays 9am–6pm.
          </p>
        )}
        <p className="mt-3 text-xs text-ink-500">Never pay a deposit or fee before viewing the home in person.</p>
      </div>
    </div>
  );
}

/** Uses the phone's share sheet when available, otherwise copies the link. */
export function ShareButton({ listing, className = "" }: { listing: Listing; className?: string }) {
  const [done, setDone] = useState("");
  async function share() {
    // Always the listing page itself, so sharing from Saved homes (or a #section link) sends the right page.
    const url = `${window.location.origin}/listings/${listing.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: `${listing.title} — ${locationLine(listing)}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone("Link copied");
    } catch {
      return; // user cancelled the share sheet
    }
    setTimeout(() => setDone(""), 2000);
  }
  return (
    <button type="button" onClick={share} className={className} aria-label={done ? `${done}: ${listing.title}` : `Share ${listing.title}`}>
      <ShareIcon size={16} /> {done || "Share"}
    </button>
  );
}
