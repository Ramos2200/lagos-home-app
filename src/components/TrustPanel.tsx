import Link from "next/link";
import { CHECK_WORDING, type CheckKind } from "@/lib/constants";
import { formatDate, relativeDays } from "@/lib/format";
import type { Listing, TrustCheck, User } from "@/lib/types";
import { Badge, CheckBadge } from "./Badges";
import { CheckIcon, InfoIcon, PlugIcon, ShieldIcon } from "./Icons";

interface Row {
  label: string;
  help: string;
  check?: TrustCheck;
  kind?: CheckKind;
}

export function CheckRow({ label, help, check, kind }: Row) {
  const c = check ?? { state: "not_started" as const };
  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        <div className="text-xs text-ink-500">{help}</div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-0.5 sm:max-w-[55%] sm:items-end sm:text-right">
        <CheckBadge state={c.state} kind={kind} />
        <span className="text-xs text-ink-500">{c.date ? `Recorded ${formatDate(c.date)}` : "No date recorded"}</span>
      </div>
    </li>
  );
}

/** The five listing checks, each with exact wording. Shared by the full panel and the summary. */
function listingRows(listing: Listing, lister?: User, agent?: User): Row[] {
  const person = agent ?? lister;
  const rows: Row[] = [
    {
      label: agent ? "Agent's identity" : "Lister's identity",
      help: "Whether the person listing this home has submitted ID for review.",
      check: person?.checks.identity,
      kind: "identity",
    },
  ];
  if (agent) {
    rows.push({
      label: "Agent licence",
      help: "Whether the agent's registration or licence has been submitted for review.",
      check: agent.checks.agentLicensing,
      kind: "agentLicensing",
    });
  }
  rows.push(
    listing.listedBy === "agent"
      ? {
          label: "Owner authorization",
          help: "Whether the agent has submitted the owner's permission to represent this home.",
          check: listing.checks.ownerAuthorization,
          kind: "ownerAuthorization",
        }
      : {
          label: "Ownership",
          help: "What the lister has told us about owning this home.",
          check: listing.checks.ownerAuthorization,
          kind: "ownerDeclaration",
        },
    {
      label: "Property documents",
      help: "Whether documents were submitted for review. A review here is never a legal title check.",
      check: listing.checks.documentReview,
      kind: "documentReview",
    },
    {
      label: "Availability",
      help: "The last date the lister told us this home is still available.",
      check: listing.checks.availabilityConfirmation,
      kind: "availability",
    },
  );
  return rows;
}

function LegalTitleRow() {
  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-900">Legal title</div>
        <div className="text-xs text-ink-500">IleLagos does not check land titles (C of O, Governor&apos;s consent, deeds). Use a property lawyer.</div>
      </div>
      <div className="shrink-0 sm:text-right">
        <Badge tone="red">Not checked by IleLagos</Badge>
      </div>
    </li>
  );
}

/**
 * Short, exact summary for the top of a listing: what has been submitted or confirmed,
 * and a fixed line that the legal title is not checked.
 */
export function ChecksSummary({ listing, lister, agent }: { listing: Listing; lister?: User; agent?: User }) {
  const rows = listingRows(listing, lister, agent);
  // Name whose ID it is, so the short summary stays exact.
  const say = (r: Row, state: TrustCheck["state"]) =>
    r.kind === "identity" ? CHECK_WORDING.identity[state].replace(/^ID/, agent ? "Agent's ID" : "Lister's ID") : CHECK_WORDING[r.kind!][state];
  const done = rows.filter((r) => r.check && r.check.state !== "not_started");
  const missing = rows.filter((r) => !r.check || r.check.state === "not_started");
  return (
    <section aria-labelledby="glance-title" className="rounded-2xl border border-sand-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="glance-title" className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <ShieldIcon size={16} className="text-brand-600" /> What has been checked
        </h2>
        <a href="#checks" className="link text-xs">All checks</a>
      </div>
      <ul className="mt-2.5 space-y-1.5 text-[13px]">
        {done.map((r) => (
          <li key={r.label} className="flex items-start gap-2 text-ink-700">
            <CheckIcon size={15} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              {r.kind === "availability"
                ? `Lister confirmed it's available — ${relativeDays(r.check!.date ?? listing.lastConfirmed)}`
                : say(r, r.check!.state)}
            </span>
          </li>
        ))}
        {missing.map((r) => (
          <li key={r.label} className="flex items-start gap-2 text-ink-500">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden />
            <span>{say(r, "not_started")}</span>
          </li>
        ))}
        <li className="flex items-start gap-2 font-medium text-red-800">
          <InfoIcon size={15} className="mt-0.5 shrink-0" />
          <span>Legal title not checked — use a property lawyer before paying</span>
        </li>
      </ul>
      <p className="mt-2.5 text-[11px] text-ink-500">During the beta, none of these checks are actually carried out.</p>
    </section>
  );
}

