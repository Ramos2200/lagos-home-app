"use client";

import Link from "next/link";
import { PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { FREQUENCY_LABEL, annualize, naira, nairaCompact } from "@/lib/format";
import { availabilityInfo, feeParts, moveInTotal, type AvailabilityInfo } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { HeartIcon } from "./Icons";
import { ListingPhoto, PHOTO_VARIANTS } from "./ListingPhoto";

/** "≈ ₦28.8M per year" for monthly or quarterly rents; null otherwise. */
export function annualEquivalent(l: Listing): string | null {
  if (l.purpose !== "rent" || !l.rentFrequency || l.rentFrequency === "annual") return null;
  return `≈ ${nairaCompact(annualize(l.price, l.rentFrequency))} per year`;
}

/** "per year" / "per month" for rent; "asking price" for sale. */
export function priceUnit(l: Listing): string {
  if (l.purpose === "sale") return "asking price";
  return l.rentFrequency ? FREQUENCY_LABEL[l.rentFrequency] : "";
}

export function PriceTag({ listing, size = "md" }: { listing: Listing; size?: "sm" | "md" | "lg" }) {
  const eq = annualEquivalent(listing);
  const amount =
    size === "lg"
      ? "text-[30px] leading-none font-extrabold tracking-tight sm:text-[34px]"
      : size === "sm"
        ? "text-[18px] leading-tight font-extrabold tracking-tight"
        : "text-[22px] leading-tight font-extrabold tracking-tight";
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className={`${amount} text-ink-900`}>{naira(listing.price)}</span>
        <span className={`${size === "lg" ? "text-base" : "text-sm"} font-medium text-ink-700`}>{priceUnit(listing)}</span>
      </p>
      {eq && <p className="mt-0.5 text-xs text-ink-500">{eq}</p>}
    </div>
  );
}

const DOT: Record<AvailabilityInfo["tone"], string> = {
  green: "bg-brand-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  slate: "bg-stone-400",
};
const TEXT: Record<AvailabilityInfo["tone"], string> = {
  green: "text-brand-700",
  amber: "text-amber-800",
  orange: "text-orange-800",
  slate: "text-stone-600",
};

/** "● Available from 20 Nov · Confirmed by lister 3 days ago" */
export function AvailabilityLine({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const a = availabilityInfo(listing);
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[a.tone]}`} aria-hidden />
      <span className={`shrink-0 font-semibold ${TEXT[a.tone]}`}>{a.label}</span>
      {!compact && <span className="truncate text-ink-500">· {a.detail.replace("Confirmed by lister ", "confirmed ")}</span>}
    </p>
  );
}

/** Pill shown over the photo, white so it reads on any image. */
function AvailabilityPill({ listing }: { listing: Listing }) {
  const a = availabilityInfo(listing);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink-900 shadow-card">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[a.tone]}`} aria-hidden />
      {a.label}
    </span>
  );
}

