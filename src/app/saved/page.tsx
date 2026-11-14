"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AvailabilityLine, PriceTag } from "@/components/ListingCard";
import { ShareButton } from "@/components/ContactActions";
import { CheckIcon, HeartIcon, PinIcon } from "@/components/Icons";
import { SavedNote } from "@/components/SavedNote";
import { ListingPhoto } from "@/components/ListingPhoto";
import { EmptyState, PageHeader } from "@/components/ui";
import { AMENITY_LABEL, OCCUPANCY_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { formatDate, naira, nairaCompact, relativeDays } from "@/lib/format";
import { costBreakdown, effectiveStatus } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Listing } from "@/lib/types";

const MAX_COMPARE = 3;
const KEY_AMENITIES = ["borehole", "power_24", "gated", "security_guard", "parking", "good_road", "prepaid_meter", "fitted_kitchen", "bq", "serviced"];

export default function SavedHomesPage() {
  const { data, ready, toggleSaved } = useStore();
  const [compare, setCompare] = useState<string[]>([]);
  const [removed, setRemoved] = useState<Listing | null>(null);

  const saved = useMemo(() => data.listings.filter((l) => data.savedListingIds.includes(l.id)), [data.listings, data.savedListingIds]);
  // Drop homes from the comparison if they're no longer saved.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompare((c) => c.filter((id) => data.savedListingIds.includes(id)));
  }, [data.savedListingIds]);

  const comparing = compare.map((id) => saved.find((l) => l.id === id)).filter((l): l is Listing => !!l);
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= MAX_COMPARE ? c : [...c, id]));

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-40 animate-pulse" /></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Saved homes"
        title="Your saved homes"
        description="Homes you saved with the heart button, kept in this browser. Tick up to three to compare them side by side."
        actions={<Link href="/search?mode=rent" className="btn-secondary">Find more homes</Link>}
      />

      {removed && (
        <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white">
          <span className="flex-1">Removed “{removed.title}” from saved homes.</span>
          <button
            className="font-semibold text-brand-200 underline-offset-2 hover:underline"
            onClick={() => {
              toggleSaved(removed.id);
              setRemoved(null);
            }}
          >
            Undo
          </button>
        </div>
      )}

      {saved.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No saved homes yet"
            body="Tap the heart on any home in search results or on a listing page. It stays here even after you close the page."
            action={
              <>
                <Link href="/search?mode=rent" className="btn-primary btn-sm">Homes for rent</Link>
                <Link href="/search?mode=sale" className="btn-secondary btn-sm">Homes for sale</Link>
              </>
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((l) => {
              const on = compare.includes(l.id);
              const full = !on && compare.length >= MAX_COMPARE;
              return (
                <li key={l.id} className={`card flex flex-col overflow-hidden ${on ? "ring-2 ring-brand-600" : ""}`}>
                  <Link href={`/listings/${l.id}`} tabIndex={-1} aria-hidden>
                    <ListingPhoto seed={l.photoSeed} type={l.propertyType} className="aspect-[3/2]" showTag={false} />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <PriceTag listing={l} size="sm" />
                    <Link href={`/listings/${l.id}`} className="line-clamp-2 font-medium text-ink-900 hover:underline">{l.title}</Link>
                    <p className="flex items-center gap-1 text-[13px] text-ink-500">
                      <PinIcon size={14} /> {l.area}
                      {l.landmark ? ` · ${l.landmark}` : ""}
                    </p>
                    <AvailabilityLine listing={l} compact />
                    <div className="mt-auto pt-2">
                      <SavedNote listingId={l.id} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-sand-200 bg-sand-50 px-4 py-2.5">
                    <label className={`flex items-center gap-2 text-sm font-medium ${full ? "text-ink-300" : "text-ink-700"}`}>
                      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={on} disabled={full} onChange={() => toggleCompare(l.id)} />
                      Compare
                    </label>
                    <ShareButton listing={l} className="btn-ghost btn-sm ml-auto" />
                    <button
                      className="btn-ghost btn-sm text-red-700 hover:!text-red-800"
                      onClick={() => {
                        toggleSaved(l.id);
                        setRemoved(l);
                      }}
                      aria-label={`Remove ${l.title} from saved homes`}
                    >
                      <HeartIcon filled size={16} /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-500" aria-live="polite">
            {compare.length === 0
              ? "Tick “Compare” on two or three homes to see them side by side."
              : compare.length >= MAX_COMPARE
                ? `${MAX_COMPARE} homes selected — that's the most you can compare at once.`
                : `${compare.length} selected. Choose ${compare.length === 1 ? "at least one more" : "one more if you like"}.`}
          </p>

          {comparing.length >= 2 && <CompareTable listings={comparing} onRemove={(id) => toggleCompare(id)} />}
        </>
      )}
    </div>
  );
}

function CompareTable({ listings, onRemove }: { listings: Listing[]; onRemove: (id: string) => void }) {
  const { data } = useStore();
  const money = (n?: number) => (typeof n === "number" ? (n === 0 ? "None" : naira(n)) : <span className="text-ink-500 italic">Not provided</span>);
  const rows: { label: string; cell: (l: Listing) => React.ReactNode }[] = [
    { label: "Price", cell: (l) => <PriceTag listing={l} size="sm" /> },
    { label: "Your note", cell: (l) => data.savedNotes[l.id] || <span className="text-ink-500">—</span> },
    {
      label: "First payment estimate",
      cell: (l) => {
        const b = costBreakdown(l);
        return (
          <span>
            <b className="font-semibold">{naira(b.firstPayment)}</b>
            {b.notProvided.length > 0 && <span className="block text-xs text-ink-500">Excludes: {b.notProvided.join(", ")}</span>}
          </span>
        );
      },
    },
    { label: "Caution deposit", cell: (l) => (l.purpose === "rent" ? money(l.costs.cautionDeposit) : "—") },
    { label: "Agency fee", cell: (l) => money(l.costs.agencyFee) },
    { label: "Legal fee", cell: (l) => money(l.costs.legalFee) },
    {
      label: "Service charge",
      cell: (l) =>
        typeof l.costs.serviceCharge === "number" ? (
          <>
            {money(l.costs.serviceCharge)}
            {l.costs.serviceCharge > 0 && l.costs.serviceChargeFrequency && <span className="block text-xs text-ink-500">{l.costs.serviceChargeFrequency === "monthly" ? "per month" : l.costs.serviceChargeFrequency === "quarterly" ? "per quarter" : "per year"}</span>}
          </>
        ) : (
          money(undefined)
        ),
    },
    { label: "Area", cell: (l) => <>{l.area}{l.landmark && <span className="block text-xs text-ink-500">{l.landmark}</span>}</> },
    { label: "Type", cell: (l) => PROPERTY_TYPE_LABEL[l.propertyType] },
    { label: "Bedrooms", cell: (l) => l.bedrooms },
    { label: "Bathrooms", cell: (l) => `${l.bathrooms} (${l.toilets} toilets)` },
    { label: "Size", cell: (l) => (l.sizeSqm ? `${l.sizeSqm} m²` : <span className="text-ink-500 italic">Not provided</span>) },
    { label: "Availability", cell: (l) => <AvailabilityLine listing={l} compact /> },
    { label: "Available from", cell: (l) => formatDate(l.availableFrom) },
    { label: "Last confirmed", cell: (l) => `${relativeDays(l.lastConfirmed)}` },
    { label: "Occupancy", cell: (l) => OCCUPANCY_LABEL[l.occupancy] },
    { label: "Water", cell: (l) => l.details.water || <span className="text-ink-500 italic">Not provided</span> },
    { label: "Power", cell: (l) => l.details.power || <span className="text-ink-500 italic">Not provided</span> },
    { label: "Flooding", cell: (l) => l.details.flooding || <span className="text-ink-500 italic">Not provided</span> },
    {
      label: "Key amenities",
      cell: (l) => (
        <ul className="space-y-0.5 text-xs">
          {KEY_AMENITIES.map((a) => (
            <li key={a} className={l.amenities.includes(a) ? "text-ink-900" : "text-ink-300"}>
              {l.amenities.includes(a) ? <CheckIcon size={12} className="mr-1 inline text-brand-600" /> : <span className="mr-1 inline-block w-3 text-center">–</span>}
              {AMENITY_LABEL[a]}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <section className="mt-10" aria-labelledby="compare-title">
      <h2 id="compare-title" className="section-title">Compare {listings.length} homes</h2>
      <p className="muted mt-0.5">Swipe sideways on a phone to see every column. “Not provided” means the lister didn&apos;t enter it.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <caption className="sr-only">Side-by-side comparison of saved homes</caption>
          <thead>
            <tr className="align-top">
              <th scope="col" className="sticky left-0 z-10 w-36 bg-white p-3 text-xs font-medium text-ink-500">Home</th>
              {listings.map((l) => (
                <th key={l.id} scope="col" className="min-w-[180px] border-l border-sand-200 p-3 font-normal">
                  <ListingPhoto seed={l.photoSeed} type={l.propertyType} className="aspect-[3/2] rounded-lg" showTag={false} />
                  <Link href={`/listings/${l.id}`} className="mt-2 line-clamp-2 block font-semibold text-ink-900 hover:underline">{l.title}</Link>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-500">
                    {l.purpose === "rent" ? "For rent" : "For sale"} · {effectiveStatus(l) === "available" ? "Live" : "Check status"}
                    <button className="link text-xs" onClick={() => onRemove(l.id)} aria-label={`Stop comparing ${l.title}`}>Remove</button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-sand-200 align-top">
                <th scope="row" className="sticky left-0 z-10 bg-sand-50 p-3 text-xs font-medium text-ink-700">{r.label}</th>
                {listings.map((l) => (
                  <td key={l.id} className="border-l border-sand-200 p-3 text-ink-900">{r.cell(l)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {new Set(listings.map((l) => l.purpose)).size === 1 && <CheapestNote listings={listings} />}
    </section>
  );
}

function CheapestNote({ listings }: { listings: Listing[] }) {
  const best = [...listings].sort((a, b) => costBreakdown(a).firstPayment - costBreakdown(b).firstPayment)[0];
  const missing = costBreakdown(best).notProvided.length > 0;
  return (
    <p className="mt-2 text-xs text-ink-500">
      Lowest first payment from entered amounts: <b className="text-ink-700">{best.title}</b> ({nairaCompact(costBreakdown(best).firstPayment)})
      {missing && " — but some of its costs weren't provided"}.
    </p>
  );
}
