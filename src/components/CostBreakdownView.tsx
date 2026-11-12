import { annualize, naira, nairaCompact } from "@/lib/format";
import { costBreakdown, firstPeriodLabel, type CostInput, type CostLine } from "@/lib/listing-utils";
import { InfoIcon } from "./Icons";

const FREQ_WORD = { annual: "Annual rent", monthly: "Monthly rent", quarterly: "Quarterly rent" } as const;

/**
 * Cost breakdown for a listing (or a listing being edited): recurring costs, one-time move-in
 * costs and a first-payment estimate built only from amounts the lister actually entered.
 */
export function CostBreakdownView({ listing, preview = false }: { listing: CostInput; preview?: boolean }) {
  const rent = listing.purpose === "rent";
  const freq = listing.rentFrequency ?? "annual";
  const b = costBreakdown(listing);
  const rentLine = b.recurring.find((x) => x.key === "rent");
  const serviceLine = b.recurring.find((x) => x.key === "service");
  const otherRecurring = b.recurring.filter((x) => x.key !== "rent" && x.key !== "service");
  const known = (x: CostLine) => typeof x.amount === "number";
  const oneTimeKnown = b.oneTime.filter(known).reduce((s, x) => s + (x.amount ?? 0), 0);
  const hasPrice = listing.price > 0;

  return (
    <div className="space-y-5">
      {/* Headline: the price and, for rent, exactly how often it's paid */}
      {hasPrice && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {rent && (
            <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">{FREQ_WORD[freq]}</span>
          )}
          <p className="text-lg font-semibold text-ink-900">
            {naira(listing.price)} <span className="font-medium text-ink-700">{rent ? rentLine?.per : "asking price"}</span>
          </p>
          {rent && freq !== "annual" && <p className="text-sm text-ink-500">≈ {nairaCompact(annualize(listing.price, freq))} per year</p>}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <CostGroup
          title={rent ? "Recurring costs" : "Ongoing costs"}
          hint={rent ? "Paid again every period" : "Paid after you buy"}
          lines={rent ? b.recurring : [serviceLine!, ...otherRecurring]}
        />
        <CostGroup title={rent ? "One-time move-in costs" : "One-time costs when buying"} hint="Paid once, up front" lines={b.oneTime} />
      </div>

      {/* First payment estimate */}
      <div className="rounded-xl bg-brand-50 px-4 py-3.5 ring-1 ring-brand-100">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-brand-900">{rent ? "First payment estimate" : "Estimated total to buy"}</span>
          <span className="text-xl font-semibold tracking-tight text-brand-900">{hasPrice ? naira(b.firstPayment) : "—"}</span>
        </div>
        {hasPrice && (
          <ul className="mt-2 space-y-0.5 text-xs text-brand-900/85">
            {rent ? (
              <li>
                Rent for the {firstPeriodLabel(freq)}: {naira(listing.price)}
              </li>
            ) : (
              <li>Asking price: {naira(listing.price)}</li>
            )}
            {serviceLine && known(serviceLine) && (serviceLine.amount ?? 0) > 0 && (
              <li>
                Service charge for the {firstPeriodLabel(listing.costs.serviceChargeFrequency)}: {naira(serviceLine.amount!)}
              </li>
            )}
            {otherRecurring.filter(known).map((x) => (
              <li key={x.key}>
                {x.label} (first period): {naira(x.amount!)}
              </li>
            ))}
            {oneTimeKnown > 0 && <li>One-time costs: {naira(oneTimeKnown)}</li>}
          </ul>
        )}
        <p className="mt-2 text-xs text-brand-900/80">
          {preview ? "Renters will see this estimate." : "Calculated only from amounts the lister entered."} Taxes, survey, utilities and other costs may also apply.
        </p>
      </div>

      {b.notProvided.length > 0 && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          <InfoIcon size={14} className="mt-0.5 shrink-0" />
          <span>
            <b>Not provided:</b> {b.notProvided.join(", ")}. These aren&apos;t included in the estimate —{" "}
            {preview ? "leave a field blank only if you don't know it, or enter 0 if there's no fee." : "ask the lister before you pay anything."}
          </span>
        </p>
      )}
    </div>
  );
}

function CostGroup({ title, hint, lines }: { title: string; hint: string; lines: CostLine[] }) {
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="text-xs text-ink-500">{hint}</p>
      <dl className="mt-2 divide-y divide-sand-200 rounded-xl border border-sand-200 bg-white text-sm">
        {lines.map((x) => (
          <div key={x.key} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <dt className="min-w-0 text-ink-700">
              {x.label}
              {x.note && <span className="block text-xs text-ink-500">{x.note}</span>}
            </dt>
            <dd className="shrink-0 text-right">
              {typeof x.amount === "number" ? (
                x.amount === 0 ? (
                  <span className="font-medium text-ink-700">None</span>
                ) : (
                  <span className="font-semibold text-ink-900">
                    {naira(x.amount)}
                    {x.per && <span className="block text-xs font-normal text-ink-500">{x.per}</span>}
                  </span>
                )
              ) : (
                <span className="text-ink-500 italic">Not provided</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
