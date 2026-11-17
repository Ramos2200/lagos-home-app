"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AreaSearchInput } from "@/components/AreaSearchInput";
import { CheckIcon, ShieldIcon } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { ListingPhoto } from "@/components/ListingPhoto";
import { AREA_IMAGES, HERO_IMAGE } from "@/lib/images";
import { areaHref } from "@/lib/area-guide";
import { EmptyState, Section } from "@/components/ui";
import { areasToQuery } from "@/lib/areas";
import { BUDGET_PRESETS, KEY_AMENITY_FILTERS, PROPERTY_TYPES } from "@/lib/constants";
import { DEFAULT_FILTERS, filtersToQuery, searchListings, type SearchFilters } from "@/lib/listing-utils";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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

  const tabCls = (on: boolean) =>
    `relative pb-2 text-[15px] font-bold transition ${on ? "text-white after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-white" : "text-white/75 hover:text-white"}`;

  return (
    <div className="pb-10">
      {/* ── Hero: one big search ───────────────────────── */}
      <section className="relative isolate overflow-hidden bg-ink-900 text-white">
        <HeroBackdrop />
        <div className="relative mx-auto flex min-h-[460px] max-w-7xl flex-col justify-center px-4 py-14 sm:min-h-[540px] lg:px-6">
          <h1 className="max-w-3xl text-[34px] leading-[1.05] font-extrabold tracking-tight sm:text-[56px]">
            {currentUser ? t("home.welcome", { name: currentUser.name.split(" ")[0] }) : t("home.find")}
          </h1>
          <p className="mt-3 max-w-xl text-[16px] text-white/85 sm:text-[18px]">
            {t("home.sub")}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
            className="mt-7 w-full max-w-2xl"
            role="search"
            aria-label="Search homes"
          >
            <div className="flex gap-6 border-b border-white/25" role="tablist" aria-label="Rent or buy">
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
                  className={tabCls(mode === m)}
                >
                  {m === "rent" ? t("nav.rent") : t("nav.buy")}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-white p-1.5 text-ink-900 shadow-float">
              <div className="flex items-stretch gap-1.5">
                <div className="min-w-0 flex-1">
                  <label htmlFor="home-q" className="sr-only">Where in Lagos?</label>
                  <AreaSearchInput id="home-q" value={q} onChange={setQ} onPick={(v) => go(v)} placeholder={t("home.placeholder")} size="lg" />
                </div>
                <button type="submit" className="btn-primary !min-h-12 shrink-0 !px-4 sm:!px-6" aria-label={`Search homes ${mode === "rent" ? "to rent" : "to buy"}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <span className="hidden sm:inline">{t("home.search")}</span>
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                <select className="field !min-h-10 !border-sand-200 !px-2.5 text-sm" value={budget} onChange={(e) => setBudget(e.target.value)} aria-label={`Budget${mode === "rent" ? " per year" : ""}`}>
                  <option value="">{mode === "rent" ? t("home.budget") : t("home.price")}</option>
                  {BUDGET_PRESETS[mode].map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
                </select>
                <select className="field !min-h-10 !border-sand-200 !px-2.5 text-sm" value={beds} onChange={(e) => setBeds(e.target.value)} aria-label="Bedrooms">
                  <option value="">{t("home.beds")}</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ beds</option>)}
                </select>
                <select className="field !min-h-10 !border-sand-200 !px-2.5 text-sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Home type">
                  <option value="">{t("home.type")}</option>
                  {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Must have">
              {KEY_AMENITY_FILTERS.slice(0, 4).map((a) => {
                const on = amen.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAmen((xs) => (on ? xs.filter((x) => x !== a.key) : [...xs, a.key]))}
                    className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold backdrop-blur transition ${on ? "border-white bg-white text-ink-900" : "border-white/40 bg-white/10 text-white hover:bg-white/20"}`}
                  >
                    {on && <CheckIcon size={12} />} {a.label}
                  </button>
                );
              })}
            </div>
          </form>

          <p className="mt-5 text-sm text-white/80">
            Popular:{" "}
            {QUICK[mode].slice(0, 4).map((s, i) => (
              <span key={s.label}>
                <Link href={quickHref(s.f)} className="font-semibold text-white underline-offset-2 hover:underline">{s.label}</Link>
                {i < 3 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 pt-12 lg:px-6">
        {currentUser && (prefs || mySearches.length > 0) && (
          <section className="space-y-6">
            {mySearches.length > 0 && (
              <Section title="Your saved searches">
                <div className="flex flex-wrap gap-2">
                  {mySearches.map((s) => (
                    <Link key={s.id} href={`/search?${s.query}`} className="pill">{s.label}</Link>
                  ))}
                </div>
              </Section>
            )}
            {prefs && (
              <Section
                title="Homes for you"
                description={`Based on what you told us: ${prefs.mode === "rent" ? "renting" : "buying"}${prefs.areas.length ? ` in ${areasToQuery(prefs.areas)}` : ""}.`}
                actions={<Link href={`/search?${prefsQuery}`} className="link shrink-0 text-sm">See all</Link>}
              >
                {forYou.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {forYou.map((l) => <ListingCard key={l.id} listing={l} />)}
                  </div>
                ) : (
                  <EmptyState title="Nothing matches right now" body="Try widening your budget or adding nearby areas." />
                )}
              </Section>
            )}
          </section>
        )}

        {/* ── Featured homes ─────────────────────────── */}
        <section aria-labelledby="featured-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="featured-title" className="text-[24px] font-extrabold tracking-tight sm:text-[28px]">
                {mode === "rent" ? "Homes for rent in Lagos" : "Homes for sale in Lagos"}
              </h2>
              <p className="muted mt-1">Recently confirmed as still available by the lister.</p>
            </div>
            <Link href={`/search?mode=${mode}`} className="btn-secondary btn-sm shrink-0">View all</Link>
          </div>
          <div className="mt-5">
            {!ready ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => <div key={i} className="card h-80 animate-pulse bg-sand-50" />)}
              </div>
            ) : featured.length === 0 ? (
              <EmptyState title="No recently confirmed homes" body="Browse all listings instead." action={<Link href={`/search?mode=${mode}`} className="btn-secondary">Browse homes</Link>} />
            ) : (
              <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
                {featured.map((l) => (
                  <div key={l.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
                    <ListingCard listing={l} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Rent / Buy / List ──────────────────────── */}
        <section aria-label="What would you like to do?" className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            art={<ArtKeys />}
            title="Rent a home"
            body="See rent per year or month, plus every fee listed separately, so you know the real move-in cost."
            href="/search?mode=rent"
            cta="Find rentals"
          />
          <FeatureCard
            art={<ArtHouse />}
            title="Buy a home"
            body="Compare asking prices, fees and checks side by side. We never claim a title is legally verified."
            href="/search?mode=sale"
            cta="Browse homes for sale"
          />
          <FeatureCard
            art={<ArtSign />}
            title="List your home"
            body="Owners and agents can list in four short steps, keep availability up to date and reply to viewings."
            href={currentUser?.roles.includes("agent") ? "/dashboard/agent" : "/dashboard/owner"}
            cta="Start listing"
          />
        </section>

        {/* ── Explore areas ──────────────────────────── */}
        <section aria-labelledby="areas-title">
          <h2 id="areas-title" className="text-[24px] font-extrabold tracking-tight sm:text-[28px]">Explore Lagos neighbourhoods</h2>
          <p className="muted mt-1">
            Area guides with typical asking prices, what to ask about and the homes listed. <Link href="/areas" className="link">All area guides</Link>
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {POPULAR.map((p, i) => (
              <Link
                key={p.q}
                href={areaHref(p.q)}
                className="group relative block aspect-[4/3] overflow-hidden rounded-xl sm:aspect-[16/10]"
              >
                {AREA_IMAGES[p.q] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={AREA_IMAGES[p.q]} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <ListingPhoto seed={i * 3 + 2} type={i % 2 ? "detached" : "flat"} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105" showTag={false} />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                  <span className="block text-[17px] font-extrabold sm:text-xl">{p.label}</span>
                  <span className="block text-xs text-white/85 sm:text-sm">
                    {ready ? `${areaCounts[p.q]} ${areaCounts[p.q] === 1 ? "home" : "homes"}` : "…"} · {p.hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────── */}
        <section aria-labelledby="how-title" className="rounded-2xl bg-sand-50 p-6 sm:p-10">
          <h2 id="how-title" className="text-[24px] font-extrabold tracking-tight">How IleLagos works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-bold text-ink-900">{s.title}</h3>
                <p className="muted mt-1">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Checks ─────────────────────────────────── */}
        <section className="grid gap-6 md:grid-cols-[1fr_2fr] md:gap-10">
          <div>
            <ShieldIcon className="text-brand-600" size={28} />
            <h2 className="mt-3 text-[24px] leading-snug font-extrabold tracking-tight">Checks that say exactly what they mean</h2>
            <p className="muted mt-2">
              No vague “verified” tick. Each check has its own label and date, and we never claim a property&apos;s legal title is confirmed.{" "}
              <Link href="/trust" className="link">How checks work</Link>
            </p>
          </div>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {[
              ["Identity checked", "Whether the person listing has had ID checked."],
              ["Agent licence checked", "Whether an agent's licence has been checked."],
              ["Owner authorization reviewed", "Whether an agent has the owner's permission."],
              ["Availability confirmed", "When the lister last confirmed it's available."],
              ["Report a problem", "Flag a suspected scam, duplicate, wrong price or a home that's gone."],
              ["Legal title", "Not verified by IleLagos. Always use a property lawyer."],
            ].map(([t, d]) => (
              <div key={t} className={`border-l-[3px] pl-3 ${t === "Legal title" ? "border-red-300" : "border-brand-200"}`}>
                <dt className="font-bold text-ink-900">{t}</dt>
                <dd className="text-ink-500">{d}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

/* ── Hero background: a real photo when HERO_IMAGE is set, otherwise a dusk skyline ── */
function HeroBackdrop() {
  if (HERO_IMAGE) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/40 to-black/10" aria-hidden />
      </>
    );
  }
  return (
    <svg className="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b2f2a" />
          <stop offset="0.55" stopColor="#0e5a47" />
          <stop offset="1" stopColor="#e7a96a" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b3d36" />
          <stop offset="1" stopColor="#06221e" />
        </linearGradient>
      </defs>
      <rect width="1440" height="560" fill="url(#sky)" />
      <circle cx="1130" cy="400" r="70" fill="#f4c27a" opacity="0.55" />
      {/* distant towers */}
      <g fill="#0a2f29" opacity="0.65">
        {[[620, 300, 40], [670, 260, 34], [712, 320, 28], [760, 240, 46], [815, 290, 30], [860, 210, 38], [905, 280, 34], [950, 320, 26], [990, 250, 40], [1040, 300, 30]].map(([x, y, w], i) => (
          <rect key={i} x={x} y={y} width={w} height={480 - y} />
        ))}
      </g>
      {/* cable-stayed bridge */}
      <g stroke="#0a2622" strokeWidth="3" fill="none" opacity="0.9">
        <path d="M150 470 L1440 470" strokeWidth="8" />
        <path d="M430 470 L430 330" strokeWidth="10" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <path d={`M430 ${338 + i * 6} L${300 - i * 30} 470`} />
            <path d={`M430 ${338 + i * 6} L${560 + i * 30} 470`} />
          </g>
        ))}
      </g>
      {/* near skyline */}
      <g fill="#071d1a">
        {[[1100, 350, 60], [1170, 300, 48], [1225, 380, 70], [1300, 330, 54], [1360, 280, 80], [0, 390, 70], [75, 350, 50], [130, 410, 60]].map(([x, y, w], i) => (
          <rect key={i} x={x} y={y} width={w} height={490 - y} />
        ))}
      </g>
      <rect y="480" width="1440" height="80" fill="url(#water)" />
      <rect width="1440" height="560" fill="black" opacity="0.18" />
    </svg>
  );
}

function FeatureCard({ art, title, body, href, cta }: { art: React.ReactNode; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-sand-200 bg-white px-6 pt-8 pb-7 text-center transition hover:shadow-raised">
      <div className="h-28" aria-hidden>{art}</div>
      <h3 className="mt-4 text-[22px] font-extrabold tracking-tight">{title}</h3>
      <p className="mt-2 text-[15px] text-ink-500">{body}</p>
      <Link href={href} className="btn-secondary mt-6">{cta}</Link>
    </div>
  );
}

function ArtKeys() {
  return (
    <svg width="120" height="112" viewBox="0 0 120 112">
      <circle cx="60" cy="56" r="52" fill="var(--color-brand-50)" />
      <circle cx="46" cy="50" r="18" fill="none" stroke="var(--color-brand-600)" strokeWidth="7" />
      <path d="M60 62 L90 92 M78 80 L86 72 M84 86 L92 78" stroke="var(--color-brand-600)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="46" cy="50" r="5" fill="#f4c27a" />
    </svg>
  );
}

function ArtHouse() {
  return (
    <svg width="120" height="112" viewBox="0 0 120 112">
      <circle cx="60" cy="56" r="52" fill="var(--color-brand-50)" />
      <path d="M26 58 L60 30 L94 58" fill="none" stroke="var(--color-brand-600)" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="35" y="56" width="50" height="34" rx="3" fill="white" stroke="var(--color-brand-600)" strokeWidth="6" />
      <rect x="54" y="68" width="12" height="22" fill="#f4c27a" />
    </svg>
  );
}

function ArtSign() {
  return (
    <svg width="120" height="112" viewBox="0 0 120 112">
      <circle cx="60" cy="56" r="52" fill="var(--color-brand-50)" />
      <path d="M38 98 L38 26 M38 32 L88 32" stroke="var(--color-brand-600)" strokeWidth="7" strokeLinecap="round" />
      <rect x="48" y="38" width="42" height="28" rx="3" fill="white" stroke="var(--color-brand-600)" strokeWidth="5" />
      <path d="M56 52 h26" stroke="#f4c27a" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
