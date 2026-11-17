"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DemoBadge, OccupancyBadge } from "@/components/Badges";
import { ContactPlaceholder, PhoneIcon, ShareButton, WhatsAppIcon } from "@/components/ContactActions";
import { AffordabilityCalculator } from "@/components/AffordabilityCalculator";
import { CostBreakdownView } from "@/components/CostBreakdownView";
import { Gallery } from "@/components/Gallery";
import { ArrowLeftIcon, BathIcon, BedIcon, CalendarIcon, CheckIcon, InfoIcon, PinIcon } from "@/components/Icons";
import { InquiryDialog } from "@/components/InquiryDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { SavedNote } from "@/components/SavedNote";
import { AvailabilityLine, ListingBadges, ListingCard, PriceTag, SaveButton, priceUnit } from "@/components/ListingCard";
import { PriceHistory } from "@/components/PriceHistory";
import { Avatar } from "@/components/SiteHeader";
import { ListingChecksGrid } from "@/components/ListingChecks";
import { TrustPanel } from "@/components/TrustPanel";
import { NEARBY } from "@/lib/areas";
import { TravelGuide } from "@/components/TravelGuide";
import { AMENITY_LABEL, OCCUPANCY_LABEL, PROPERTY_TYPE_LABEL, STALE_AFTER_DAYS } from "@/lib/constants";
import { daysSince, formatDate, naira, nairaCompact, relativeDays } from "@/lib/format";
import { availabilityInfo, daysListedLabel, feeParts, isVideoLink, linkHost, isPubliclySearchable, moveInTotal, similarListings } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { InquiryType, Listing } from "@/lib/types";


