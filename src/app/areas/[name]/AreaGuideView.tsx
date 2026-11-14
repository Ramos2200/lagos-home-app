"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { InfoIcon } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { Avatar } from "@/components/SiteHeader";
import { TravelGuide } from "@/components/TravelGuide";
import { EmptyState, MessagePage, Segmented } from "@/components/ui";
import { agencyLabel, isAgent } from "@/lib/agents";
import { areaHref, areaSummary, type PriceSummary } from "@/lib/area-guide";
import { AREA_GROUPS, AREA_NOTES, NEARBY, normalize, resolveAreas } from "@/lib/areas";
import { nairaCompact } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Purpose } from "@/lib/types";

/**
 * Area guide: typical asking prices from homes listed here, general notes, rough travel times,
 * the homes themselves and agents who cover the area. Works for one area or a group like "Lekki".
 */
export function AreaGuideView() {
  const { name: raw } = useParams<{ name: string }>();
  const name = decodeURIComponent(raw);
  const { data, ready } = useStore();
  const [mode, setMode] = useState<Purpose>("rent");

  const areas = resolveAreas(name);
  if (!areas) {
    return (
      <MessagePage
        title="Area not found"
        body={`We don't have a guide for “${name}” yet.`}
        actions={<Link href="/areas" className="btn-primary">See all area guides</Link>}
      />
    );
  }
  const single = areas.length === 1 ? areas[0] : null;
  const group = single ? null : AREA_GROUPS.find((g) => g.aliases.map(normalize).includes(normalize(name)));
  const title = single ?? group?.name ?? name;
  const note = single ? AREA_NOTES[single] : undefined;

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-48 animate-pulse" /></div>;

  const s = areaSummary(data.listings, areas);
  const homes = mode === "rent" ? s.rent : s.sale;
  const agents = data.users.filter((u) => isAgent(u) && (u.areasServed ?? []).some((a) => areas.includes(a)));
  const nearby = single ? (NEARBY[single] ?? []) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link href="/areas" className="btn-ghost btn-sm -ml-3">← All area guides</Link>

      <header className="mt-2">
        <p className="eyebrow">{note ? `${note.side} · area guide` : "Area guide"}</p>
        <h1 className="page-title mt-1">{title}</h1>
        <p className="muted mt-1">{note?.tagline ?? group?.hint}</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* Asking prices */}
          <section className="card p-5 sm:p-6" aria-labelledby="prices-title">
            <h2 id="prices-title" className="section-title">Asking prices here</h2>
            <p className="muted mt-0.5">From homes listed on IleLagos right now. Rent is shown per year so monthly and quarterly rents compare fairly.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PriceCard label="Typical rent" unit="/yr" s={s.rentPrices} />
              <PriceCard label="Typical asking price" unit="" s={s.salePrices} />
            </div>
            {s.rentByBeds.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <caption className="mb-2 text-left text-sm font-bold text-ink-900">Rent per year by bedrooms</caption>
                  <thead>
                    <tr className="border-b border-sand-200 text-left text-xs text-ink-500">
                      <th scope="col" className="py-2 font-medium">Bedrooms</th>
                      <th scope="col" className="py-2 font-medium">Typical (median)</th>
                      <th scope="col" className="py-2 font-medium">Range</th>
                      <th scope="col" className="py-2 font-medium">Homes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.rentByBeds.map(({ beds, summary }) => (
                      <tr key={beds} className="border-b border-sand-100">
                        <th scope="row" className="py-2 text-left font-semibold">{beds === "4+" ? "4 or more" : beds}</th>
                        <td className="py-2 font-bold">{nairaCompact(summary.median)}</td>
                        <td className="py-2 text-ink-700">{summary.count > 1 ? `${nairaCompact(summary.low)} – ${nairaCompact(summary.high)}` : "—"}</td>
                        <td className="py-2 text-ink-700">{summary.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 flex gap-2 rounded-xl bg-sand-50 p-3 text-xs text-ink-700 ring-1 ring-sand-200">
              <InfoIcon className="mt-0.5 shrink-0" size={14} />
              These are asking prices from a handful of demo listings, not rents actually paid or sale prices. Real prices vary a lot by street, building and condition.
            </p>
          </section>

          {/* General notes */}
          {note && single && (
            <section className="card p-5 sm:p-6" aria-labelledby="about-title">
              <h2 id="about-title" className="section-title">About {single}</h2>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-700">{note.overview}</p>
              <h3 className="mt-4 text-sm font-bold text-ink-900">Worth asking about here</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
                {note.askAbout.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink-500">General notes written for this demo, not local research. Always visit and ask neighbours before deciding.</p>
              <TravelGuide area={single} />
            </section>
          )}

          {/* Areas inside a group such as "Lekki" */}
          {group && (
            <section className="card p-5 sm:p-6" aria-labelledby="parts-title">
              <h2 id="parts-title" className="section-title">Areas in {group.name}</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {areas.map((a) => {
                  const n = s[mode].filter((l) => l.area === a).length;
                  return (
                    <li key={a}>
                      <Link href={areaHref(a)} className="flex items-center justify-between gap-3 rounded-xl border border-sand-200 px-3 py-2.5 hover:border-ink-900">
                        <span className="min-w-0">
                          <span className="font-semibold text-ink-900">{a}</span>
                          <span className="block truncate text-xs text-ink-500">{AREA_NOTES[a]?.tagline}</span>
                        </span>
                        <span className="shrink-0 text-xs text-ink-500">{n} {mode === "rent" ? "to rent" : "for sale"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:self-start">
          {agents.length > 0 && (
            <section className="card p-5" aria-labelledby="agents-title">
              <h2 id="agents-title" className="text-sm font-bold text-ink-900">Agents covering {single ?? "this area"}</h2>
              <ul className="mt-3 space-y-3">
                {agents.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.name} size={36} />
                    <div className="min-w-0 text-sm">
                      <Link href={`/agents/${a.id}`} className="font-semibold text-ink-900 hover:underline">{a.name}</Link>
                      <p className="truncate text-xs text-ink-500">{agencyLabel(a)} · demo</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {nearby.length > 0 && (
            <section className="card p-5" aria-labelledby="nearby-title">
              <h2 id="nearby-title" className="text-sm font-bold text-ink-900">Nearby areas</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {nearby.map((a) => (
                  <Link key={a} href={areaHref(a)} className="chip !min-h-8 text-[13px]">{a}</Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Homes */}
      <section className="mt-8" aria-labelledby="homes-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="homes-title" className="section-title">Homes in {single ?? title}</h2>
          <Segmented
            label="Rent or buy"
            value={mode}
            onChange={setMode}
            options={[
              { value: "rent", label: `To rent (${s.rent.length})` },
              { value: "sale", label: `For sale (${s.sale.length})` },
            ]}
          />
        </div>
        {homes.length ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {homes.slice(0, 6).map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
            <Link href={`/search?mode=${mode}&q=${encodeURIComponent(name)}`} className="btn-secondary mt-5">
              See all {homes.length} in search
            </Link>
          </>
        ) : (
          <div className="mt-4">
            <EmptyState
              title={`No homes ${mode === "rent" ? "to rent" : "for sale"} here right now`}
              body="Save a search to be told in the app when one is listed."
              action={<Link href={`/search?mode=${mode}&q=${encodeURIComponent(name)}`} className="btn-primary btn-sm">Search and save</Link>}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function PriceCard({ label, unit, s }: { label: string; unit: string; s: PriceSummary | null }) {
  return (
    <div className="rounded-xl bg-sand-50 p-4 ring-1 ring-sand-200">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      {s ? (
        <>
          <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink-900">
            {nairaCompact(s.median)}
            <span className="text-base font-bold text-ink-700">{unit}</span>
          </p>
          <p className="text-xs text-ink-500">
            {s.count > 1 ? `${nairaCompact(s.low)} – ${nairaCompact(s.high)} · ` : ""}from {s.count} home{s.count === 1 ? "" : "s"}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-ink-500 italic">No homes listed right now</p>
      )}
    </div>
  );
}
