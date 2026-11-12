import { Badge } from "./Badges";

/** Collapsible plain-language guide to listing statuses, for owner and agent dashboards. */
export function StatusGuide() {
  const rows: [React.ReactNode, string][] = [
    [<Badge key="a" tone="green" dot>Available</Badge>, "Shown in search. Confirm it's still available at least every 30 days."],
    [<Badge key="u" tone="orange" dot>Availability unconfirmed</Badge>, "Still shown, but renters are warned it may be gone. Tap “Still available” to fix."],
    [<Badge key="o" tone="amber" dot>Under offer</Badge>, "Shown in search. Someone has made an offer, but it isn't final."],
    [<Badge key="r" tone="slate" dot>Rented / Sold</Badge>, "Hidden from search. You can relist it later."],
    [<Badge key="p" tone="slate" dot>Paused</Badge>, "Hidden from search for now — for example while repairs are done."],
  ];
  return (
    <details className="group mb-4 rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm">
      <summary className="cursor-pointer list-none font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">▸</span>
        <span className="hidden group-open:inline">▾</span> What do the statuses mean?
      </summary>
      <dl className="mt-3 space-y-2.5">
        {rows.map(([b, t], i) => (
          <div key={i} className="grid gap-1 sm:grid-cols-[13rem_1fr] sm:items-center">
            <dt>{b}</dt>
            <dd className="text-ink-700">{t}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
