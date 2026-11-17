"use client";

import { PhotoUploader } from "./PhotoUploader";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { AMENITIES, AMENITY_LABEL, LAGOS_AREAS, OCCUPANCY_LABEL, PROPERTY_TYPES, PROPERTY_TYPE_LABEL, STATUS_OPTIONS, statusLabel } from "@/lib/constants";
import { FREQUENCY_LABEL, formatDate, naira, todayISO } from "@/lib/format";
import type { Listing, ListingStatus, Occupancy, OtherCost, PropertyType, Purpose, RentFrequency } from "@/lib/types";
import { costBreakdown, isVideoLink } from "@/lib/listing-utils";
import { CostBreakdownView } from "./CostBreakdownView";
import { CheckIcon } from "./Icons";
import { MoneyField } from "./MoneyField";

export interface ListingFormValues {
  title: string;
  purpose: Purpose;
  propertyType: PropertyType;
  area: string;
  estate: string;
  landmark: string;
  streetHint: string;
  price: string;
  rentFrequency: RentFrequency;
  agencyFee: string;
  legalFee: string;
  cautionDeposit: string;
  serviceCharge: string;
  serviceChargeFrequency: RentFrequency;
  other: { label: string; amount: string; recurring?: boolean; frequency?: RentFrequency }[];
  bedrooms: string;
  bathrooms: string;
  toilets: string;
  sizeSqm: string;
  amenities: string[];
  water: string;
  power: string;
  security: string;
  parking: string;
  roadAccess: string;
  flooding: string;
  nearby: string;
  status: ListingStatus;
  occupancy: Occupancy;
  availableFrom: string;
  description: string;
  videoUrl: string;
  /** Uploaded photos (data URLs). Saved separately from the listing — see lib/photos. */
  photos: string[];
  ownerDisplayName: string;
  priceNote: string;
  ownershipConfirmed: boolean;
  authorizationSubmitted: boolean;
}

export function valuesFromListing(l?: Listing): ListingFormValues {
  const s = (n?: number) => (n !== undefined && n !== null ? String(n) : "");
  return {
    title: l?.title ?? "",
    purpose: l?.purpose ?? "rent",
    propertyType: l?.propertyType ?? "flat",
    area: l?.area ?? "",
    estate: l?.estate ?? "",
    landmark: l?.landmark ?? "",
    streetHint: l?.streetHint ?? "",
    price: s(l?.price),
    rentFrequency: l?.rentFrequency ?? "annual",
    agencyFee: s(l?.costs.agencyFee),
    legalFee: s(l?.costs.legalFee),
    cautionDeposit: s(l?.costs.cautionDeposit),
    serviceCharge: s(l?.costs.serviceCharge),
    serviceChargeFrequency: l?.costs.serviceChargeFrequency ?? "annual",
    other: (l?.costs.other ?? []).map((o) => ({ label: o.label, amount: String(o.amount), recurring: o.recurring, frequency: o.frequency })),
    bedrooms: s(l?.bedrooms ?? 2),
    bathrooms: s(l?.bathrooms ?? 2),
    toilets: s(l?.toilets ?? 2),
    sizeSqm: s(l?.sizeSqm),
    amenities: l?.amenities ?? [],
    water: l?.details.water ?? "",
    power: l?.details.power ?? "",
    security: l?.details.security ?? "",
    parking: l?.details.parking ?? "",
    roadAccess: l?.details.roadAccess ?? "",
    flooding: l?.details.flooding ?? "",
    nearby: l?.details.nearby ?? "",
    status: l?.status ?? "available",
    occupancy: l?.occupancy ?? "vacant",
    availableFrom: l?.availableFrom ?? todayISO(),
    description: l?.description ?? "",
    videoUrl: l?.videoUrl ?? "",
    photos: [],
    ownerDisplayName: l?.ownerDisplayName ?? "",
    priceNote: "",
    ownershipConfirmed: !!l,
    authorizationSubmitted: l ? l.checks.ownerAuthorization.state !== "not_started" : false,
  };
}