export function TrustPanel({
  listing,
  lister,
  agent,
  collapsible = false,
  bare = false,
}: {
  listing: Listing;
  lister?: User;
  agent?: User;
  collapsible?: boolean;
  bare?: boolean;
}) {
  const rows = listingRows(listing, lister, agent);
  const recorded = rows.filter((r) => r.check && r.check.state !== "not_started").length;
  const body = (
    <>
      <ul className="mt-1 divide-y divide-sand-200">
        {rows.map((r) => (
          <CheckRow key={r.label} {...r} />
        ))}
        <LegalTitleRow />
      </ul>
      <div className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        <InfoIcon className="mt-0.5 shrink-0" size={14} />
        <p>
          During the beta, none of these checks are really carried out, and no property title has been legally verified.
          Always do your own legal checks and never pay before viewing.{" "}
          <Link href="/trust" className="font-semibold underline">How checks work</Link>
        </p>
      </div>
    </>
  );

  if (collapsible) {
    return (
      <details id="checks" className={`group scroll-mt-20 ${bare ? "p-5 sm:p-6" : "card p-5 sm:p-6"}`}>
        <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <ShieldIcon className="shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1">
            <span className="section-title block">What each check means</span>
            <span className="block text-sm text-ink-500">
              {recorded} of {rows.length} recorded · legal title not checked · beta
            </span>
          </span>
          <span className="text-sm font-semibold text-brand-700 group-open:hidden">Show</span>
          <span className="hidden text-sm font-semibold text-brand-700 group-open:inline">Hide</span>
        </summary>
        {body}
      </details>
    );
  }

  return (
    <section id="checks" className="card scroll-mt-20 p-4 sm:p-5" aria-labelledby="checks-title">
      <div className="flex items-center gap-2">
        <ShieldIcon className="text-brand-600" />
        <h2 id="checks-title" className="section-title">Checks on this listing</h2>
      </div>
      {body}
    </section>
  );
}

const FUTURE = [
  { title: "Identity verification", body: "Connect an ID-check provider. Not active — no ID documents are collected yet." },
  { title: "Agent registry lookup", body: "Look up an agent's registration with the relevant Lagos regulator. Not connected." },
  { title: "Land registry / title search", body: "Order a professional title search. Not connected; nothing here confirms title." },
  { title: "Payments & escrow", body: "Hold deposits safely until move-in. Not active — don't send money through IleLagos." },
];

export function FutureIntegrations({ compact = false, className = "border-t border-sand-200 pt-7" }: { compact?: boolean; className?: string }) {
  return (
    <section className={compact ? "" : className} aria-label="Future integrations">
      {!compact && (
        <>
          <h2 className="section-title">Coming later</h2>
          <p className="muted mt-0.5">Placeholders for integrations a live version would need. None are active.</p>
        </>
      )}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {FUTURE.map((f) => (
          <div key={f.title} className="rounded-xl border border-dashed border-sand-300 bg-sand-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <PlugIcon size={16} className="text-ink-500" />
              {f.title}
              <span className="ml-auto rounded bg-sand-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-500 uppercase">
                Placeholder
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-500">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
