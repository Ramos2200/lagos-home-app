"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AreaSearchInput } from "@/components/AreaSearchInput";
import { CheckIcon, ShieldIcon } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState, Section } from "@/components/ui";
import { areasToQuery } from "@/lib/areas";
import { BUDGET_PRESETS, KEY_AMENITY_FILTERS, PROPERTY_TYPES } from "@/lib/constants";
import { DEFAULT_FILTERS, filtersToQuery, searchListings, type SearchFilters } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Purpose } from "@/lib/types";

const POPULAR = [
  { q: "Lekki", label: "Lekki", hint: "Phase 1, Ikate, Chevron, Ajah" },
  { q: "Yaba", label: "Yaba", hint: "Mainland · near campuses" },
  { q: "Ikeja", label: "Ikeja & around", hint: "GRA, Maryland, Ogudu" },
  { q: "Ikoyi", label: "Ikoyi", hint: "Island · serviced flats" },
  { q: "Surulere", label: "Surulere", hint: "Mainland · central" },
  { q: "Mainland", label: "All Mainland", hint: "Yaba to Festac" },
];

/** One-tap searches people commonly make. Each is just a preset of the normal search filters. */
const QUICK: Record<Purpose, { label: string; f: Partial<SearchFilters> }[]> = {
  rent: [
    { label: "Self-contain & mini flats", f: { types: ["self_contain", "mini_flat"] } },
    { label: "Under ₦2M a year", f: { max: 2_000_000 } },
    { label: "2-bed on the Mainland", f: { q: "Mainland", beds: 2 } },
    { label: "3-bed+ in Lekki", f: { q: "Lekki", beds: 3 } },
    { label: "Serviced apartments", f: { amenities: ["serviced"] } },
  ],
  sale: [
    { label: "Under ₦80M", f: { max: 80_000_000 } },
    { label: "Duplexes", f: { types: ["terrace", "semi_detached", "detached"] } },
    { label: "Flats & apartments", f: { types: ["flat", "penthouse"] } },
    { label: "4-bed+ in Lekki", f: { q: "Lekki", beds: 4 } },
  ],
};

const STEPS = [
  { title: "Search by area or landmark", body: "Type “Lekki”, “Yaba” or an estate name. Filter by budget, bedrooms and must-haves like borehole or 24-hour power." },
  { title: "Compare the full cost", body: "Every listing shows rent per year or month, plus agency, legal, caution and service charges listed separately." },
  { title: "Arrange a viewing", body: "Request a viewing or message the lister. See the home in person before paying anything." },
];

