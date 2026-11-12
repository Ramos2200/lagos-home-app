"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AreaSearchInput } from "@/components/AreaSearchInput";
import { FilterIcon } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { MoneyField } from "@/components/MoneyField";
import { Segmented } from "@/components/ui";
import { useDialog } from "@/components/useDialog";
import { nearbyAreasFor, resolveAreas } from "@/lib/areas";
import { AMENITIES, AMENITY_LABEL, BUDGET_PRESETS, KEY_AMENITY_FILTERS, PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { nairaCompact } from "@/lib/format";
import { DEFAULT_FILTERS, filtersFromParams, filtersToQuery, searchListings, type SearchFilters } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Purpose } from "@/lib/types";

const VIEW_KEY = "ilelagos-results-view";

export function budgetLabel(f: Pick<SearchFilters, "mode" | "min" | "max">): string | null {
  if (!f.min && !f.max) return null;
  const preset = BUDGET_PRESETS[f.mode].find((b) => b.min === f.min && b.max === f.max);
  if (preset) return preset.label;
  if (f.min && f.max) return `${nairaCompact(f.min)} – ${nairaCompact(f.max)}`;
  return f.min ? `From ${nairaCompact(f.min)}` : `Up to ${nairaCompact(f.max!)}`;
}

/** Plain-language summary of a search, used for saved searches. */
export function describeSearch(f: SearchFilters): string {
  const parts = [f.mode === "rent" ? "Rent" : "Buy"];
  if (f.q) parts.push(f.q);
  if (f.beds) parts.push(`${f.beds}+ bed`);
  const b = budgetLabel(f);
  if (b) parts.push(b);
  if (f.types.length) parts.push(f.types.map((t) => PROPERTY_TYPE_LABEL[t as keyof typeof PROPERTY_TYPE_LABEL]).join("/"));
  if (f.amenities.length) parts.push(f.amenities.map((a) => AMENITY_LABEL[a]).join(", "));
  return parts.join(" · ");
}

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, ready, currentUser, saveSearch } = useStore();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(params.toString())), [params]);
  const [qDraft, setQDraft] = useState(filters.q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    // keep the text box in sync when navigating with back/forward
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem(VIEW_KEY);
    } catch {}
    // Phones default to the compact list; larger screens to the grid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(v === "grid" || v === "list" ? v : window.innerWidth < 640 ? "list" : "grid");
  }, []);

  const chooseView = (v: "list" | "grid") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const apply = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.mode && patch.mode !== filters.mode) {
      next.min = undefined;
      next.max = undefined;
    }
    router.replace(`/search?${filtersToQuery(next)}`, { scroll: false });
  };
  const clearAll = () => router.replace(`/search?mode=${filters.mode}`, { scroll: false });

  const results = useMemo(() => (ready ? searchListings(data.listings, filters) : []), [data.listings, filters, ready]);

  // Active filter chips, each with its own remove action.
  const chips: { key: string; label: string; remove: Partial<SearchFilters> }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, remove: { q: "" } });
  for (const t of filters.types) chips.push({ key: `t-${t}`, label: PROPERTY_TYPE_LABEL[t as keyof typeof PROPERTY_TYPE_LABEL] ?? t, remove: { types: filters.types.filter((x) => x !== t) } });
  const b = budgetLabel(filters);
  if (b) chips.push({ key: "budget", label: b, remove: { min: undefined, max: undefined } });
  if (filters.beds) chips.push({ key: "beds", label: `${filters.beds}+ bed`, remove: { beds: undefined } });
  for (const a of filters.amenities) chips.push({ key: `a-${a}`, label: AMENITY_LABEL[a] ?? a, remove: { amenities: filters.amenities.filter((x) => x !== a) } });
  if (filters.confirmedOnly) chips.push({ key: "conf", label: "Recently confirmed", remove: { confirmedOnly: false } });
  if (filters.hideUnderOffer) chips.push({ key: "offer", label: "No under-offer", remove: { hideUnderOffer: false } });

  const resolved = filters.q ? resolveAreas(filters.q) : null;
  const nearby = useMemo(() => {
    if (!ready || results.length || !filters.q) return [];
    return nearbyAreasFor(filters.q)
      .map((a) => ({ area: a, count: searchListings(data.listings, { ...filters, q: a }).length }))
      .filter((x) => x.count > 0);
  }, [ready, results.length, filters, data.listings]);
  const withoutFilters = useMemo(
    () => (ready && !results.length && chips.length > 1 ? searchListings(data.listings, { ...DEFAULT_FILTERS, mode: filters.mode, q: filters.q }).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, results.length, filters, data.listings],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      {/* Top search bar */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-sand-200 bg-sand-100/95 px-4 py-2.5 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <Segmented
              label="Rent or buy"
              size="sm"
              value={filters.mode}
              onChange={(m: Purpose) => apply({ mode: m })}
              options={[
                { value: "rent", label: "Rent" },
                { value: "sale", label: "Buy" },
              ]}
            />
          </div>
          <form
            className="min-w-0 flex-1"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ q: qDraft });
            }}
          >
            <AreaSearchInput value={qDraft} onChange={setQDraft} onPick={(v) => apply({ q: v })} placeholder="Area or estate" />
          </form>
          <button type="button" className="btn-secondary btn-icon relative gap-1 sm:!px-3 lg:hidden" onClick={() => setSheetOpen(true)} aria-label="Filters">
            <FilterIcon size={16} />
            <span className="hidden sm:inline">Filters</span>
            {chips.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{chips.length}</span>}
          </button>
        </div>
        {chips.length > 0 && (
          <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => apply(c.remove)}
                className="chip shrink-0 !py-1 border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-500"
                aria-label={`Remove filter ${c.label}`}
              >
                {c.label} <span aria-hidden className="text-brand-600">×</span>
              </button>
            ))}
            <button type="button" onClick={clearAll} className="shrink-0 px-2 text-sm font-semibold text-ink-500 underline-offset-2 hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto border-r border-sand-200 pr-5">
            <FilterControls filters={filters} apply={apply} />
          </div>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-xl leading-tight font-semibold tracking-tight text-ink-900 sm:text-2xl">
                {filters.mode === "rent" ? "Homes for rent" : "Homes for sale"}
                {filters.q ? ` in ${filters.q}` : " in Lagos"}
              </h1>
              <p className="muted mt-0.5">
                <b className="font-semibold text-ink-900">{ready ? results.length : "…"}</b> {results.length === 1 ? "home" : "homes"}
                {resolved && resolved.length > 1 && <> across {resolved.length} areas</>}
                {filters.mode === "rent" ? " · prices shown per payment period, fees listed separately" : " · asking prices, fees listed separately"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="field !min-h-9 !w-auto !py-1 text-sm"
                value={filters.sort}
                onChange={(e) => apply({ sort: e.target.value as SearchFilters["sort"] })}
                aria-label="Sort results"
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="move_in_asc">{filters.mode === "rent" ? "Lowest move-in total" : "Lowest total with fees"}</option>
                <option value="newest">Newest</option>
              </select>
              <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-sand-200" role="group" aria-label="Result layout">
                {(["list", "grid"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => chooseView(v)}
                    aria-pressed={view === v}
                    aria-label={v === "list" ? "List view" : "Grid view"}
                    className={`rounded-md p-1.5 ${view === v ? "bg-sand-200 text-ink-900" : "text-ink-500"}`}
                  >
                    {v === "list" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="4" width="6" height="6" rx="1" /><rect x="3" y="14" width="6" height="6" rx="1" /><path d="M13 7h8M13 17h8" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!ready ? (
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="card h-32 animate-pulse bg-sand-50" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-6 py-10 text-center">
              <p className="font-semibold">No homes match{filters.q ? ` “${filters.q}”` : ""} with these filters.</p>
              {nearby.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-ink-500">Try a nearby area:</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {nearby.map((n) => (
                      <button key={n.area} className="chip text-ink-900" onClick={() => apply({ q: n.area })}>
                        {n.area} <span className="text-ink-500">({n.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {withoutFilters > 0 && (
                <button className="btn-secondary mt-4" onClick={() => router.replace(`/search?mode=${filters.mode}&q=${encodeURIComponent(filters.q)}`)}>
                  Show {withoutFilters} {withoutFilters === 1 ? "home" : "homes"} without other filters
                </button>
              )}
              {!nearby.length && !withoutFilters && (
                <button type="button" className="btn-secondary mt-4" onClick={() => router.replace(`/search?mode=${filters.mode}`)}>
                  See all {filters.mode === "rent" ? "rentals" : "homes for sale"}
                </button>
              )}
            </div>
          ) : (
            <div className={view === "list" ? "grid gap-3 sm:gap-4 xl:grid-cols-2" : "grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"}>
              {results.map((l) => <ListingCard key={l.id} listing={l} layout={view} />)}
            </div>
          )}

          {ready && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-4">
              <div className="text-sm">
                <p className="font-semibold">Save this search</p>
                <p className="text-ink-500">{describeSearch(filters)}</p>
              </div>
              {currentUser ? (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    saveSearch(describeSearch(filters), filtersToQuery(filters));
                    setSavedMsg("Saved — find it on your account page and the home page.");
                  }}
                >
                  {savedMsg ? "Saved ✓" : "Save search"}
                </button>
              ) : (
                <Link href="/signup" className="btn-secondary btn-sm">Sign up to save</Link>
              )}
              {savedMsg && <p className="w-full text-xs text-brand-700" role="status">{savedMsg}</p>}
            </div>
          )}
        </section>
      </div>

      {/* Mobile filter sheet */}
      {sheetOpen && (
        <FilterSheet
          count={results.length}
          onClose={() => setSheetOpen(false)}
          onClear={() => router.replace(`/search?mode=${filters.mode}${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ""}`)}
        >
          <FilterControls filters={filters} apply={apply} />
        </FilterSheet>
      )}
    </div>
  );
}

function FilterControls({ filters, apply }: { filters: SearchFilters; apply: (p: Partial<SearchFilters>) => void }) {
  const [showAll, setShowAll] = useState(false);
  const amenityList = showAll ? AMENITIES : KEY_AMENITY_FILTERS;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const chipCls = (on: boolean) => `chip !py-1 ${on ? "chip-on" : ""}`;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label">Property type</legend>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => {
            const on = filters.types.includes(t.value);
            return (
              <button key={t.value} type="button" aria-pressed={on} onClick={() => apply({ types: toggle(filters.types, t.value) })} className={chipCls(on)}>
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Budget {filters.mode === "rent" ? "(per year)" : "(asking price)"}</legend>
        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS[filters.mode].map((b) => {
            const on = filters.min === b.min && filters.max === b.max;
            return (
              <button key={b.label} type="button" aria-pressed={on} onClick={() => apply(on ? { min: undefined, max: undefined } : { min: b.min, max: b.max })} className={chipCls(on)}>
                {b.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <CommitMoney label="Min" value={filters.min} onCommit={(v) => apply({ min: v })} />
          <CommitMoney label="Max" value={filters.max} onCommit={(v) => apply({ max: v })} />
        </div>
        {filters.mode === "rent" && <p className="mt-1 text-xs text-ink-500">Monthly and quarterly rents are compared as yearly totals.</p>}
      </fieldset>

      <fieldset>
        <legend className="label">Bedrooms</legend>
        <div className="grid grid-cols-6 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((n) => {
            const on = (filters.beds ?? 0) === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => apply({ beds: n || undefined })}
                className={`tile ${on ? "tile-on" : ""}`}
              >
                {n === 0 ? "Any" : `${n}+`}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Key amenities</legend>
        <div className="space-y-1.5">
          {amenityList.map((a) => (
            <label key={a.key} className="flex items-center gap-2 py-0.5 text-sm text-ink-700">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={filters.amenities.includes(a.key)} onChange={() => apply({ amenities: toggle(filters.amenities, a.key) })} />
              {a.label}
            </label>
          ))}
        </div>
        <button type="button" className="mt-2 text-sm font-semibold text-brand-700" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show fewer" : "Show all amenities"}
        </button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">Availability</legend>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={filters.confirmedOnly} onChange={(e) => apply({ confirmedOnly: e.target.checked })} />
          Only confirmed in the last 30 days
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={filters.hideUnderOffer} onChange={(e) => apply({ hideUnderOffer: e.target.checked })} />
          Hide homes under offer
        </label>
      </fieldset>
    </div>
  );
}

/** Money box that applies its value on blur / Enter, so the URL isn't rewritten on every keystroke. */
function CommitMoney({ label, value, onCommit }: { label: string; value?: number; onCommit: (v?: number) => void }) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value ? String(value) : "");
  }, [value]);
  const commit = () => {
    const n = Number(draft);
    if ((n || undefined) !== value) onCommit(n > 0 ? n : undefined);
  };
  return (
    <label className="text-xs text-ink-500">
      {label}
      <MoneyField value={draft} onChange={setDraft} onBlur={commit} onEnter={commit} placeholder="No limit" className="mt-0.5 !py-2 text-sm" />
    </label>
  );
}

/** Bottom sheet for filters on phones; Escape or the close button dismisses it. */
function FilterSheet({ count, onClose, onClear, children }: { count: number; onClose: () => void; onClear: () => void; children: React.ReactNode }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="filters-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-sand-200 px-4 py-3">
          <button type="button" className="btn-ghost btn-icon !min-h-9 !min-w-9" onClick={onClose} aria-label="Close filters">✕</button>
          <h2 id="filters-title" className="section-title">Filters</h2>
          <button type="button" className="btn-ghost btn-sm" onClick={onClear}>Clear</button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        <div className="border-t border-sand-200 p-4">
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            {count === 0 ? "No homes match — close" : `Show ${count} ${count === 1 ? "home" : "homes"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
