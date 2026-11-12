import { STALE_AFTER_DAYS } from "@/lib/constants";
import { daysSince, formatDate, relativeDays } from "@/lib/format";
import type { CheckState, Listing, User } from "@/lib/types";
import { CheckIcon, InfoIcon, ShieldIcon } from "./Icons";

type Tone = "done" | "demo" | "pending" | "none" | "warn" | "na";

export interface CheckStatus {
  key: "identity" | "licence" | "authorization" | "availability";
  label: string;
  status: string;
  tone: Tone;
  /** "Checked 8 Sept 2026", "No date recorded", etc. */
  dateText: string;
  help: string;
}

/** Wording for a check that IleLagos staff would review. "Checked" is only ever a labelled demo review. */
function reviewWording(state: CheckState | undefined, noun: string, verb = "checked"): { status: string; tone: Tone } {
  switch (state) {
    case "demo_reviewed":
      return { status: `${cap(verb)} — demo review only`, tone: "demo" };
    case "submitted":
      return { status: `${cap(noun)} submitted · not yet ${verb}`, tone: "pending" };
    case "self_declared":
      return { status: `Self-declared · not ${verb}`, tone: "none" };
    default:
      return { status: `Not ${verb}`, tone: "none" };
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dated = (d?: string, word = "Recorded") => (d ? `${word} ${formatDate(d)}` : "No date recorded");

/**
 * The four separate listing checks, in plain words, each with its own date.
 * Nothing here says a property's legal title is verified.
 */
export function listingCheckStatuses(listing: Listing, lister?: User, agent?: User): CheckStatus[] {
  const person = agent ?? lister;
  const id = person?.checks.identity;
  const idw = reviewWording(id?.state, "ID");
  const out: CheckStatus[] = [
    {
      key: "identity",
      label: agent ? "Agent's identity checked" : "Lister's identity checked",
      ...idw,
      dateText: dated(id?.date, id?.state === "demo_reviewed" ? "Checked" : id?.state === "submitted" ? "Submitted" : "Recorded"),
      help: `Whether ${agent ? "the agent" : "the person listing"} has had their ID checked.`,
    },
  ];

  if (agent) {
    const lic = agent.checks.agentLicensing;
    out.push({
      key: "licence",
      label: "Agent licence checked",
      ...reviewWording(lic?.state, "licence"),
      dateText: dated(lic?.date, lic?.state === "demo_reviewed" ? "Checked" : lic?.state === "submitted" ? "Submitted" : "Recorded"),
      help: "Whether the agent's registration or licence has been checked.",
    });
  } else {
    out.push({
      key: "licence",
      label: "Agent licence checked",
      status: "Not applicable — listed directly by the owner",
      tone: "na",
      dateText: "—",
      help: "No agent is involved in this listing.",
    });
  }

  const auth = listing.checks.ownerAuthorization;
  if (listing.listedBy === "agent") {
    const w = reviewWording(auth.state, "authorization", "reviewed");
    out.push({
      key: "authorization",
      label: "Owner authorization reviewed",
      ...w,
      dateText: dated(auth.date, auth.state === "demo_reviewed" ? "Reviewed" : auth.state === "submitted" ? "Submitted" : "Recorded"),
      help: "Whether the owner's permission for this agent to represent the home has been reviewed.",
    });
  } else {
    out.push({
      key: "authorization",
      label: "Owner authorization reviewed",
      status: auth.state === "demo_reviewed" ? "Reviewed — demo review only" : "Not reviewed — the lister says they own this home",
      tone: auth.state === "demo_reviewed" ? "demo" : "none",
      dateText: dated(auth.date, auth.state === "self_declared" ? "Declared" : "Recorded"),
      help: "The owner is listing the home themselves.",
    });
  }

  const stale = daysSince(listing.lastConfirmed) > STALE_AFTER_DAYS || listing.status === "unconfirmed";
  out.push({
    key: "availability",
    label: "Availability confirmed",
    status: stale ? `Not confirmed in the last ${STALE_AFTER_DAYS} days` : `Confirmed by the lister ${relativeDays(listing.lastConfirmed)}`,
    tone: stale ? "warn" : "done",
    dateText: `Last confirmed ${formatDate(listing.lastConfirmed)}`,
    help: "The lister's own confirmation that the home is still available. IleLagos doesn't visit homes.",
  });
  return out;
}

const TONE: Record<Tone, { ring: string; icon: string; text: string }> = {
  done: { ring: "ring-brand-200 bg-brand-50", icon: "bg-brand-600 text-white", text: "text-brand-800" },
  demo: { ring: "ring-sky-200 bg-sky-50", icon: "bg-sky-600 text-white", text: "text-sky-900" },
  pending: { ring: "ring-amber-200 bg-amber-50", icon: "bg-amber-500 text-white", text: "text-amber-900" },
  warn: { ring: "ring-orange-200 bg-orange-50", icon: "bg-orange-500 text-white", text: "text-orange-900" },
  none: { ring: "ring-sand-200 bg-white", icon: "bg-sand-200 text-ink-500", text: "text-ink-700" },
  na: { ring: "ring-sand-200 bg-sand-50", icon: "bg-sand-200 text-ink-500", text: "text-ink-500" },
};

function ToneIcon({ tone }: { tone: Tone }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${TONE[tone].icon}`} aria-hidden>
      {tone === "done" || tone === "demo" ? <CheckIcon size={13} /> : tone === "pending" ? "…" : tone === "warn" ? "!" : "–"}
    </span>
  );
}

/** Four separate check tiles plus the fixed legal-title notice. Used near the top of each listing. */
export function ListingChecksGrid({ listing, lister, agent }: { listing: Listing; lister?: User; agent?: User }) {
  const items = listingCheckStatuses(listing, lister, agent);
  return (
    <section aria-labelledby="checks-grid-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="checks-grid-title" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <ShieldIcon size={16} className="text-brand-600" /> Checks on this listing
        </h2>
        <a href="#checks" className="link text-xs">What these mean</a>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.key} className={`flex gap-3 rounded-xl p-3 ring-1 ${TONE[c.tone].ring}`}>
            <ToneIcon tone={c.tone} />
            <div className="min-w-0 text-sm">
              <p className="text-xs font-medium text-ink-500">{c.label}</p>
              <p className={`font-semibold ${TONE[c.tone].text}`}>{c.status}</p>
              <p className="text-xs text-ink-500">{c.dateText}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-900 ring-1 ring-red-200">
        <InfoIcon size={14} className="mt-0.5 shrink-0" />
        <span>
          <b>Legal title: not verified.</b> IleLagos never checks land titles (C of O, Governor&apos;s consent, deeds). Use a property lawyer before paying anything. Demo data — no check above was actually carried out.
        </span>
      </p>
    </section>
  );
}

/** Compact version for dashboard rows: one short line per check. */
export function ListingCheckList({ listing, lister, agent }: { listing: Listing; lister?: User; agent?: User }) {
  const items = listingCheckStatuses(listing, lister, agent).filter((c) => c.tone !== "na");
  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Checks">
      {items.map((c) => (
        <li key={c.key} className="flex items-start gap-1.5">
          <span className={`mt-[3px] h-2 w-2 shrink-0 rounded-full ${c.tone === "done" ? "bg-brand-500" : c.tone === "demo" ? "bg-sky-500" : c.tone === "pending" ? "bg-amber-500" : c.tone === "warn" ? "bg-orange-500" : "bg-ink-300"}`} aria-hidden />
          <span>
            <span className="text-ink-500">{c.label}: </span>
            <span className="font-medium text-ink-900">{c.status}</span>
            {c.dateText !== "No date recorded" && c.dateText !== "—" && <span className="text-ink-500"> · {c.dateText.replace(/^Last confirmed /, "")}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
