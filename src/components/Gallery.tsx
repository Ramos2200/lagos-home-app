"use client";

import { useRef, useState } from "react";
import type { Listing } from "@/lib/types";
import { ListingPhoto, PHOTO_VARIANTS } from "./ListingPhoto";

/**
 * Listing photo gallery: large main image with previous/next controls, a counter,
 * labelled thumbnails, arrow-key and swipe support. Photos are illustrated demo images.
 */
export function Gallery({ listing, overlay }: { listing: Listing; overlay?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = PHOTO_VARIANTS.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const variant = PHOTO_VARIANTS[i];

  return (
    <section aria-label="Photos" aria-roledescription="carousel">
      <div
        className="group relative -mx-4 overflow-hidden bg-sand-200 sm:mx-0 sm:rounded-2xl"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} variant={variant} className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[5/2]" showTag={false} />
        {overlay && <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">{overlay}</div>}

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-card transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next photo"
          className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-card transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
        </button>

        <div className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white" aria-live="polite">
          {i + 1} / {n} · {variant}
        </div>
        <div className="absolute bottom-3 left-3 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">Demo images</div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 sm:w-2/3 lg:w-[42%]">
        {PHOTO_VARIANTS.map((v, idx) => (
          <button
            key={v}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Show photo ${idx + 1}: ${v}`}
            aria-current={i === idx}
            className={`group/t text-left ${i === idx ? "" : "opacity-75 hover:opacity-100"}`}
          >
            <span className={`block overflow-hidden rounded-lg ring-2 transition ${i === idx ? "ring-brand-600" : "ring-transparent"}`}>
              <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} variant={v} className="aspect-[4/3]" showTag={false} />
            </span>
            <span className={`mt-1 block truncate text-[11px] ${i === idx ? "font-semibold text-ink-900" : "text-ink-500"}`}>{v}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