export function ListingDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, ready, currentUser, recordView } = useStore();
  const recorded = useRef<string | null>(null);

  // Record a demo "view" once per visit. A lister opening their own listing doesn't count.
  useEffect(() => {
    if (!ready || recorded.current === id) return;
    const l = data.listings.find((x) => x.id === id);
    if (!l) return;
    recorded.current = id;
    if (currentUser && (currentUser.id === l.ownerId || currentUser.id === l.agentId)) return;
    recordView(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, id]);
  const [dialog, setDialog] = useState<InquiryType | null>(null);
  const [contact, setContact] = useState<"whatsapp" | "call" | null>(null);
  const [reporting, setReporting] = useState(false);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="card aspect-[16/9] animate-pulse bg-sand-50" />
      </div>
    );
  }

  const listing = data.listings.find((l) => l.id === id);
  if (!listing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Listing not found</h1>
        <p className="mt-2 text-ink-500">It may have been removed, or the demo data was reset.</p>
        <Link href="/search" className="btn-primary mt-6">Back to search</Link>
      </div>
    );
  }

  const avail = availabilityInfo(listing);
  const lister = data.users.find((u) => u.id === listing.ownerId);
  const agent = listing.agentId ? data.users.find((u) => u.id === listing.agentId) : undefined;
  const contactPerson = agent ?? lister;
  const costs = moveInTotal(listing);
  const fees = feeParts(listing);
  const canContact = isPubliclySearchable(listing);
  const isMine = !!currentUser && (currentUser.id === listing.ownerId || currentUser.id === listing.agentId);
  const stale = daysSince(listing.lastConfirmed) > STALE_AFTER_DAYS;
  const similar = similarListings(data.listings, listing);
  const nearbyAreas = NEARBY[listing.area] ?? [];

  const facts: [string, string][] = [
    ["Water", listing.details.water],
    ["Power", listing.details.power],
    ["Security", listing.details.security],
    ["Parking", listing.details.parking],
    ["Road access", listing.details.roadAccess],
    ["Flooding", listing.details.flooding ?? ""],
    ["Nearby", listing.details.nearby ?? ""],
  ];

  const contactProps = {
    listing,
    canContact,
    isMine,
    onViewing: () => setDialog("viewing" as const),
    onMessage: () => setDialog("message" as const),
    onWhatsApp: () => setContact("whatsapp" as const),
    onCall: () => setContact("call" as const),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 pb-40 lg:pb-12">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="btn-ghost btn-sm -ml-3">
          <ArrowLeftIcon size={16} /> Back to results
        </button>
        <div className="flex items-center gap-2">
          <ShareButton listing={listing} className="btn-ghost btn-sm" />
          <SaveButton listing={listing} withLabel className="h-9 px-3.5" />
        </div>
      </div>

      {!canContact && (
        <div className="mt-2 rounded-xl border border-stone-300 bg-stone-100 p-3 text-sm text-stone-800">
          This listing is <b>{avail.label.toLowerCase()}</b> and is not shown in search results.
        </div>
      )}

      <div className="mt-3">
        <Gallery
          listing={listing}
          overlay={
            <>
              <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink-900 shadow-card">
                {listing.purpose === "rent" ? "For rent" : "For sale"}
              </span>
              {listing.videoUrl && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-semibold text-white shadow-card">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg> Video tour
                </span>
              )}
            </>
          }
        />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_370px]">
        <div className="min-w-0 space-y-6">
          {/* Title, location, key facts */}
          <header>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <p className="flex items-baseline gap-1.5">
                <span className="text-[32px] leading-none font-extrabold tracking-tight text-ink-900 sm:text-[40px]">{naira(listing.price)}</span>
                <span className="text-lg font-bold text-ink-700">{priceUnit(listing)}</span>
              </p>
              <p className="flex items-center gap-3 pb-1 text-[17px] text-ink-900">
                <span><b className="font-extrabold">{listing.bedrooms}</b> bd</span>
                <span className="h-4 w-px bg-sand-300" aria-hidden />
                <span><b className="font-extrabold">{listing.bathrooms}</b> ba</span>
                {listing.sizeSqm && (
                  <>
                    <span className="h-4 w-px bg-sand-300" aria-hidden />
                    <span><b className="font-extrabold">{listing.sizeSqm}</b> m²</span>
                  </>
                )}
              </p>
            </div>
            <h1 className="mt-3 text-[20px] leading-snug font-bold text-ink-900 sm:text-[22px]">{listing.title}</h1>
            <p className="mt-0.5 text-sm font-semibold text-ink-500">
              {listing.purpose === "rent" ? "For rent" : "For sale"} · {PROPERTY_TYPE_LABEL[listing.propertyType]}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-[15px] text-ink-700">
              <PinIcon className="mt-1 shrink-0 text-ink-500" />
              <span>
                <b className="font-semibold text-ink-900">{listing.area}</b>, Lagos
                {listing.estate && <span className="text-ink-500"> · {listing.estate}</span>}
                {listing.landmark && <span className="text-ink-500"> · {listing.landmark}</span>}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ListingBadges listing={listing} onPhoto={false} />
              <DemoBadge />
              <OccupancyBadge occupancy={listing.occupancy} />
              <span className="text-xs font-medium text-ink-500">Listed {daysListedLabel(listing)}</span>
            </div>
            {data.savedListingIds.includes(listing.id) && (
              <div className="mt-3">
                <SavedNote listingId={listing.id} />
              </div>
            )}
          </header>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sand-200 bg-sand-200 shadow-card sm:grid-cols-4">
            <KeyFact icon={<BedIcon size={18} />} label="Bedrooms" value={String(listing.bedrooms)} />
            <KeyFact icon={<BathIcon size={18} />} label="Bathrooms" value={`${listing.bathrooms}`} sub={`${listing.toilets} toilet${listing.toilets === 1 ? "" : "s"}`} />
            <KeyFact icon={<HomeSmallIcon />} label="Type" value={PROPERTY_TYPE_LABEL[listing.propertyType]} sub={listing.sizeSqm ? `${listing.sizeSqm} m²` : undefined} />
            <KeyFact
              icon={<CalendarIcon size={18} />}
              label="Availability"
              value={avail.label}
              sub={avail.detail.replace("Confirmed by lister", "Confirmed")}
              tone={avail.tone}
            />
          </dl>

          {/* Phones: price + main action in the page flow (the sticky bar repeats it) */}
          <div className="lg:hidden">
            <PricePanel {...contactProps} fees={fees} total={costs.total} notProvided={costs.notProvided} contactPerson={contactPerson} agent={agent} />
          </div>

          <ListingChecksGrid listing={listing} lister={lister} agent={agent} />
          <p className="-mt-3 text-sm text-ink-700">
            Something wrong with this listing?{" "}
            <button type="button" className="link" onClick={() => setReporting(true)}>Report it</button>
          </p>

          {/* One surface for the listing facts, split into sections by dividers */}
          <div className="card divide-y divide-sand-200 overflow-hidden">
            <section id="costs" className="scroll-mt-20 p-5 sm:p-6" aria-labelledby="costs-title">
              <h2 id="costs-title" className="section-title">{listing.purpose === "rent" ? "Rent cost breakdown" : "Cost breakdown"}</h2>
              <p className="muted mt-0.5">
                Every amount the lister entered, split into {listing.purpose === "rent" ? "what you pay every period and what you pay once to move in" : "ongoing and one-time costs"}.
              </p>
              <div className="mt-4">
                <CostBreakdownView listing={listing} />
              </div>
            </section>

            <section id="afford" className="scroll-mt-20 p-5 sm:p-6" aria-labelledby="afford-title">
              <h2 id="afford-title" className="section-title">{listing.purpose === "rent" ? "Can I afford it?" : "Mortgage and affordability estimate"}</h2>
              <p className="muted mt-0.5">
                {listing.purpose === "rent"
                  ? "See what share of your pay this home would take, using the costs above."
                  : "Try a deposit, rate and loan length to see a rough monthly repayment."}
              </p>
              <div className="mt-4">
                <AffordabilityCalculator listing={listing} />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-x-4 gap-y-4 p-5 sm:grid-cols-3 sm:p-6" aria-label="Availability">
              <h2 className="section-title col-span-2 sm:col-span-3">Availability</h2>
              <Fact label="Status"><AvailabilityLine listing={listing} compact /></Fact>
              <Fact label="Available from">{formatDate(listing.availableFrom)}</Fact>
              <Fact label="Last confirmed by lister" sub={relativeDays(listing.lastConfirmed)}>
                {formatDate(listing.lastConfirmed)}
              </Fact>
              {stale && (
                <p className="col-span-2 flex gap-2 rounded-xl bg-orange-50 p-3 text-xs text-orange-900 ring-1 ring-orange-200 sm:col-span-3">
                  <InfoIcon className="mt-0.5 shrink-0" size={14} />
                  Not reconfirmed in over {STALE_AFTER_DAYS} days, so we show “Availability unconfirmed”. Ask the lister before planning a visit.
                </p>
              )}
              <p className="col-span-2 text-xs text-ink-500 sm:col-span-3">
                Occupancy: <b className="text-ink-700">{OCCUPANCY_LABEL[listing.occupancy]}</b>. Occupancy is tracked separately from availability
                {listing.purpose === "sale" && listing.occupancy === "owner_occupied" ? " — this home is for sale while the owner still lives in it." : "."}
              </p>
            </section>

            <section className="p-5 sm:p-6" aria-labelledby="amen-title">
              <h2 id="amen-title" className="section-title">Amenities</h2>
              {listing.amenities.length ? (
                <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                  {listing.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 text-ink-700">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                        <CheckIcon size={13} />
                      </span>
                      {AMENITY_LABEL[a] ?? a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted mt-2">No amenities listed.</p>
              )}
            </section>

            <section className="p-5 sm:p-6" aria-labelledby="details-title">
              <h2 id="details-title" className="section-title">Neighbourhood & living</h2>
              <p className="muted mt-0.5">Power, water, flooding and getting around — as described by the {agent ? "agent" : "owner"}. Ask about anything that matters to you before a viewing.</p>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {facts.map(([k, v]) => (
                  <div key={k} className={`border-l-2 pl-3 ${k === "Flooding" && v ? "border-sky-300" : "border-sand-200"}`}>
                    <dt className="text-xs font-medium text-ink-500">{k}</dt>
                    <dd className={`mt-0.5 text-sm ${v ? "text-ink-900" : "text-ink-500 italic"}`}>{v || "Not provided"}</dd>
                  </div>
                ))}
              </dl>
              <TravelGuide area={listing.area} />
            </section>

            <section className="p-5 sm:p-6">
              <h2 className="section-title">About this home</h2>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-700">{listing.description}</p>
            </section>

            <section id="video" className="scroll-mt-20 p-5 sm:p-6" aria-labelledby="video-title">
              <h2 id="video-title" className="section-title">Video tour</h2>
              {listing.videoUrl && isVideoLink(listing.videoUrl) ? (
                <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl bg-ink-900 p-4 text-white">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">Walk-through video from the {agent ? "agent" : "owner"}</p>
                    <p className="text-xs text-white/70">Opens on {linkHost(listing.videoUrl)} in a new tab. IleLagos hasn&apos;t checked this video.</p>
                  </div>
                  <a href={listing.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-sm inline-flex items-center rounded-lg bg-white px-4 font-bold text-ink-900 hover:bg-sand-100">
                    Watch video<span className="sr-only"> (opens {linkHost(listing.videoUrl)} in a new tab)</span>
                  </a>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-4 rounded-xl border border-dashed border-sand-300 bg-sand-50 p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sand-200 text-ink-500" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-ink-900">No video tour yet</p>
                    <p className="text-ink-500">
                      {isMine ? (
                        <>Add a link to a walk-through video when you <Link href={`/dashboard/listings/${listing.id}/edit`} className="link">edit this listing</Link>.</>
                      ) : (
                        "You can ask the lister for a video or a video call before visiting."
                      )}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section aria-labelledby="loc-title">
              <div className="p-5 sm:p-6">
                <h2 id="loc-title" className="section-title">Area & landmarks</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <LocFact label="Area" value={`${listing.area}, Lagos`} />
                  {listing.estate && <LocFact label="Estate" value={listing.estate} />}
                  {listing.landmark && <LocFact label="Nearby landmark" value={listing.landmark} />}
                  {listing.streetHint && <LocFact label="Street" value={listing.streetHint} />}
                </dl>
                {nearbyAreas.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-ink-500">Nearby areas</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {nearbyAreas.map((a) => (
                        <Link key={a} href={`/search?mode=${listing.purpose}&q=${encodeURIComponent(a)}`} className="chip !min-h-8 text-[13px]">
                          {a}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <Link href={`/areas/${encodeURIComponent(listing.area)}`} className="link mt-4 inline-block text-sm">
                  Area guide: {listing.area} prices, notes and travel times
                </Link>
                <p className="mt-2 text-xs text-ink-500">The exact address is shared by the lister after you arrange a viewing.</p>
              </div>
              <div className="flex h-28 items-center justify-center border-t border-sand-200 bg-sand-50 text-sm text-ink-500">
                <span className="rounded-lg border border-sand-200 bg-white px-3 py-1.5">Map placeholder</span>
              </div>
            </section>

            <PriceHistory listing={listing} bare />
            <TrustPanel listing={listing} lister={lister} agent={agent} collapsible bare />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-sand-300 bg-sand-50 p-4 text-sm">
            <span className="text-ink-700">Think this is a scam, a duplicate, the wrong price, or no longer available?</span>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setReporting(true)}>
              Report this listing
            </button>
          </div>

          {similar.length > 0 && (
            <section aria-labelledby="similar-title">
              <h2 id="similar-title" className="section-title">Similar homes nearby</h2>
              <div className="mt-3 grid gap-3">
                {similar.map((l) => <ListingCard key={l.id} listing={l} layout="list" />)}
              </div>
            </section>
          )}
        </div>

        {/* Desktop: sticky price + contact panel */}
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <PricePanel {...contactProps} fees={fees} total={costs.total} notProvided={costs.notProvided} contactPerson={contactPerson} agent={agent} />
        </aside>
      </div>

      {/* Phones: sticky action bar keeps the main action within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-raised backdrop-blur lg:hidden">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span>
              <b className="text-[15px] font-semibold text-ink-900">{nairaCompact(listing.price)}</b> <span className="text-ink-700">{priceUnit(listing)}</span>
            </span>
            <span className="text-ink-500">
              {listing.purpose === "rent" ? "First payment" : "Total with fees"} <b className="text-ink-900">{nairaCompact(costs.total)}</b>
            </span>
          </div>
          {isMine ? (
            <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn-primary w-full">Edit this listing</Link>
          ) : (
            <div className="flex gap-2">
              <button className="btn-secondary btn-icon" disabled={!canContact} onClick={() => setContact("whatsapp")} aria-label="WhatsApp the lister">
                <span className="text-[#1f9d55]"><WhatsAppIcon size={20} /></span>
              </button>
              <button className="btn-secondary btn-icon" disabled={!canContact} onClick={() => setContact("call")} aria-label="Call the lister">
                <PhoneIcon size={18} />
              </button>
              <button className="btn-primary flex-1" disabled={!canContact} onClick={() => setDialog("viewing")}>
                Request a viewing
              </button>
            </div>
          )}
        </div>
      </div>

      {dialog && <InquiryDialog listing={listing} type={dialog} onClose={() => setDialog(null)} />}
      {reporting && <ReportDialog listing={listing} onClose={() => setReporting(false)} />}
      {contact && contactPerson && <ContactPlaceholder kind={contact} listing={listing} name={contactPerson.name} onClose={() => setContact(null)} />}
    </div>
  );
}

/** Price, separate fees, total and the contact actions. Used in the sidebar (desktop) and in-page (phones). */
function PricePanel({
  listing,
  fees,
  total,
  notProvided,
  contactPerson,
  agent,
  canContact,
  isMine,
  onViewing,
  onMessage,
  onWhatsApp,
  onCall,
}: {
  listing: Listing;
  fees: ReturnType<typeof feeParts>;
  total: number;
  notProvided: string[];
  contactPerson?: { name: string };
  agent?: { id: string; agencyName?: string };
  canContact: boolean;
  isMine: boolean;
  onViewing: () => void;
  onMessage: () => void;
  onWhatsApp: () => void;
  onCall: () => void;
}) {
  return (
    <div className="card p-5 sm:p-6">
      <PriceTag listing={listing} size="lg" />
      {fees.length > 0 ? (
        <dl className="mt-4 space-y-1.5 text-sm">
          {fees.map((f) => (
            <div key={f.label} className="flex justify-between gap-3">
              <dt className="text-ink-500">{f.label}</dt>
              <dd className="font-medium text-ink-900">
                {naira(f.amount)}
                {f.suffix && <span className="font-normal text-ink-500">{f.suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="muted mt-3">No extra fees listed by the lister.</p>
      )}
      {notProvided.length > 0 && (
        <p className="mt-2 text-xs text-ink-500">
          <span className="font-medium text-ink-700">Not provided:</span> {notProvided.join(", ")}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5 ring-1 ring-brand-100">
        <span className="text-sm font-medium text-brand-800">{listing.purpose === "rent" ? "First payment estimate" : "Total with fees"}</span>
        <span className="font-semibold tracking-tight text-brand-800">{naira(total)}</span>
      </div>
      <a href="#costs" className="link mt-2 inline-block text-xs">See full cost breakdown</a>

      <div className="mt-4 border-t border-sand-200 pt-4">
        <AvailabilityLine listing={listing} />
      </div>

      {contactPerson && (
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={contactPerson.name} size={40} />
          <div className="min-w-0 text-sm">
            <div className="truncate font-semibold">
              {contactPerson.name} <span className="font-normal text-ink-500">(demo)</span>
            </div>
            <div className="text-ink-500">{agent ? `Agent · ${agent.agencyName ?? "Independent"}` : "Owner, listing directly"}</div>
            {agent && listing.ownerDisplayName && <div className="text-xs text-ink-500">On behalf of: {listing.ownerDisplayName}</div>}
            {agent && <Link href={`/agents/${agent.id}`} className="link text-xs">View agent profile</Link>}
          </div>
        </div>
      )}

      {isMine ? (
        <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn-primary mt-4 w-full">Edit this listing</Link>
      ) : (
        <div className="mt-4 grid gap-2">
          <button className="btn-primary w-full" disabled={!canContact} onClick={onViewing}>Request a viewing</button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" disabled={!canContact} onClick={onWhatsApp}>
              <span className="text-[#1f9d55]"><WhatsAppIcon size={16} /></span> WhatsApp
            </button>
            <button className="btn-secondary" disabled={!canContact} onClick={onCall}>
              <PhoneIcon size={16} /> Call
            </button>
          </div>
          <button className="link py-1 text-sm disabled:opacity-50" disabled={!canContact} onClick={onMessage}>
            Or send a written message
          </button>
          {!canContact && <p className="text-center text-xs text-ink-500">Contact is off because this home isn&apos;t available.</p>}
        </div>
      )}
    </div>
  );
}

const TONE_TEXT = { green: "text-brand-700", amber: "text-amber-800", orange: "text-orange-800", slate: "text-stone-600" } as const;

function KeyFact({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: keyof typeof TONE_TEXT }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <span className="text-ink-500">{icon}</span>
        {label}
      </dt>
      <dd className={`mt-1 text-[15px] leading-snug font-semibold ${tone ? TONE_TEXT[tone] : "text-ink-900"}`}>{value}</dd>
      {sub && <dd className="text-xs text-ink-500">{sub}</dd>}
    </div>
  );
}

function HomeSmallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function LocFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-sand-200 pl-3">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-ink-900">{value}</dd>
    </div>
  );
}

function Fact({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className="mt-1 font-semibold text-ink-900">{children}</div>
      {sub && <div className="text-xs text-ink-500">{sub}</div>}
    </div>
  );
}