const num = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && v.trim() !== "" ? n : undefined;
};

/** Converts form values to listing fields (without ids/history, which the store manages). */
export function listingFieldsFromValues(v: ListingFormValues) {
  const other: OtherCost[] = v.other
    .filter((o) => o.label.trim() && num(o.amount))
    .map((o) => ({ label: o.label.trim(), amount: num(o.amount)!, ...(o.recurring ? { recurring: true, frequency: o.frequency ?? "annual" } : {}) }));
  return {
    title: v.title.trim(),
    purpose: v.purpose,
    propertyType: v.propertyType,
    area: v.area,
    estate: v.estate.trim() || undefined,
    landmark: v.landmark.trim() || undefined,
    streetHint: v.streetHint.trim() || undefined,
    price: num(v.price) ?? 0,
    rentFrequency: v.purpose === "rent" ? v.rentFrequency : undefined,
    costs: {
      agencyFee: num(v.agencyFee),
      legalFee: num(v.legalFee),
      cautionDeposit: v.purpose === "rent" ? num(v.cautionDeposit) : undefined,
      serviceCharge: num(v.serviceCharge),
      serviceChargeFrequency: num(v.serviceCharge) ? v.serviceChargeFrequency : undefined,
      other: other.length ? other : undefined,
    },
    bedrooms: num(v.bedrooms) ?? 0,
    bathrooms: num(v.bathrooms) ?? 0,
    toilets: num(v.toilets) ?? 0,
    sizeSqm: num(v.sizeSqm),
    amenities: v.amenities,
    details: { water: v.water.trim(), power: v.power.trim(), security: v.security.trim(), parking: v.parking.trim(), roadAccess: v.roadAccess.trim(), flooding: v.flooding.trim(), nearby: v.nearby.trim() },
    status: v.status,
    occupancy: v.occupancy,
    availableFrom: v.availableFrom,
    description: v.description.trim(),
    videoUrl: v.videoUrl.trim() || undefined,
    ownerDisplayName: v.ownerDisplayName.trim() || undefined,
  };
}

const STEPS = ["Basics", "Price", "Details", "Review"] as const;

/** A plain-language heading and one-line explanation for each step. */
const STEP_INTRO: { title: string; body: (p: Purpose, by: "owner" | "agent") => string }[] = [
  { title: "About the home", body: () => "What kind of home it is and where it is. You can change any of this later." },
  {
    title: "Price and fees",
    body: (p) =>
      p === "rent"
        ? "Enter the rent and how often it's paid, then each fee on its own line. Renters see every amount separately."
        : "Enter the asking price, then any agency or legal fees on their own lines.",
  },
  { title: "Availability and details", body: () => "When it's available, plus water, power, security and amenities — the things people ask about first." },
  {
    title: "Check and publish",
    body: (_p, by) =>
      by === "owner"
        ? "Look over your listing. When you publish, it appears in search straight away and you can pause it at any time."
        : "Look over the listing and confirm you're authorized to represent it. It appears in search when you publish.",
  },
];

interface Draft {
  savedAt: string;
  step: number;
  values: ListingFormValues;
}

