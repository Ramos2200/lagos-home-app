"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { nairaCompact } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Listing } from "@/lib/types";

/**
 * Illustrative map of Lagos with price pins. It is NOT a real map: positions are approximate
 * so people can see where homes are relative to each other. A live map would need a map service.
 */
export const AREA_XY: Record<string, [number, number]> = {
  "Magodo": [380, 110],
  "Ikeja GRA": [300, 170],
  "Ogudu": [430, 195],
  "Maryland": [345, 245],
  "Gbagada": [440, 280],
  "Ilupeju": [310, 305],
  "Yaba": [405, 375],
  "Surulere": [300, 420],
  "Festac": [120, 455],
  "Ikoyi": [530, 500],
  "Victoria Island": [470, 565],
  "Lekki Phase 1": [625, 545],
  "Ikate": [705, 530],
  "Chevron": [775, 520],
  "Ajah": [870, 505],
  "Sangotedo": [935, 460],
};

const LABELS = ["Ikeja GRA", "Maryland", "Yaba", "Surulere", "Festac", "Ikoyi", "Victoria Island", "Lekki Phase 1", "Ajah", "Gbagada", "Magodo"];
/** Extra labels shown once someone moves or zooms the map, so every searchable area can be found. */
const MORE_LABELS = ["Ogudu", "Ilupeju", "Ikate", "Chevron", "Sangotedo"];

