import { FREQUENCY_SHORT, formatDate, naira } from "@/lib/format";
import type { Listing } from "@/lib/types";

export function PriceHistory({ listing, bare = false }: { listing: Listing; bare?: boolean }) {
  const points = [...listing.priceHistory].sort((a, b) => b.date.localeCompare(a.date));
  const suffix = listing.purpose === "rent" && listing.rentFrequency ? FREQUENCY_SHORT[listing.rentFrequency] : "";
  return (
    <section className={bare ? "p-5 sm:p-6" : "card p-5 sm:p-6"} aria-labelledby="aph-title">
      <h2 id="aph-title" className="section-title">
        Asking price history
      </h2>
      <p className="text-xs text-ink-500">
        Prices the lister has asked for on this platform, by date. These are not confirmed sale prices or rent paid.
      </p>
      <ol className="mt-3 space-y-2">
        {points.map((p, i) => {
          const prev = points[i + 1];
          const diff = prev ? p.price - prev.price : 0;
          return (
            <li key={p.date + i} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-brand-600" : "bg-sand-300"}`} />
                <span className="text-ink-500">{formatDate(p.date)}</span>
                {p.note && <span className="text-xs text-ink-500">· {p.note}</span>}
              </div>
              <div className="text-right">
                <span className="font-semibold">
                  {naira(p.price)}
                  <span className="font-normal text-ink-500">{suffix}</span>
                </span>
                {diff !== 0 && (
                  <span className={`ml-2 text-xs font-semibold ${diff < 0 ? "text-brand-700" : "text-amber-700"}`}>
                    {diff < 0 ? "▼" : "▲"} {naira(Math.abs(diff))}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
