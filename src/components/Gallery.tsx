"use client";

import { useRef, useState } from "react";
import { useListingPhotos } from "@/lib/photos";
import type { Listing } from "@/lib/types";
import { ListingPhoto, PHOTO_VARIANTS } from "./ListingPhoto";
import { useDialog } from "./useDialog";

/** One photo by index: a real photo when the listing has some (see lib/images.ts), otherwise an illustration. */
function Photo({ listing, real, index, className = "" }: { listing: Listing; real: string[]; index: number; className?: string }) {
  if (real.length) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={real[index % real.length]} alt={`Photo ${index + 1} of ${listing.title}`} className={`h-full w-full object-cover ${className}`} />;
  }
  return <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} variant={PHOTO_VARIANTS[index % PHOTO_VARIANTS.length]} className={`h-full w-full ${className}`} showTag={false} />;
}

const label = (real: string[], i: number) => (real.length ? `Photo ${i + 1}` : PHOTO_VARIANTS[i]);

/**
 * Listing photos. Desktop: a large photo with three smaller ones beside it and "See all photos".
 * Phones: a swipeable carousel. Both open a full-screen viewer. Illustrated until real photos are added.
 */
export function Gallery({ listing, overlay }: { listing: Listing; overlay?: React.ReactNode }) {
  const real = useListingPhotos(listing.id);
  const count = real.length || PHOTO_VARIANTS.length;
  const [i, setI] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setI((x) => (x + d + count) % count);
  const isDemo = !real.length;
  // Desktop grid: one big photo plus up to three more, laid out so no photo repeats when there are fewer than four.
  const tiles =
    real.length === 1
      ? ["col-span-4 row-span-2"]
      : real.length === 2
        ? ["col-span-2 row-span-2", "col-span-2 row-span-2"]
        : real.length === 3
          ? ["col-span-2 row-span-2", "col-span-2", "col-span-2"]
          : ["col-span-2 row-span-2", "", "", "col-span-2"];

  return (
    <section aria-label="Photos">
      {/* Phones: carousel */}
      <div
        className="relative -mx-4 overflow-hidden bg-sand-200 md:hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <button type="button" className="block aspect-[4/3] w-full" onClick={() => setViewer(i)} aria-label="Open full-screen photos">
          <Photo listing={listing} real={real} index={i} />
        </button>
        {overlay && <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">{overlay}</div>}
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
        </button>
        <div className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white" aria-live="polite">
          {i + 1} / {count}
        </div>
        {isDemo && <div className="absolute bottom-3 left-3 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">Illustrations</div>}
      </div>

      {/* Desktop: photo grid */}
      <div className="relative hidden h-[460px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl md:grid lg:h-[500px]">
        {tiles.map((span, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setViewer(idx)}
            aria-label={`Open photo ${idx + 1}: ${label(real, idx)}`}
            className={`group relative overflow-hidden bg-sand-200 ${span}`}
          >
            <Photo listing={listing} real={real} index={idx} className="transition duration-500 group-hover:scale-[1.03]" />
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" aria-hidden />
          </button>
        ))}
        {overlay && <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">{overlay}</div>}
        <button type="button" onClick={() => setViewer(0)} className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink-900 shadow-raised hover:bg-sand-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
          See all {count} photos
        </button>
        {isDemo && <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">Illustrations</div>}
      </div>

      {viewer !== null && <PhotoViewer listing={listing} real={real} start={viewer} count={count} onClose={() => setViewer(null)} />}
    </section>
  );
}

/** Full-screen photo viewer: arrow keys or buttons to move, Escape to close. */
function PhotoViewer({ listing, real, start, count, onClose }: { listing: Listing; real: string[]; start: number; count: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const ref = useDialog<HTMLDivElement>(onClose);
  const go = (d: number) => setI((x) => (x + d + count) % count);
  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${listing.title}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold" aria-live="polite">
          {i + 1} / {count} · {label(real, i)}
        </p>
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold hover:bg-white/10" data-autofocus>
          Close ✕
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
        <div className="aspect-[4/3] max-h-full w-full max-w-5xl overflow-hidden rounded-lg sm:aspect-[16/10]">
          <Photo listing={listing} real={real} index={i} />
        </div>
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 sm:left-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 sm:right-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}
