"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { areaHref, areaSummary } from "@/lib/area-guide";
import { AREA_NOTES } from "@/lib/areas";
import { LAGOS_AREAS } from "@/lib/constants";
import { nairaCompact } from "@/lib/format";
import { useStore } from "@/lib/store";

/** All area guides, split into the Island and the Mainland. */
export default function AreasPage() {
  const { data, ready } = useStore();
  const sides = ["Island", "Mainland"] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Area guides"
        title="Lagos area guides"
        description="Typical asking prices from homes listed here, what to ask about, rough travel times and the homes themselves."
      />
      {sides.map((side) => (
        <section key={side} className="mt-8" aria-labelledby={`side-${side}`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`side-${side}`} className="section-title">The {side}</h2>
            <Link href={areaHref(side === "Island" ? "Island" : "Mainland")} className="link text-sm">Guide to the whole {side}</Link>
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LAGOS_AREAS.filter((a) => AREA_NOTES[a]?.side === side).map((a) => {
              const s = ready ? areaSummary(data.listings, [a]) : null;
              return (
                <li key={a}>
                  <Link href={areaHref(a)} className="card flex h-full flex-col gap-1 p-4 transition hover:shadow-raised">
                    <span className="font-bold text-ink-900">{a}</span>
                    <span className="text-sm text-ink-500">{AREA_NOTES[a].tagline}</span>
                    <span className="mt-auto pt-2 text-xs text-ink-700">
                      {!s
                        ? "…"
                        : `${s.rent.length} to rent · ${s.sale.length} for sale${s.rentPrices ? ` · typical rent ${nairaCompact(s.rentPrices.median)}/yr` : ""}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="mt-8 text-xs text-ink-500">Prices come from demo listings in this browser and are asking prices, not market prices. Area notes are general and written for the demo.</p>
    </div>
  );
}
