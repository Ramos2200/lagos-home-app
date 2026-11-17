"use client";

import { TRAVEL_DESTINATIONS, TRAVEL_GUIDE } from "@/lib/areas";

/** Rough drive times from the listing's area. A hand-made guide, clearly not live traffic. */
export function TravelGuide({ area }: { area: string }) {
  const row = TRAVEL_GUIDE[area];
  if (!row) return null;
  return (
    <div className="mt-5 rounded-xl border border-sand-200 p-4">
      <h3 className="text-sm font-bold text-ink-900">Rough drive times from {area}</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {TRAVEL_DESTINATIONS.map((dest, i) => {
          const t = row[i];
          return (
            <li key={dest} className="rounded-lg bg-sand-50 px-3 py-2 ring-1 ring-sand-200">
              <p className="text-xs font-medium text-ink-500">To {dest}</p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">{t ? `${t[0]}–${t[1]} min` : "You're already there"}</p>
              {t && <p className="text-[11px] text-ink-500">quiet roads – rush hour</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-500">A rough guide, not live traffic. Lagos journey times change a lot with time of day, rain and route.</p>
    </div>
  );
}