export function SaveButton({ listing, className = "", withLabel = false }: { listing: Listing; className?: string; withLabel?: boolean }) {
  const { data, toggleSaved } = useStore();
  const saved = data.savedListingIds.includes(listing.id);
  return (
    <button
      type="button"
      onClick={() => toggleSaved(listing.id)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? "Remove from saved homes" : "Save this home"}
      title={saved ? "Saved — tap to remove" : "Save this home"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-sm font-semibold shadow-card ring-1 ring-black/5 transition hover:scale-105 active:scale-95 ${saved ? "text-red-600" : "text-ink-700 hover:text-ink-900"} ${className}`}
    >
      <HeartIcon filled={saved} size={18} />
      {withLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}

function PhotoCount() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <circle cx="12" cy="13" r="3.5" />
        <path d="M8 6l1.5-2h5L16 6" />
      </svg>
      {PHOTO_VARIANTS.length} · demo
    </span>
  );
}

/** "Palmgrove Close, Lekki Phase 1, Lagos" — estate or landmark first, then area. */
function addressLine(l: Listing) {
  return [l.estate?.replace(/ \(fictional\)$/, "") ?? l.landmark, l.area, "Lagos"].filter(Boolean).join(", ");
}

/** "3 bds | 3 ba | 165 m² — Flat for rent" */
function FactsLine({ listing: l }: { listing: Listing }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-ink-900">
      <span><b className="font-bold">{l.bedrooms}</b> bd{l.bedrooms === 1 ? "" : "s"}</span>
      <span className="h-3.5 w-px bg-sand-300" aria-hidden />
      <span><b className="font-bold">{l.bathrooms}</b> ba</span>
      {l.sizeSqm && (
        <>
          <span className="h-3.5 w-px bg-sand-300" aria-hidden />
          <span><b className="font-bold">{l.sizeSqm}</b> m²</span>
        </>
      )}
      <span className="text-ink-500">— {PROPERTY_TYPE_LABEL[l.propertyType].replace(/ \(.*\)$/, "")} {l.purpose === "rent" ? "for rent" : "for sale"}</span>
    </p>
  );
}

/** One slim line listing each fee separately, plus the first payment estimate. */
function FeesLine({ listing }: { listing: Listing }) {
  const parts = feeParts(listing);
  const { total, notProvided } = moveInTotal(listing);
  return (
    <p className="text-xs text-ink-500">
      {parts.length ? (
        <>
          <span className="font-semibold text-ink-700">{listing.purpose === "rent" ? "First payment" : "Total"} {nairaCompact(total)}</span>
          {" · "}
          {parts.map((p, i) => (
            <span key={p.label}>
              <span className="whitespace-nowrap">
                {p.short} {nairaCompact(p.amount)}
                {p.suffix ?? ""}
              </span>
              {i < parts.length - 1 ? " · " : ""}
            </span>
          ))}
        </>
      ) : (
        "No fees entered"
      )}
      {notProvided.length > 0 && (
        <span className="italic">
          {" · "}
          {notProvided.length === 1 ? `${notProvided[0]} not provided` : `${notProvided.length} costs not provided`}
        </span>
      )}
    </p>
  );
}

function ListedBy({ listing }: { listing: Listing }) {
  const { data } = useStore();
  const agent = listing.agentId ? data.users.find((u) => u.id === listing.agentId) : undefined;
  return (
    <p className="truncate text-[11px] font-semibold tracking-wide text-ink-500 uppercase">
      {agent ? `Listed by ${agent.agencyName?.replace(/ \(fictional\)$/, "") ?? agent.name}` : "Listed by owner"} · demo
    </p>
  );
}

export function ListingCard({ listing, layout = "grid" }: { listing: Listing; layout?: "grid" | "list" }) {
  const href = `/listings/${listing.id}`;
  const unit = listing.purpose === "rent" && listing.rentFrequency ? (listing.rentFrequency === "monthly" ? "/mo" : listing.rentFrequency === "quarterly" ? "/qtr" : "/yr") : "";
  const eq = annualEquivalent(listing);

  const price = (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={`${layout === "list" ? "text-[20px]" : "text-[24px]"} leading-none font-extrabold tracking-tight text-ink-900`}>{naira(listing.price)}</span>
      {unit && <span className="text-[15px] font-bold text-ink-700">{unit}</span>}
      <span className="sr-only">{priceUnit(listing)}</span>
      {eq && <span className="text-xs text-ink-500">({eq})</span>}
    </p>
  );

  if (layout === "list") {
    return (
      <article className="group relative flex overflow-hidden rounded-xl border border-sand-200 bg-white transition hover:shadow-raised">
        <Link href={href} className="relative w-[40%] max-w-[220px] min-w-[124px] shrink-0 overflow-hidden" tabIndex={-1} aria-hidden>
          <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} className="h-full min-h-[168px] transition duration-500 group-hover:scale-[1.03]" showTag={false} />
          <span className="absolute top-2 left-2"><AvailabilityPill listing={listing} /></span>
          <span className="absolute bottom-1.5 left-1.5"><PhotoCount /></span>
        </Link>
        <Link href={href} className="min-w-0 flex-1 space-y-1.5 p-3 pr-11 focus-visible:rounded-r-xl focus-visible:outline-offset-[-3px] sm:p-4 sm:pr-12">
          {price}
          <FactsLine listing={listing} />
          <p className="truncate text-[13px] text-ink-700">{addressLine(listing)}</p>
          <FeesLine listing={listing} />
          <ListedBy listing={listing} />
        </Link>
        <SaveButton listing={listing} className="absolute top-2 right-2 h-9 w-9" />
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-sand-200 bg-white transition hover:shadow-raised">
      <Link href={href} className="relative block overflow-hidden" tabIndex={-1} aria-hidden>
        <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} className="aspect-[16/10] transition duration-500 group-hover:scale-[1.03]" showTag={false} />
        <span className="absolute top-3 left-3"><AvailabilityPill listing={listing} /></span>
        <span className="absolute bottom-2 left-2"><PhotoCount /></span>
      </Link>
      <Link href={href} className="flex flex-1 flex-col gap-1.5 px-4 pt-3 pb-4 focus-visible:outline-offset-[-3px]">
        {price}
        <FactsLine listing={listing} />
        <p className="truncate text-[14px] text-ink-700">{addressLine(listing)}</p>
        <div className="mt-auto space-y-1 pt-1.5">
          <FeesLine listing={listing} />
          <ListedBy listing={listing} />
        </div>
      </Link>
      <SaveButton listing={listing} className="absolute top-2.5 right-2.5 h-10 w-10" />
    </article>
  );
}