function pinXY(l: Listing, i: number): [number, number] {
  const [x, y] = AREA_XY[l.area] ?? [500, 350];
  // Spread homes in the same area so pins don't sit on top of each other.
  const angle = (i * 137.5 * Math.PI) / 180;
  const r = i === 0 ? 0 : 16 + 6 * Math.sqrt(i);
  return [x + Math.cos(angle) * r, y + Math.sin(angle) * r * 0.7];
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export function SearchMap({
  listings,
  activeId,
  onActive,
  onSearchArea,
  className = "",
}: {
  listings: Listing[];
  activeId: string | null;
  onActive: (id: string | null) => void;
  /** Called with the areas inside the visible part of the map when someone taps "Search this area". */
  onSearchArea?: (areas: string[]) => void;
  className?: string;
}) {
  const perArea: Record<string, number> = {};
  const pins = listings.map((l) => {
    const i = (perArea[l.area] = (perArea[l.area] ?? -1) + 1);
    return { l, xy: pinXY(l, i) };
  });
  const unit = (l: Listing) => (l.purpose === "rent" ? (l.rentFrequency === "monthly" ? "/mo" : l.rentFrequency === "quarterly" ? "/qtr" : "/yr") : "");

  // The drawing is scaled to fit the panel (like CSS "contain"); place pins with the same scale and offset.
  const box = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const [size, setSize] = useState({ w: 1000, h: 700 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Ignore 0×0 sizes (the panel is hidden on some screen sizes).
    const ro = new ResizeObserver(([e]) => e.contentRect.width > 10 && e.contentRect.height > 10 && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Panning and zooming on top of the "fit the results" view. The parent remounts the map when the search changes.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hint, setHint] = useState("");
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = pan.x !== 0 || pan.y !== 0 || zoom !== 1;

  // Zoom to fit the pins (with padding), matching the panel's shape — like a real map fitting its results.
  const xs = pins.map((p) => p.xy[0]);
  const ys = pins.map((p) => p.xy[1]);
  let minX = pins.length ? Math.min(...xs) - 150 : 0;
  let maxX = pins.length ? Math.max(...xs) + 150 : 1000;
  let minY = pins.length ? Math.min(...ys) - 90 : 0;
  let maxY = pins.length ? Math.max(...ys) + 70 : 700;
  const grow = (lo: number, hi: number, span: number): [number, number] => {
    const mid = (lo + hi) / 2;
    return [mid - span / 2, mid + span / 2];
  };
  if (maxX - minX < 360) [minX, maxX] = grow(minX, maxX, 360);
  if (maxY - minY < 260) [minY, maxY] = grow(minY, maxY, 260);
  // Safe even before the panel has been measured.
  const ratio = Math.min(Math.max((size.w || 1000) / (size.h || 700), 0.2), 5);
  if ((maxX - minX) / (maxY - minY) < ratio) [minX, maxX] = grow(minX, maxX, (maxY - minY) * ratio);
  else [minY, maxY] = grow(minY, maxY, (maxX - minX) / ratio);
  const fitW = maxX - minX;
  const fitH = maxY - minY;
  const vbW = fitW / zoom;
  const vbH = fitH / zoom;
  const vb = { x: minX + fitW / 2 + pan.x - vbW / 2, y: minY + fitH / 2 + pan.y - vbH / 2, w: vbW, h: vbH };
  const k = (size.w || 1000) / vb.w;

  const zoomTo = (z: number) => {
    setZoom(Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM));
    setHint("");
  };
  const nudge = (dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx * vb.w, y: p.y + dy * vb.h }));
    setHint("");
  };
  const reset = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setHint("");
  };
  const searchHere = () => {
    const inView = Object.entries(AREA_XY)
      .filter(([, [x, y]]) => x >= vb.x && x <= vb.x + vb.w && y >= vb.y && y <= vb.y + vb.h)
      .map(([a]) => a);
    if (!inView.length) {
      setHint("No areas in view — zoom out or move the map.");
      return;
    }
    onSearchArea?.(inView);
  };

  const labels = moved ? [...LABELS, ...MORE_LABELS] : LABELS;
  const ctrl = "flex h-9 w-9 items-center justify-center bg-white text-lg font-bold text-ink-900 hover:bg-sand-50 disabled:text-ink-300";

  return (
    <div
      ref={box}
      className={`relative touch-none overflow-hidden bg-[#eef1ec] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      role="region"
      aria-label="Illustrative map of results. Drag or use the arrow keys to move it, plus and minus to zoom."
      tabIndex={0}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("a,button")) return;
        drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!dx && !dy) return;
        drag.current = { ...d, x: e.clientX, y: e.clientY };
        setPan((p) => ({ x: p.x - dx / k, y: p.y - dy / k }));
        setHint("");
      }}
      onPointerUp={() => {
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        const step = 0.15;
        const keys: Record<string, () => void> = {
          ArrowLeft: () => nudge(-step, 0),
          ArrowRight: () => nudge(step, 0),
          ArrowUp: () => nudge(0, -step),
          ArrowDown: () => nudge(0, step),
          "+": () => zoomTo(zoom * 1.4),
          "=": () => zoomTo(zoom * 1.4),
          "-": () => zoomTo(zoom / 1.4),
        };
        if (keys[e.key]) {
          e.preventDefault();
          keys[e.key]();
        }
      }}
    >
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {/* land (oversized so moving the map never shows an edge) */}
        <rect x="-1000" y="-1000" width="3000" height="2700" fill="#eef1ec" />
        {/* Lagos lagoon */}
        <path d="M455 300 C520 330 560 380 600 410 C680 450 800 430 1000 400 L1000 470 C840 470 720 490 620 470 C560 455 520 440 480 455 C455 420 455 360 455 300 Z" fill="#bcd7e3" />
        <path d="M0 520 C80 500 160 520 220 505 C300 485 380 470 440 480 L470 470 C430 500 380 515 300 520 C200 530 100 545 0 560 Z" fill="#bcd7e3" />
        {/* Atlantic */}
        <path d="M-1000 640 C200 610 420 620 600 600 C760 585 880 590 2000 575 L2000 1700 L-1000 1700 Z" fill="#a9cbdb" />
        {/* main roads */}
        <g stroke="#ffffff" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d="M120 455 C220 430 300 420 405 375 C430 330 440 290 430 195 C420 150 390 120 380 80" />
          <path d="M300 170 C340 240 380 300 405 375 C450 430 500 470 530 500" />
          <path d="M470 565 C560 550 650 545 780 520 C860 505 920 480 980 455" />
        </g>
        <g stroke="#f6d38b" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M470 565 C560 550 650 545 780 520 C860 505 920 480 980 455" />
          <path d="M405 375 C450 430 500 470 530 500" />
        </g>
        {/* labels */}
        <g fontFamily="inherit" fontSize="15" fontWeight="600" fill="#5c626d" textAnchor="middle">
          {labels.map((a) => (
            <text key={a} x={AREA_XY[a][0]} y={AREA_XY[a][1] + 20}>{a}</text>
          ))}
          <text x="760" y="440" fontSize="14" fill="#5d8aa0" fontStyle="italic">Lagos Lagoon</text>
          <text x="760" y="660" fontSize="14" fill="#4d7a90" fontStyle="italic">Atlantic Ocean</text>
        </g>
      </svg>

      {/* Price pins (HTML so they're focusable links) */}
      {pins.map(({ l, xy: [x, y] }) => {
        const on = activeId === l.id;
        return (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            onMouseEnter={() => onActive(l.id)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(l.id)}
            onBlur={() => onActive(null)}
            aria-label={`${l.title}, ${nairaCompact(l.price)}${unit(l)}, ${l.area}`}
            style={{ left: (x - vb.x) * k, top: (y - vb.y) * k }}
            className={`absolute -translate-x-1/2 -translate-y-full rounded-full px-2 py-1 text-[12px] font-extrabold whitespace-nowrap shadow-raised transition-[background-color,transform] ${
              on ? "z-20 scale-110 bg-ink-900 text-white" : "z-10 bg-brand-600 text-white hover:z-20 hover:bg-ink-900"
            }`}
          >
            {nairaCompact(l.price)}
            {unit(l)}
            <span className={`absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent ${on ? "border-t-ink-900" : "border-t-brand-600"}`} aria-hidden />
          </Link>
        );
      })}

      {/* Search this area — appears once the map has been moved or zoomed */}
      {onSearchArea && moved && (
        <div className="absolute top-3 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
          <div className="flex gap-2">
            <button type="button" onClick={searchHere} className="rounded-full bg-ink-900 px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-float hover:bg-ink-700">
              {t("map.searchArea")}
            </button>
            <button type="button" onClick={reset} className="rounded-full bg-white px-3 py-2 text-sm font-bold whitespace-nowrap text-ink-900 shadow-float hover:bg-sand-50">
              {t("map.reset")}
            </button>
          </div>
          {hint && (
            <p className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink-700 shadow-card" role="status">
              {hint}
            </p>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-30 flex flex-col overflow-hidden rounded-lg shadow-raised ring-1 ring-black/5">
        <button type="button" className={ctrl} onClick={() => zoomTo(zoom * 1.4)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
        <span className="h-px bg-sand-200" aria-hidden />
        <button type="button" className={ctrl} onClick={() => zoomTo(zoom / 1.4)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">−</button>
      </div>

      <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-ink-500 shadow-card">
        Illustrative map · not to scale · a live map needs a map service
      </p>
    </div>
  );
}
