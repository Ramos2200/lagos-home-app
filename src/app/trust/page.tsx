import Link from "next/link";
import { Badge, CheckBadge } from "@/components/Badges";
import { FutureIntegrations } from "@/components/TrustPanel";

export const metadata = { title: "How checks & statuses work — IleLagos" };

const CHECKS = [
  ["Identity check", "Applies to the person listing (owner or agent). Shows whether ID was submitted and when."],
  ["Agent licensing", "Applies to agents only. Shows whether a licence/registration was submitted for review and when."],
  ["Owner authorization", "Per listing. For agent listings: has the agent submitted the owner's authorization? For owner listings: the owner's own declaration."],
  ["Document review", "Per listing. Whether property documents were submitted for review. It is never a legal confirmation of title."],
  ["Availability confirmation", "Per listing. The date the lister last confirmed the home is still available."],
];

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <p className="eyebrow">Trust & transparency</p>
        <h1 className="page-title mt-1.5">How checks & statuses work</h1>
        <p className="mt-2 text-ink-700">
          We keep each check separate, with its own label and date, instead of one “verified” badge that can mean
          anything.
        </p>
      </div>

      <section className="border-t border-sand-200 pt-7">
        <h2 className="section-title">Five separate checks</h2>
        <dl className="mt-3 space-y-3">
          {CHECKS.map(([t, d]) => (
            <div key={t}>
              <dt className="font-semibold">{t}</dt>
              <dd className="text-sm text-ink-700">{d}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-5 text-sm font-semibold">Possible states</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <CheckBadge state="not_started" />
          <CheckBadge state="submitted" />
          <CheckBadge state="self_declared" />
          <CheckBadge state="demo_reviewed" />
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          IleLagos is in beta. The homes shown are samples for testing, no checks are really carried out yet, nobody is
          verified, and no property title has been legally verified. Always use a lawyer for title searches and never pay before viewing.
        </p>
      </section>

      <section className="border-t border-sand-200 pt-7">
        <h2 className="section-title">Listing statuses</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li><Badge tone="green" dot>Available</Badge> — the lister says it&apos;s available and confirmed within 30 days.</li>
          <li><Badge tone="amber" dot>Under offer</Badge> — an offer is being considered; still visible in search.</li>
          <li><Badge tone="orange" dot>Availability unconfirmed</Badge> — not reconfirmed in 30+ days, or marked unconfirmed by the lister.</li>
          <li><Badge tone="slate" dot>Rented</Badge> / <Badge tone="slate" dot>Sold</Badge> — removed from search results.</li>
          <li><Badge tone="slate" dot>Paused</Badge> — hidden from search by the lister.</li>
        </ul>
        <p className="mt-4 text-sm text-ink-700">
          <b>Occupancy is separate.</b> A home can be <Badge tone="blue">Owner-occupied</Badge> or have a{" "}
          <Badge tone="blue">Tenant in place</Badge> and still be for sale.
        </p>
      </section>

      <section className="border-t border-sand-200 pt-7">
        <h2 className="section-title">Asking price history</h2>
        <p className="mt-1 text-sm text-ink-700">
          When a lister changes the asking price, we keep a dated record. These are asking prices only — not confirmed
          sale prices or rent actually paid.
        </p>
      </section>

      <FutureIntegrations />

      <Link href="/search?mode=rent" className="btn-primary">Start searching</Link>
    </div>
  );
}
