"use client";

import Link from "next/link";
import { PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { FREQUENCY_LABEL, annualize, naira, nairaCompact } from "@/lib/format";
import { availabilityInfo, feeParts, moveInTotal, type AvailabilityInfo } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Listing } from "@/lib/types";
import { BathIcon, BedIcon, HeartIcon, PinIcon } from "./Icons";
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
      ? "text-[28px] leading-none font-semibold tracking-tight sm:text-[32px]"
      : size === "sm"
        ? "text-[17px] leading-tight font-semibold tracking-tight"
        : "text-xl leading-tight font-semibold tracking-tight";
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
    <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <circle cx="12" cy="13" r="3.5" />
        <path d="M8 6l1.5-2h5L16 6" />
      </svg>
      {PHOTO_VARIANTS.length} · demo
    </span>
  );
}

function Location({ listing }: { listing: Listing }) {
  const near = listing.landmark ?? listing.estate;
  return (
    <p className="flex min-w-0 items-center gap-1 text-[13px]">
      <PinIcon className="shrink-0 text-ink-500" size={14} />
      <span className="shrink-0 font-medium text-ink-700">{listing.area}</span>
      {near && <span className="truncate text-ink-500">· {near}</span>}
    </p>
  );
}

function RoomFacts({ listing, showType = true }: { listing: Listing; showType?: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-700">
      <span className="inline-flex items-center gap-1">
        <BedIcon size={15} className="text-ink-500" /> <b className="font-semibold text-ink-900">{listing.bedrooms}</b> bed{listing.bedrooms === 1 ? "" : "s"}
      </span>
      <span className="inline-flex items-center gap-1">
        <BathIcon size={15} className="text-ink-500" /> <b className="font-semibold text-ink-900">{listing.bathrooms}</b> bath{listing.bathrooms === 1 ? "" : "s"}
      </span>
      {showType && <span className="text-ink-500">{PROPERTY_TYPE_LABEL[listing.propertyType]}</span>}
    </p>
  );
}

/** Footer listing each fee separately, plus the total a renter or buyer would pay up front. */
function FeesFooter({ listing }: { listing: Listing }) {
  const parts = feeParts(listing);
  const { total, notProvided } = moveInTotal(listing);
  return (
    <div className="flex items-start justify-between gap-3 border-t border-sand-200 bg-sand-50 px-3 py-2.5 text-xs sm:px-4">
      <p className="min-w-0 text-ink-500">
        {parts.length ? (
          <>
            <span className="font-medium text-ink-700">Fees: </span>
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
          <span className="block text-[11px] text-ink-500 italic">
            {notProvided.length === 1 ? `${notProvided[0]} not provided` : `${notProvided.length} costs not provided`}
          </span>
        )}
      </p>
      {parts.length > 0 && (
        <p className="shrink-0 text-right">
          <span className="block text-ink-500">{listing.purpose === "rent" ? "First payment" : "Total"}</span>
          <span className="block text-[13px] font-semibold text-ink-900">{nairaCompact(total)}</span>
        </p>
      )}
    </div>
  );
}

export function ListingCard({ listing, layout = "grid" }: { listing: Listing; layout?: "grid" | "list" }) {
  const href = `/listings/${listing.id}`;
  const purposeLabel = listing.purpose === "rent" ? "For rent" : "For sale";

  if (layout === "list") {
    return (
      <article className="card relative overflow-hidden transition hover:shadow-raised">
        <div className="flex">
          <Link href={href} className="relative w-[38%] max-w-[200px] min-w-[118px] shrink-0" tabIndex={-1} aria-hidden>
            <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} className="h-full min-h-[150px]" showTag={false} />
            <span className="absolute bottom-1.5 left-1.5"><PhotoCount /></span>
          </Link>
          <Link href={href} className="min-w-0 flex-1 space-y-1.5 p-3 pr-11 focus-visible:rounded-r-2xl focus-visible:outline-offset-[-3px] sm:p-4 sm:pr-12">
            <p className="text-[11px] font-semibold tracking-wide text-ink-500 uppercase">{purposeLabel}</p>
            <PriceTag listing={listing} size="sm" />
            <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink-900">{listing.title}</h3>
            <Location listing={listing} />
            <RoomFacts listing={listing} showType={false} />
            <AvailabilityLine listing={listing} compact />
          </Link>
        </div>
        <FeesFooter listing={listing} />
        <SaveButton listing={listing} className="absolute top-2 right-2 h-9 w-9" />
      </article>
    );
  }

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition hover:shadow-raised">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden>
        <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} className="aspect-[3/2]" showTag={false} />
        <span className="absolute top-3 left-3"><AvailabilityPill listing={listing} /></span>
        <span className="absolute bottom-2 left-2"><PhotoCount /></span>
      </Link>
      <Link href={href} className="flex flex-1 flex-col gap-2 p-4 focus-visible:outline-offset-[-3px]">
        <div className="flex items-baseline justify-between gap-2">
          <PriceTag listing={listing} />
        </div>
        <h3 className="line-clamp-2 leading-snug font-medium text-ink-900">{listing.title}</h3>
        <Location listing={listing} />
        <RoomFacts listing={listing} />
        <div className="mt-auto pt-1">
          <AvailabilityLine listing={listing} />
        </div>
      </Link>
      <FeesFooter listing={listing} />
      <SaveButton listing={listing} className="absolute top-2.5 right-2.5 h-10 w-10" />
    </article>
  );
}