export function ListingForm({
  initial,
  mode,
  listedBy,
  originalPrice,
  draftKey,
  onSubmit,
  onCancel,
}: {
  initial: ListingFormValues;
  mode: "create" | "edit";
  listedBy: "owner" | "agent";
  originalPrice?: number;
  /** When set (create mode), unfinished work is kept in this browser under this key. */
  draftKey?: string;
  onSubmit: (v: ListingFormValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<ListingFormValues>(initial);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(mode === "edit" ? STEPS.length - 1 : 0);
  /** Field id → message. Shown next to the field and in a summary at the top of the step. */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const loadedDraft = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof ListingFormValues>(k: K, val: ListingFormValues[K]) => setV((x) => ({ ...x, [k]: val }));

  // Restore a saved draft once.
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as Draft;
        /* eslint-disable react-hooks/set-state-in-effect */
        setV({ ...initial, ...d.values, photos: initial.photos });
        setStep(d.step);
        setReached(d.step);
        setRestored(d.savedAt);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {}
    loadedDraft.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Keep the draft up to date.
  useEffect(() => {
    if (!draftKey || !loadedDraft.current) return;
    // Photos are left out of drafts: they are large and would crowd out other saved data.
    const blank = JSON.stringify({ ...v, photos: [] }) === JSON.stringify({ ...initial, photos: [] });
    try {
      if (blank) localStorage.removeItem(draftKey);
      else localStorage.setItem(draftKey, JSON.stringify({ savedAt: todayISO(), step, values: { ...v, photos: [] } } satisfies Draft));
    } catch {}
  }, [v, step, draftKey, initial]);

  const priceNum = num(v.price);
  const priceChanged = mode === "edit" && originalPrice !== undefined && priceNum !== undefined && priceNum !== originalPrice;

  const stepErrors = (i: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!v.title.trim()) e.title = "Add a short title, for example “2-bedroom flat in a gated close”.";
      if (!v.area) e.area = "Choose the area the home is in.";
    }
    if (i === 1 && (!priceNum || priceNum <= 0)) {
      e.price = v.purpose === "rent" ? "Enter the rent in naira, for example 2,500,000." : "Enter the asking price in naira, for example 95,000,000.";
    }
    if (i === 2 && !v.availableFrom) e.avail = "Choose the date the home is available from.";
    if (i === 2 && v.videoUrl.trim() && !isVideoLink(v.videoUrl)) e.video = "Enter a full link starting with https:// (for example a YouTube or Instagram video), or leave it empty.";
    if (i === 3) {
      if (mode === "create" && listedBy === "owner" && !v.ownershipConfirmed) e.ownership = "Tick the box to confirm you own this home or are entitled to list it.";
      if (listedBy === "agent" && !v.ownerDisplayName.trim()) e.owner = "Add the owner's name as it should appear, or write “Private owner”.";
    }
    return e;
  };

  const showErrors = (e: Record<string, string>) => {
    setErrors(e);
    // Move keyboard and screen-reader focus to the summary so the problem is announced.
    setTimeout(() => summaryRef.current?.focus(), 0);
  };

  const goTo = (i: number) => {
    setErrors({});
    setStep(i);
    setReached((r) => Math.max(r, i));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = () => {
    const e = stepErrors(step);
    if (Object.keys(e).length) showErrors(e);
    else goTo(step + 1);
  };

  const submit = () => {
    for (let i = 0; i < STEPS.length; i++) {
      const e = stepErrors(i);
      if (Object.keys(e).length) {
        setStep(i);
        showErrors(e);
        return;
      }
    }
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    }
    onSubmit(v);
  };

  const discardDraft = () => {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    }
    setV(initial);
    setStep(0);
    setReached(0);
    setRestored(null);
  };

  // Same rules as the listing page: only entered amounts count towards the total.
  const total = costBreakdown({ purpose: v.purpose, price: priceNum ?? 0, rentFrequency: v.rentFrequency, costs: listingFieldsFromValues(v).costs }).firstPayment;

  return (
    <div ref={topRef} className="scroll-mt-20">
      {restored && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          <span className="flex-1">We restored your unfinished listing from {formatDate(restored)}.</span>
          <button type="button" className="font-semibold underline" onClick={discardDraft}>Start over</button>
        </div>
      )}

      {/* Stepper */}
      <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label="Steps">
        {STEPS.map((s, i) => {
          const can = i <= reached;
          const current = i === step;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={!can}
                onClick={() => goTo(i)}
                aria-current={current ? "step" : undefined}
                className="w-full text-left disabled:cursor-not-allowed"
              >
                <span className={`block h-1.5 rounded-full ${i < step ? "bg-brand-600" : current ? "bg-brand-500" : can ? "bg-brand-200" : "bg-sand-300"}`} />
                <span className={`mt-1.5 block truncate text-xs font-semibold ${current ? "text-brand-700" : can ? "text-ink-700" : "text-ink-500"}`}>
                  {i + 1}. {s}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) next();
          else submit();
        }}
        className="space-y-5"
        noValidate
      >
        <div>
          <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900">{STEP_INTRO[step].title}</h2>
          <p className="muted mt-1">{STEP_INTRO[step].body(v.purpose, listedBy)}</p>
        </div>

        {Object.keys(errors).length > 0 && (
          <div ref={summaryRef} tabIndex={-1} className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 focus:outline-none" role="alert" aria-labelledby="err-title">
            <p id="err-title" className="font-semibold">
              {Object.keys(errors).length === 1 ? "One thing needs fixing before you continue:" : `${Object.keys(errors).length} things need fixing before you continue:`}
            </p>
            <ul className="mt-1.5 space-y-1">
              {Object.entries(errors).map(([id, msg]) => (
                <li key={id}>
                  <button type="button" className="text-left underline underline-offset-2 hover:no-underline" onClick={() => document.getElementById(id)?.focus()}>
                    {msg}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 0 && (
          <>
            <Section title="What are you listing?">
              <div className="grid grid-cols-2 gap-2">
                {(["rent", "sale"] as Purpose[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={v.purpose === p}
                    onClick={() => setV((x) => ({ ...x, purpose: p, status: x.status === "rented" || x.status === "sold" ? "available" : x.status }))}
                    className={`tile ${v.purpose === p ? "tile-on" : ""}`}
                  >
                    {p === "rent" ? "For rent" : "For sale"}
                  </button>
                ))}
              </div>
              <Field label="Listing title" id="title" required error={errors.title} hint="Keep it short: bedrooms, type and one stand-out feature.">
                <input id="title" className="field" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 2-bedroom flat in a gated close" />
              </Field>
              <Field label="Property type" id="ptype">
                <select id="ptype" className="field" value={v.propertyType} onChange={(e) => set("propertyType", e.target.value as PropertyType)}>
                  {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Stepper label="Bedrooms" value={v.bedrooms} onChange={(x) => set("bedrooms", x)} />
                <Stepper label="Bathrooms" value={v.bathrooms} onChange={(x) => set("bathrooms", x)} />
                <Stepper label="Toilets" value={v.toilets} onChange={(x) => set("toilets", x)} />
              </div>
              <Field label="Size (m²)" id="size" optional>
                <input id="size" inputMode="numeric" className="field" value={v.sizeSqm} onChange={(e) => set("sizeSqm", e.target.value.replace(/\D/g, ""))} />
              </Field>
            </Section>
            <Section title="Where is it?">
              <Field label="Area" id="area" required error={errors.area}>
                <select id="area" className="field" value={v.area} onChange={(e) => set("area", e.target.value)}>
                  <option value="">Choose an area…</option>
                  {LAGOS_AREAS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Estate" id="estate" optional><input id="estate" className="field" value={v.estate} onChange={(e) => set("estate", e.target.value)} /></Field>
                <Field label="Nearby landmark" id="landmark" optional><input id="landmark" className="field" value={v.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="e.g. Near Ikeja City Mall" /></Field>
              </div>
              <Field label="Street hint" id="street" optional hint="Don't enter the house number — share it after a viewing is arranged.">
                <input id="street" className="field" value={v.streetHint} onChange={(e) => set("streetHint", e.target.value)} placeholder="e.g. Off Admiralty Way" />
              </Field>
            </Section>
          </>
        )}

        {step === 1 && (
          <>
            <Section title={v.purpose === "rent" ? "Rent" : "Asking price"}>
              <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
                <Field
                  label={v.purpose === "rent" ? `Rent amount (${v.rentFrequency === "monthly" ? "per month" : v.rentFrequency === "quarterly" ? "per quarter" : "per year"})` : "Asking price"}
                  id="price"
                  required
                  error={errors.price}
                  hint={v.purpose === "rent" ? "The amount for ONE payment period. Change the period on the right." : undefined}
                >
                  <MoneyField id="price" value={v.price} onChange={(x) => set("price", x)} />
                </Field>
                {v.purpose === "rent" && (
                  <Field label="How often is rent paid?" id="freq" required>
                    <select id="freq" className="field" value={v.rentFrequency} onChange={(e) => set("rentFrequency", e.target.value as RentFrequency)}>
                      <option value="annual">Every year (annual)</option>
                      <option value="quarterly">Every 3 months (quarterly)</option>
                      <option value="monthly">Every month (monthly)</option>
                    </select>
                  </Field>
                )}
              </div>
              {priceChanged && (
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-sm text-amber-900">
                    Asking price change: {naira(originalPrice!)} → <b>{naira(priceNum!)}</b>. This is added to the dated “Asking price history” on the listing.
                  </p>
                  <input className="field mt-2" placeholder="Optional note, e.g. Reduced for quick let" value={v.priceNote} onChange={(e) => set("priceNote", e.target.value)} aria-label="Note about the price change" />
                </div>
              )}
            </Section>

            <Section
              title="Fees and charges"
              description="Leave a box empty if you don't know the amount — renters will see “Not provided”. Enter 0 if there is no fee."
            >
              <p className="eyebrow !text-ink-500">Paid once</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {v.purpose === "rent" && (
                  <Field label="Caution deposit" id="caution" optional hint="Usually refunded when the tenant moves out.">
                    <MoneyField id="caution" value={v.cautionDeposit} onChange={(x) => set("cautionDeposit", x)} placeholder="Not provided" />
                  </Field>
                )}
                <Field label="Agency fee" id="agency" optional>
                  <MoneyField id="agency" value={v.agencyFee} onChange={(x) => set("agencyFee", x)} placeholder="Not provided" />
                </Field>
                <Field label={v.purpose === "rent" ? "Legal / agreement fee" : "Legal fee"} id="legal" optional>
                  <MoneyField id="legal" value={v.legalFee} onChange={(x) => set("legalFee", x)} placeholder="Not provided" />
                </Field>
              </div>

              <p className="eyebrow mt-2 !text-ink-500">Paid every period</p>
              <div className="grid grid-cols-[1fr_9rem] gap-2 sm:max-w-md">
                <Field label="Service charge" id="svc" optional>
                  <MoneyField id="svc" value={v.serviceCharge} onChange={(x) => set("serviceCharge", x)} placeholder="Not provided" />
                </Field>
                <Field label="Paid" id="svcf">
                  <select id="svcf" className="field" value={v.serviceChargeFrequency} onChange={(e) => set("serviceChargeFrequency", e.target.value as RentFrequency)}>
                    <option value="annual">per year</option>
                    <option value="quarterly">per quarter</option>
                    <option value="monthly">per month</option>
                  </select>
                </Field>
              </div>

              <div className="mt-2">
                <span className="label">Other stated costs <span className="font-normal text-ink-500">(optional)</span></span>
                <p className="-mt-1 mb-2 text-xs text-ink-500">For example an estate levy, diesel levy or meter fee.</p>
                <div className="space-y-3">
                  {v.other.map((o, i) => {
                    const upd = (patch: Partial<(typeof v.other)[number]>) => set("other", v.other.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <div key={i} className="grid gap-2 rounded-xl border border-sand-200 p-3 sm:grid-cols-[1fr_9rem_10rem_auto] sm:items-end sm:border-0 sm:p-0">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor={`oc-label-${i}`}>What is it?</label>
                          <input id={`oc-label-${i}`} className="field" placeholder="e.g. Estate levy" value={o.label} onChange={(e) => upd({ label: e.target.value })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor={`oc-amt-${i}`}>Amount</label>
                          <MoneyField id={`oc-amt-${i}`} value={o.amount} onChange={(amt) => upd({ amount: amt })} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor={`oc-when-${i}`}>How often?</label>
                          <select id={`oc-when-${i}`} className="field" value={o.recurring ? o.frequency ?? "annual" : "once"} onChange={(e) => upd(e.target.value === "once" ? { recurring: false, frequency: undefined } : { recurring: true, frequency: e.target.value as RentFrequency })}>
                            <option value="once">Once (move-in)</option>
                            <option value="annual">Per year</option>
                            <option value="quarterly">Per quarter</option>
                            <option value="monthly">Per month</option>
                          </select>
                        </div>
                        <button type="button" className="btn-ghost btn-sm justify-self-start" aria-label={`Remove ${o.label || "this cost"}`} onClick={() => set("other", v.other.filter((_, j) => j !== i))}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" className="link text-sm" onClick={() => set("other", [...v.other, { label: "", amount: "" }])}>
                    + Add another cost
                  </button>
                </div>
              </div>
            </Section>

            <Section title={v.purpose === "rent" ? "What renters will see" : "What buyers will see"}>
              <CostBreakdownView listing={{ purpose: v.purpose, price: priceNum ?? 0, rentFrequency: v.rentFrequency, costs: listingFieldsFromValues(v).costs }} preview />
            </Section>
          </>
        )}

        {step === 2 && (
          <>
            <Section title="Availability & occupancy" description="Occupancy is separate from availability — an owner-occupied home can still be for sale.">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Is it available?" id="status">
                  <select id="status" className="field" value={v.status} onChange={(e) => set("status", e.target.value as ListingStatus)}>
                    {STATUS_OPTIONS[v.purpose].map((s) => <option key={s} value={s}>{statusLabel(s, v.purpose)}</option>)}
                  </select>
                </Field>
                <Field label="Who lives there now?" id="occ">
                  <select id="occ" className="field" value={v.occupancy} onChange={(e) => set("occupancy", e.target.value as Occupancy)}>
                    {(Object.keys(OCCUPANCY_LABEL) as Occupancy[]).map((o) => <option key={o} value={o}>{OCCUPANCY_LABEL[o]}</option>)}
                  </select>
                </Field>
                <Field label="Available from" id="avail" required error={errors.avail}>
                  <input id="avail" type="date" className="field" value={v.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />
                </Field>
              </div>
              {(v.status === "rented" || v.status === "sold" || v.status === "paused") && (
                <p className="text-xs text-ink-500">This status hides the listing from search results.</p>
              )}
            </Section>
            <Section title="Neighbourhood: water, power, security, flooding & access">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Water" id="water"><input id="water" className="field" value={v.water} onChange={(e) => set("water", e.target.value)} placeholder="e.g. Borehole with treatment" /></Field>
                <Field label="Power" id="power"><input id="power" className="field" value={v.power} onChange={(e) => set("power", e.target.value)} placeholder="e.g. Grid + estate generator" /></Field>
                <Field label="Security" id="security"><input id="security" className="field" value={v.security} onChange={(e) => set("security", e.target.value)} placeholder="e.g. Gated, 24-hr guards" /></Field>
                <Field label="Parking" id="parking"><input id="parking" className="field" value={v.parking} onChange={(e) => set("parking", e.target.value)} placeholder="e.g. 2 cars" /></Field>
              </div>
              <Field label="Road access" id="road"><input id="road" className="field" value={v.roadAccess} onChange={(e) => set("roadAccess", e.target.value)} placeholder="e.g. Tarred close, 5 min to expressway" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Flooding" id="flooding" hint="Be honest — renters and buyers will ask.">
                  <input id="flooding" className="field" value={v.flooding} onChange={(e) => set("flooding", e.target.value)} placeholder="e.g. Street floods for a few hours in heavy rain" />
                </Field>
                <Field label="Nearby" id="nearby">
                  <input id="nearby" className="field" value={v.nearby} onChange={(e) => set("nearby", e.target.value)} placeholder="e.g. Bus stop 3 min walk, schools, market" />
                </Field>
              </div>
              <div>
                <span className="label">Amenities</span>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((a) => {
                    const on = v.amenities.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("amenities", on ? v.amenities.filter((x) => x !== a.key) : [...v.amenities, a.key])}
                        className={`chip !py-1 ${on ? "chip-on" : ""}`}
                      >
                        {on && <CheckIcon size={12} />} {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>
            <Section title="Description & photos">
              <Field label="Description" id="desc">
                <textarea id="desc" rows={4} className="field" value={v.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
              <Field label="Video tour link" id="video" optional error={errors.video} hint="Paste a link to a walk-through video you've already posted, e.g. on YouTube or Instagram. It opens on that site.">
                <input id="video" type="url" inputMode="url" className="field" value={v.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://" />
              </Field>
              <PhotoUploader value={v.photos} onChange={(p) => set("photos", p)} />
            </Section>
          </>
        )}

        {step === 3 && (
          <>
            <Section title="Check before you publish">
              <dl className="divide-y divide-sand-200 text-sm">
                <ReviewRow label="Listing" value={v.title || "—"} onEdit={() => goTo(0)} />
                <ReviewRow label="Type & rooms" value={`${PROPERTY_TYPE_LABEL[v.propertyType]} · ${v.bedrooms || 0} bed · ${v.bathrooms || 0} bath`} onEdit={() => goTo(0)} />
                <ReviewRow label="Location" value={[v.estate, v.area, v.landmark].filter(Boolean).join(" · ") || "—"} onEdit={() => goTo(0)} />
                <ReviewRow
                  label={v.purpose === "rent" ? "Rent" : "Asking price"}
                  value={priceNum ? `${naira(priceNum)}${v.purpose === "rent" ? ` ${FREQUENCY_LABEL[v.rentFrequency]}` : ""} · total ${naira(total)}` : "—"}
                  onEdit={() => goTo(1)}
                />
                <ReviewRow
                  label="Fees"
                  value={
                    [
                      num(v.agencyFee) ? `Agency ${naira(num(v.agencyFee)!)}` : null,
                      num(v.legalFee) ? `Legal ${naira(num(v.legalFee)!)}` : null,
                      v.purpose === "rent" && num(v.cautionDeposit) ? `Caution ${naira(num(v.cautionDeposit)!)}` : null,
                      num(v.serviceCharge) ? `Service charge ${naira(num(v.serviceCharge)!)} ${FREQUENCY_LABEL[v.serviceChargeFrequency]}` : null,
                      ...v.other.filter((o) => o.label && num(o.amount)).map((o) => `${o.label} ${naira(num(o.amount)!)}`),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No extra fees"
                  }
                  onEdit={() => goTo(1)}
                />
                <ReviewRow label="Availability" value={`${statusLabel(v.status, v.purpose)} · from ${formatDate(v.availableFrom)} · ${OCCUPANCY_LABEL[v.occupancy]}`} onEdit={() => goTo(2)} />
                <ReviewRow label="Amenities" value={v.amenities.length ? v.amenities.map((a) => AMENITY_LABEL[a]).join(", ") : "None selected"} onEdit={() => goTo(2)} />
                <ReviewRow label="Photos &amp; video" value={`${v.photos.length ? `${v.photos.length} photo${v.photos.length === 1 ? "" : "s"}` : "No photos (illustrations shown)"} · ${v.videoUrl.trim() ? "video tour link added" : "no video"}`} onEdit={() => goTo(2)} />
              </dl>
            </Section>

            {mode === "create" && (
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
                <p className="font-semibold">What happens when you publish</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5">
                  <li>Your listing appears in search straight away.</li>
                  <li>Viewing requests and messages arrive in your dashboard.</li>
                  <li>Confirm it&apos;s still available at least every 30 days, or it shows as “Availability unconfirmed”.</li>
                </ul>
              </div>
            )}

            {listedBy === "owner" ? (
              mode === "create" && (
                <Section title="Ownership">
                  <div data-invalid={errors.ownership ? "" : undefined}>
                    <label htmlFor="ownership" className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${errors.ownership ? "border-red-400 bg-red-50" : "border-sand-200"}`}>
                      <input
                        id="ownership"
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                        checked={v.ownershipConfirmed}
                        onChange={(e) => set("ownershipConfirmed", e.target.checked)}
                        aria-invalid={errors.ownership ? true : undefined}
                        aria-describedby={errors.ownership ? "ownership-error" : undefined}
                      />
                      <span>
                        I confirm I own this home or am legally entitled to {v.purpose === "rent" ? "let" : "sell"} it.
                        <span className="block text-xs text-ink-500">Shown to renters as “Lister says they own this home”. It is not a verification.</span>
                      </span>
                    </label>
                    {errors.ownership && <p id="ownership-error" className="mt-1 text-sm font-medium text-red-700"><span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>{errors.ownership}</p>}
                  </div>
                </Section>
              )
            ) : (
              <Section title="Owner & authorization" description="Agents should only list homes they are authorized to represent.">
                <Field label="Owner name as shown to the public" id="owner" required error={errors.owner} hint="e.g. 'Private owner'. Don't enter the owner's phone, ID or bank details.">
                  <input id="owner" className="field" value={v.ownerDisplayName} onChange={(e) => set("ownerDisplayName", e.target.value)} />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={v.authorizationSubmitted} onChange={(e) => set("authorizationSubmitted", e.target.checked)} />
                  I have the owner&apos;s written authorization — mark the owner authorization check as “submitted” (no document is uploaded during the beta).
                </label>
              </Section>
            )}
          </>
        )}

        <div className="sticky bottom-0 -mx-4 border-t border-sand-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
          <div className="flex gap-2">
            {step > 0 ? (
              <button type="button" className="btn-secondary" onClick={() => goTo(step - 1)}>Back</button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
            )}
            {mode === "edit" && step < STEPS.length - 1 && (
              <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={submit}>Save changes</button>
            )}
            <button type="submit" className="btn-primary flex-1 sm:flex-none sm:px-8">
              {step < STEPS.length - 1 ? `Continue: ${STEP_INTRO[step + 1].title.toLowerCase()}` : mode === "create" ? "Publish listing" : "Save changes"}
            </button>
          </div>
          {draftKey && <p className="mt-1.5 text-center text-xs text-ink-500 sm:text-left">Your progress is saved in this browser as you go.</p>}
        </div>
      </form>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center rounded-xl border border-sand-300 bg-white">
        <button type="button" className="px-3 py-2 text-lg text-ink-700 disabled:opacity-30" disabled={n <= 0} onClick={() => onChange(String(Math.max(0, n - 1)))} aria-label={`Fewer ${label.toLowerCase()}`}>−</button>
        <span className="flex-1 text-center font-semibold" aria-live="polite">{n}</span>
        <button type="button" className="px-3 py-2 text-lg text-ink-700" onClick={() => onChange(String(Math.min(20, n + 1)))} aria-label={`More ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="text-ink-900">{value}</dd>
      </div>
      <button type="button" className="link shrink-0 text-sm" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>Edit</button>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="text-sm text-ink-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  id,
  optional,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  optional?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  // Pass invalid state and descriptions to the input itself, so screen readers announce them.
  const control = isValidElement(children) ? cloneElement(children, { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy }) : children;
  return (
    <div data-invalid={error ? "" : undefined} className="[&[data-invalid]_.field]:border-red-500 [&[data-invalid]_.field]:ring-2 [&[data-invalid]_.field]:ring-red-100">
      <label htmlFor={id} className="label">
        {label} {optional ? <span className="font-normal text-ink-500">(optional)</span> : required ? <span className="font-normal text-ink-500">(required)</span> : null}
      </label>
      {control}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-start gap-1 text-sm font-medium text-red-700">
          <span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>{error}
        </p>
      )}
    </div>
  );
}