export default function HomePage() {
  const router = useRouter();
  const { data, ready, currentUser } = useStore();
  const [mode, setMode] = useState<Purpose>("rent");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [budget, setBudget] = useState("");
  const [beds, setBeds] = useState("");
  const [amen, setAmen] = useState<string[]>([]);

  function go(query = q) {
    const preset = budget ? BUDGET_PRESETS[mode][Number(budget)] : undefined;
    const qs = filtersToQuery({
      ...DEFAULT_FILTERS,
      mode,
      q: query,
      types: type ? [type] : [],
      min: preset?.min,
      max: preset?.max,
      beds: beds ? Number(beds) : undefined,
      amenities: amen,
    });
    router.push(`/search?${qs}`);
  }

  const quickHref = (f: Partial<SearchFilters>) => `/search?${filtersToQuery({ ...DEFAULT_FILTERS, mode, ...f })}`;

  const featured = useMemo(
    () => (ready ? searchListings(data.listings, { ...DEFAULT_FILTERS, mode, confirmedOnly: true }).slice(0, 6) : []),
    [data.listings, mode, ready],
  );
  const areaCounts = useMemo(
    () => Object.fromEntries(POPULAR.map((p) => [p.q, ready ? searchListings(data.listings, { ...DEFAULT_FILTERS, mode, q: p.q }).length : 0])),
    [data.listings, mode, ready],
  );

  // Personalised section for a signed-in seeker.
  const prefs = currentUser?.preferences;
  const mySearches = ready ? data.savedSearches.filter((s) => s.userId === currentUser?.id).slice(0, 3) : [];
  const forYou = useMemo(() => {
    if (!ready || !prefs) return [];
    const base = { ...DEFAULT_FILTERS, mode: prefs.mode, min: prefs.min, max: prefs.max, beds: prefs.beds };
    return searchListings(data.listings, { ...base, q: areasToQuery(prefs.areas) }).slice(0, 3);
  }, [ready, prefs, data.listings]);
  const prefsQuery = prefs
    ? filtersToQuery({ ...DEFAULT_FILTERS, mode: prefs.mode, q: areasToQuery(prefs.areas), min: prefs.min, max: prefs.max, beds: prefs.beds })
    : "";

  return (
    <div className="pb-6">
      {/* ── Hero + search ─────────────────────────────── */}
      <section className="bg-brand-800 text-white">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:pt-14 sm:pb-32">
          <p className="text-sm font-medium text-brand-100">
            {currentUser ? `Welcome back, ${currentUser.name.split(" ")[0]}` : "Homes across Lagos"}
          </p>
          <h1 className="mt-2 max-w-2xl text-[32px] leading-[1.1] font-semibold tracking-tight sm:text-[48px]">
            Find a home to rent or buy in Lagos
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-brand-50/90 sm:text-[17px]">
            Search by area, estate or landmark. See the rent, fees and service charge up front — before you call anyone.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-24 max-w-6xl px-4 sm:-mt-24">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          className="rounded-3xl border border-sand-200 bg-white p-4 shadow-raised sm:p-6"
          role="search"
          aria-label="Search homes"
        >
          {/* Rent / Buy */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-sand-100 p-1" role="tablist" aria-label="Rent or buy">
            {(["rent", "sale"] as Purpose[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setBudget("");
                }}
                className={`min-h-11 rounded-xl text-[15px] font-semibold transition ${mode === m ? "bg-white text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-900"}`}
              >
                {m === "rent" ? "Rent a home" : "Buy a home"}
              </button>
            ))}
          </div>

          <label className="label mt-4" htmlFor="home-q">Where in Lagos?</label>
          <AreaSearchInput id="home-q" value={q} onChange={setQ} onPick={(v) => go(v)} placeholder="Area, estate or landmark — e.g. Yaba, VI" size="lg" />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="home-budget">Budget{mode === "rent" ? " / yr" : ""}</label>
              <select id="home-budget" className="field !px-2.5 text-sm" value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Any</option>
                {BUDGET_PRESETS[mode].map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="home-beds">Bedrooms</label>
              <select id="home-beds" className="field !px-2.5 text-sm" value={beds} onChange={(e) => setBeds(e.target.value)}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="home-type">Type</label>
              <select id="home-type" className="field !px-2.5 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Any</option>
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-xs font-medium text-ink-500">Must have</legend>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {KEY_AMENITY_FILTERS.map((a) => {
                const on = amen.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAmen((xs) => (on ? xs.filter((x) => x !== a.key) : [...xs, a.key]))}
                    className={`chip shrink-0 !min-h-9 !px-3 !text-[13px] ${on ? "chip-on" : ""}`}
                  >
                    {on && <CheckIcon size={13} />}
                    {a.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button type="submit" className="btn-primary mt-4 w-full !min-h-12 text-base">
            Search homes {mode === "rent" ? "to rent" : "to buy"}
          </button>

          <div className="mt-4 border-t border-sand-200 pt-4">
            <p className="text-xs font-medium text-ink-500">Popular searches</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {QUICK[mode].map((s) => (
                <Link key={s.label} href={quickHref(s.f)} className="link text-sm">
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </form>

        {/* Why this is different — three short, plain promises */}
        <ul className="mt-5 grid gap-x-6 gap-y-2 text-sm text-ink-700 sm:grid-cols-3">
          {[
            "Rent shown per year or per month — never guessed",
            "Agency, legal and service charges listed separately",
            "See when the lister last confirmed it's available",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckIcon size={16} className="mt-0.5 shrink-0 text-brand-600" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-12 sm:space-y-16 sm:pt-14">
        {currentUser && (prefs || mySearches.length > 0) && (
          <section className="space-y-6">
            {mySearches.length > 0 && (
              <Section title="Your saved searches">
                <div className="flex flex-wrap gap-2">
                  {mySearches.map((s) => (
                    <Link key={s.id} href={`/search?${s.query}`} className="chip text-ink-900">
                      {s.label}
                    </Link>
                  ))}
                </div>
              </Section>
            )}
            {prefs && (
              <Section
                title="Matches for you"
                description={`Based on what you told us: ${prefs.mode === "rent" ? "renting" : "buying"}${prefs.areas.length ? ` in ${areasToQuery(prefs.areas)}` : ""}.`}
                actions={<Link href={`/search?${prefsQuery}`} className="link shrink-0 text-sm">See all</Link>}
              >
                {forYou.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {forYou.map((l) => <ListingCard key={l.id} listing={l} layout="list" />)}
                  </div>
                ) : (
                  <EmptyState title="Nothing matches right now" body="Try widening your budget or adding nearby areas." />
                )}
              </Section>
            )}
          </section>
        )}

        {/* ── Featured homes ─────────────────────────── */}
        <Section
          title={mode === "rent" ? "Homes for rent, recently confirmed" : "Homes for sale, recently confirmed"}
          description="Listers confirmed these are still available in the last 30 days."
          actions={
            <Link href={`/search?mode=${mode}`} className="link shrink-0 text-sm">
              See all
            </Link>
          }
        >
          {!ready ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="card h-80 animate-pulse" />)}
            </div>
          ) : featured.length === 0 ? (
            <EmptyState title="No recently confirmed homes" body="Browse all listings instead." action={<Link href={`/search?mode=${mode}`} className="btn-secondary">Browse homes</Link>} />
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {featured.map((l) => (
                <div key={l.id} className="w-[84%] shrink-0 snap-start sm:w-auto">
                  <ListingCard listing={l} />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Popular areas ──────────────────────────── */}
        <Section title="Popular areas" description={`Homes ${mode === "rent" ? "for rent" : "for sale"} by neighbourhood.`}>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sand-200 bg-sand-200 shadow-card sm:grid-cols-3">
            {POPULAR.map((p) => (
              <Link
                key={p.q}
                href={`/search?mode=${mode}&q=${encodeURIComponent(p.q)}`}
                className="group bg-white px-4 py-4 transition hover:bg-brand-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink-900">{p.label}</span>
                  <span className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden>→</span>
                </div>
                <div className="mt-0.5 text-xs text-ink-500 sm:text-sm">{p.hint}</div>
                <div className="mt-2 text-xs font-medium text-brand-700">
                  {ready ? `${areaCounts[p.q]} ${areaCounts[p.q] === 1 ? "home" : "homes"}` : "…"}
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ── How it works ───────────────────────────── */}
        <Section title="How it works">
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 sm:block">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                <div className="sm:mt-3">
                  <h3 className="font-semibold text-ink-900">{s.title}</h3>
                  <p className="muted mt-1">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Checks ─────────────────────────────────── */}
        <section className="grid gap-6 border-t border-sand-200 pt-10 md:grid-cols-[1fr_2fr] md:gap-10">
          <div>
            <ShieldIcon className="text-brand-600" size={26} />
            <h2 className="mt-3 text-[22px] leading-snug font-semibold tracking-tight">Checks that say exactly what they mean</h2>
            <p className="muted mt-2">
              No vague “verified” tick. Each check has its own label and date, and we never claim a property&apos;s legal title has been confirmed.{" "}
              <Link href="/trust" className="link">How checks work</Link>
            </p>
          </div>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {[
              ["Identity", "Whether the person listing has submitted ID."],
              ["Agent licence", "Whether an agent has submitted their licence."],
              ["Owner authorization", "Whether an agent has the owner's permission."],
              ["Property documents", "Whether documents were submitted — never a title check."],
              ["Availability", "When the lister last confirmed it's available."],
              ["Legal title", "Not checked by IleLagos. Always use a property lawyer."],
            ].map(([t, d]) => (
              <div key={t} className={`border-l-2 pl-3 ${t === "Legal title" ? "border-red-200" : "border-brand-200"}`}>
                <dt className="font-semibold text-ink-900">{t}</dt>
                <dd className="text-ink-500">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── For owners and agents ─────────────────── */}
        <section className="grid overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card sm:grid-cols-2">
          <Link href="/dashboard/owner" className="group flex items-center justify-between gap-4 p-5 transition hover:bg-sand-50 sm:p-6">
            <span>
              <span className="section-title block">Own a home? List it yourself</span>
              <span className="muted mt-0.5 block">Create, pause and update listings, and keep availability fresh.</span>
            </span>
            <span className="text-ink-300 group-hover:text-brand-600" aria-hidden>→</span>
          </Link>
          <Link href="/dashboard/agent" className="group flex items-center justify-between gap-4 border-t border-sand-200 p-5 transition hover:bg-sand-50 sm:border-t-0 sm:border-l sm:p-6">
            <span>
              <span className="section-title block">Agents: manage authorized listings</span>
              <span className="muted mt-0.5 block">Track inquiries, viewing requests and your profile in one place.</span>
            </span>
            <span className="text-ink-300 group-hover:text-brand-600" aria-hidden>→</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
