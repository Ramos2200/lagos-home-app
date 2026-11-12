"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AreaSearchInput } from "@/components/AreaSearchInput";
import { FilterIcon } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { SearchMap } from "@/components/SearchMap";
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
  const [mapOpen, setMapOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const moreCount = filters.amenities.length + (filters.confirmedOnly ? 1 : 0) + (filters.hideUnderOffer ? 1 : 0);
  const save = () => {
    saveSearch(describeSearch(filters), filtersToQuery(filters));
    setSavedMsg("Saved — you'll see new and updated matches in your dashboard.");
  };

  const resultsGrid =
    !ready ? (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-sand-100" />)}
      </div>
    ) : results.length === 0 ? (
      <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50 px-6 py-10 text-center">
        <p className="font-bold">No homes match{filters.q ? ` “${filters.q}”` : ""} with these filters.</p>
        {nearby.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-ink-500">Try a nearby area:</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {nearby.map((n) => (
                <button key={n.area} className="pill" onClick={() => apply({ q: n.area })}>
                  {n.area} <span className="font-normal text-ink-500">({n.count})</span>
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
      <div className={view === "list" ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
        {results.map((l) => (
          <div
            key={l.id}
            onMouseEnter={() => setActiveId(l.id)}
            onMouseLeave={() => setActiveId(null)}
            className={`animate-rise rounded-xl transition ${activeId === l.id ? "ring-2 ring-ink-900" : ""}`}
          >
            <ListingCard listing={l} layout={view} />
          </div>
        ))}
      </div>
    );

  return (
    <div>
      {/* ── Filter bar ─────────────────────────────── */}
      <div className="sticky top-16 z-30 border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2.5 lg:px-6">
          <form
            className="min-w-0 flex-1 lg:w-80 lg:flex-none"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ q: qDraft });
            }}
          >
            <AreaSearchInput value={qDraft} onChange={setQDraft} onPick={(v) => apply({ q: v })} placeholder="Area, estate or landmark" />
          </form>

          {/* Desktop: Zillow-style filter pills */}
          <div className="hidden items-center gap-2 lg:flex">
            <FilterPopover label={filters.mode === "rent" ? "For rent" : "For sale"} active>
              <p className="label">Show homes</p>
              <Segmented
                label="Rent or buy"
                value={filters.mode}
                onChange={(m: Purpose) => apply({ mode: m })}
                options={[
                  { value: "rent", label: "For rent" },
                  { value: "sale", label: "For sale" },
                ]}
              />
            </FilterPopover>
            <FilterPopover label={b ?? "Price"} active={!!b}>
              <FilterControls filters={filters} apply={apply} only="budget" />
            </FilterPopover>
            <FilterPopover label={filters.beds ? `${filters.beds}+ beds` : "Beds"} active={!!filters.beds}>
              <FilterControls filters={filters} apply={apply} only="beds" />
            </FilterPopover>
            <FilterPopover label={filters.types.length ? `Home type (${filters.types.length})` : "Home type"} active={filters.types.length > 0}>
              <FilterControls filters={filters} apply={apply} only="type" />
            </FilterPopover>
            <FilterPopover label={moreCount ? `More (${moreCount})` : "More"} active={moreCount > 0} alignRight>
              <FilterControls filters={filters} apply={apply} only="more" />
            </FilterPopover>
            {currentUser ? (
              <button type="button" className="btn-primary btn-sm ml-1" onClick={save}>
                {savedMsg ? "Saved ✓" : "Save search"}
              </button>
            ) : (
              <Link href="/signup" className="btn-primary btn-sm ml-1">Save search</Link>
            )}
          </div>

          {/* Phones: rent/buy + all filters in a sheet */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
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
            <button type="button" className="pill relative !px-3" onClick={() => setSheetOpen(true)} aria-label={`Filters${chips.length ? `, ${chips.length} active` : ""}`}>
              <FilterIcon size={16} />
              <span className="hidden sm:inline">Filters</span>
              {chips.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{chips.length}</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(560px,1.05fr)]">
        {/* Desktop: map on the left, always in view */}
        <div className="hidden lg:block">
          <div className="sticky top-[125px] h-[calc(100vh-125px)] border-r border-sand-200">
            <SearchMap listings={results} activeId={activeId} onActive={setActiveId} className="h-full w-full" />
          </div>
        </div>

        <section className="px-4 py-5 lg:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-ink-900 sm:text-[26px]">
                {filters.mode === "rent" ? "Lagos homes for rent" : "Lagos homes for sale"}
                {filters.q ? ` · ${filters.q}` : ""}
              </h1>
              <p className="muted mt-0.5">
                <b className="font-bold text-ink-900">{ready ? results.length : "…"}</b> {results.length === 1 ? "result" : "results"}
                {resolved && resolved.length > 1 && <> across {resolved.length} areas</>}
                {filters.mode === "rent" ? " · rent shown per payment period, fees listed separately" : " · asking prices, fees listed separately"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
                <span className="hidden sm:inline">Sort:</span>
                <select
                  className="field !min-h-9 !w-auto !border-sand-200 !py-1 text-sm font-semibold"
                  value={filters.sort}
                  onChange={(e) => apply({ sort: e.target.value as SearchFilters["sort"] })}
                  aria-label="Sort results"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price (low to high)</option>
                  <option value="price_desc">Price (high to low)</option>
                  <option value="move_in_asc">{filters.mode === "rent" ? "Lowest first payment" : "Lowest total with fees"}</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
              <div className="inline-flex rounded-lg bg-sand-100 p-0.5" role="group" aria-label="Result layout">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => chooseView(v)}
                    aria-pressed={view === v}
                    aria-label={v === "list" ? "List view" : "Grid view"}
                    className={`rounded-md p-1.5 ${view === v ? "bg-white text-ink-900 shadow-card" : "text-ink-500"}`}
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

          {chips.length > 0 && (
            <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={() => apply(c.remove)} className="pill pill-on shrink-0 !min-h-8 !text-[13px]" aria-label={`Remove filter ${c.label}`}>
                  {c.label} <span aria-hidden>×</span>
                </button>
              ))}
              <button type="button" onClick={clearAll} className="shrink-0 px-2 text-sm font-bold text-brand-700 hover:underline">Clear all</button>
            </div>
          )}
          {savedMsg && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800" role="status">{savedMsg}</p>}

          <div className="mt-4">{resultsGrid}</div>

          {ready && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand-200 bg-sand-50 p-4 lg:hidden">
              <div className="text-sm">
                <p className="font-bold">Save this search</p>
                <p className="text-ink-500">{describeSearch(filters)}</p>
              </div>
              {currentUser ? (
                <button className="btn-secondary btn-sm" onClick={save}>{savedMsg ? "Saved ✓" : "Save search"}</button>
              ) : (
                <Link href="/signup" className="btn-secondary btn-sm">Sign up to save</Link>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Phones: map toggle */}
      {ready && results.length > 0 && (
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="fixed bottom-5 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white shadow-float lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
          Map
        </button>
      )}
      {mapOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Map of results">
          <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
            <p className="font-bold">{results.length} {results.length === 1 ? "home" : "homes"} on the map</p>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setMapOpen(false)} autoFocus>Show list</button>
          </div>
          <SearchMap listings={results} activeId={activeId} onActive={setActiveId} className="flex-1" />
        </div>
      )}

      {/* Phones: all filters */}
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

/** A filter pill that opens a small panel underneath (Escape or clicking outside closes it). */
function FilterPopover({ label, active, alignRight, children }: { label: string; active?: boolean; alignRight?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`pill ${active ? "pill-on" : ""}`}>
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className={`transition ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className={`absolute top-full z-40 mt-2 w-[340px] rounded-xl border border-sand-200 bg-white p-4 shadow-float ${alignRight ? "right-0" : "left-0"}`}>
          {children}
          <div className="mt-4 flex justify-end border-t border-sand-200 pt-3">
            <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}


function FilterControls({ filters, apply, only }: { filters: SearchFilters; apply: (p: Partial<SearchFilters>) => void; only?: "type" | "budget" | "beds" | "more" }) {
  const show = (s: "type" | "budget" | "beds" | "more") => !only || only === s;
  const [showAll, setShowAll] = useState(false);
  const amenityList = showAll ? AMENITIES : KEY_AMENITY_FILTERS;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const chipCls = (on: boolean) => `chip !py-1 ${on ? "chip-on" : ""}`;

  return (
    <div className="space-y-6">
      {show("type") && (<fieldset>
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
      </fieldset>)}

      {show("budget") && (<fieldset>
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
      </fieldset>)}

      {show("beds") && (<fieldset>
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
      </fieldset>)}

      {show("more") && (<fieldset>
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
      </fieldset>)}

      {show("more") && (<fieldset className="space-y-2">
        <legend className="label">Availability</legend>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={filters.confirmedOnly} onChange={(e) => apply({ confirmedOnly: e.target.checked })} />
          Only confirmed in the last 30 days
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={filters.hideUnderOffer} onChange={(e) => apply({ hideUnderOffer: e.target.checked })} />
          Hide homes under offer
        </label>
      </fieldset>)}
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
