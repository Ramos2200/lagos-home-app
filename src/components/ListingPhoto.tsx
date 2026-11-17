import type { PropertyType } from "@/lib/types";

/**
 * Lightweight illustrated placeholder "photos" (inline SVG, no network requests).
 * Real listings would show uploaded photos.
 */

const PALETTES = [
  { sky: "#dfe9e3", wall: "#f3e7d3", roof: "#8a5a44", accent: "#2f7d55" },
  { sky: "#e6e2d6", wall: "#ffffff", roof: "#5c6b63", accent: "#b9874a" },
  { sky: "#dde6ec", wall: "#efe3cf", roof: "#a0523d", accent: "#3f6f8f" },
  { sky: "#e9e4da", wall: "#e8ddd0", roof: "#3c443e", accent: "#2f7d55" },
  { sky: "#e3ebe1", wall: "#f6efe4", roof: "#7a6a58", accent: "#a2643a" },
];

export const PHOTO_VARIANTS = ["Exterior", "Living room", "Kitchen", "Bedroom"] as const;
export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export function ListingPhoto({
  seed,
  type,
  variant = "Exterior",
  className = "",
  showTag = true,
}: {
  seed: number;
  type: PropertyType;
  variant?: PhotoVariant;
  className?: string;
  showTag?: boolean;
}) {
  const p = PALETTES[seed % PALETTES.length];
  return (
    <div className={`relative overflow-hidden bg-sand-200 ${className}`}>
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={`Illustration: ${variant}`}>
        {variant === "Exterior" && <Exterior p={p} type={type} seed={seed} />}
        {variant === "Living room" && <Living p={p} />}
        {variant === "Kitchen" && <Kitchen p={p} />}
        {variant === "Bedroom" && <Bedroom p={p} />}
      </svg>
      {showTag && (
        <span className="absolute right-2 bottom-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Illustration · {variant}
        </span>
      )}
    </div>
  );
}

type P = (typeof PALETTES)[number];

/** Small deterministic random generator so each listing always gets the same picture. */
function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const WALLS = ["#f3e7d3", "#ffffff", "#efe3cf", "#e8ddd0", "#f6efe4", "#e4ebe6", "#f1e2d8", "#dfe3e8"];
const CARS = ["#b23b3b", "#3f6f8f", "#e9e4da", "#2f2f2f", "#7a8b5a"];

function Exterior({ p, type, seed }: { p: P; type: PropertyType; seed: number }) {
  const r = rng(seed + 7);
  const wall = WALLS[Math.floor(r() * WALLS.length)];
  const tall = type === "flat" || type === "penthouse" || type === "mini_flat" || type === "self_contain";
  const twoStorey = type === "terrace" || type === "semi_detached" || type === "detached";
  const palmLeft = r() > 0.5;
  const palmX = palmLeft ? 30 + r() * 40 : 330 + r() * 40;
  const showSun = r() > 0.35;
  const car = r() > 0.4;
  const carColor = CARS[Math.floor(r() * CARS.length)];

  // Apartment blocks: vary floors, columns and position.
  const floors = type === "self_contain" || type === "mini_flat" ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 3);
  const cols = 2 + Math.floor(r() * 3);
  const bw = 60 + cols * 42;
  const bx = palmLeft ? 400 - bw - 40 - r() * 20 : 40 + r() * 20;
  const floorH = Math.min(34, 150 / floors);
  const by = 210 - floors * floorH - 8;

  // Houses: vary width and whether the roof is pitched or flat.
  const hw = type === "detached" ? 230 : type === "terrace" ? 260 : 200;
  const hx = (400 - hw) / 2 + (palmLeft ? 30 : -30);
  const pitched = r() > 0.35;
  const hy = twoStorey ? 90 : 130;

  return (
    <g>
      <rect width="400" height="260" fill={p.sky} />
      {showSun && <circle cx={palmLeft ? 340 : 60} cy="50" r="20" fill="#f7d58b" opacity="0.8" />}
      <ellipse cx={palmLeft ? 120 : 280} cy="60" rx="38" ry="9" fill="#ffffff" opacity="0.6" />
      <rect y="210" width="400" height="50" fill="#c9bfae" />
      <rect y="206" width="400" height="6" fill="#9fb49a" />

      {tall ? (
        <g>
          <rect x={bx} y={by} width={bw} height={210 - by} fill={wall} stroke="#00000014" />
          <rect x={bx - 5} y={by - 8} width={bw + 10} height="9" fill={p.roof} />
          {type === "penthouse" && <rect x={bx + bw * 0.25} y={by - 30} width={bw * 0.5} height="22" fill={wall} stroke="#00000014" />}
          {Array.from({ length: floors }).map((_, f) =>
            Array.from({ length: cols }).map((__, c) => {
              const wx = bx + 22 + c * ((bw - 44) / cols) + 4;
              const wy = by + 10 + f * floorH;
              const ww = (bw - 44) / cols - 8;
              return (
                <g key={`${f}-${c}`}>
                  <rect x={wx} y={wy} width={ww} height={floorH * 0.55} fill="#9fb7c4" />
                  <rect x={wx - 2} y={wy + floorH * 0.55} width={ww + 4} height="3" fill={p.accent} />
                </g>
              );
            }),
          )}
          <rect x={bx + bw / 2 - 14} y="184" width="28" height="26" fill={p.roof} />
        </g>
      ) : (
        <g>
          <rect x={hx} y={hy} width={hw} height={210 - hy} fill={wall} stroke="#00000014" />
          {pitched ? (
            <path d={`M${hx - 12} ${hy + 2} L${hx + hw / 2} ${hy - 45} L${hx + hw + 12} ${hy + 2} Z`} fill={p.roof} />
          ) : (
            <rect x={hx - 8} y={hy - 10} width={hw + 16} height="12" fill={p.roof} />
          )}
          {type === "semi_detached" && <rect x={hx + hw / 2 - 2} y={hy} width="4" height={210 - hy} fill="#00000018" />}
          {type === "terrace" &&
            [1, 2].map((i) => <rect key={i} x={hx + (hw / 3) * i - 2} y={hy} width="4" height={210 - hy} fill="#00000018" />)}
          {twoStorey && (
            <>
              {[0.12, 0.42, 0.72].map((t) => (
                <rect key={t} x={hx + hw * t} y={hy + 15} width={hw * 0.16} height="28" fill="#9fb7c4" />
              ))}
              <rect x={hx + 15} y={hy + 48} width={hw - 30} height="5" fill={p.accent} />
            </>
          )}
          <rect x={hx + hw * 0.12} y="158" width={hw * 0.18} height="28" fill="#9fb7c4" />
          <rect x={hx + hw * 0.7} y="158" width={hw * 0.18} height="28" fill="#9fb7c4" />
          <rect x={hx + hw / 2 - 15} y="160" width="30" height="50" fill={p.accent} />
        </g>
      )}

      {/* palm */}
      <path d={`M${palmX} 210 q4 -60 10 -110`} stroke="#6b5a45" strokeWidth="5" fill="none" />
      <g fill="#4f8a5e">
        <path d={`M${palmX + 10} 100 q-30 -5 -45 15 q25 -20 45 -15`} />
        <path d={`M${palmX + 10} 100 q30 -10 45 10 q-25 -15 -45 -10`} />
        <path d={`M${palmX + 10} 100 q-10 -30 -30 -35 q20 15 30 35`} />
        <path d={`M${palmX + 10} 100 q15 -28 35 -28 q-22 10 -35 28`} />
      </g>

      {/* fence */}
      <g fill="#ffffffaa">
        {Array.from({ length: 20 }).map((_, i) => (
          <rect key={i} x={i * 21} y="196" width="4" height="16" />
        ))}
        <rect y="198" width="400" height="3" />
      </g>

      {car && (
        <g transform={`translate(${palmLeft ? 70 : 250} 222)`}>
          <rect x="0" y="6" width="70" height="16" rx="5" fill={carColor} />
          <path d="M12 6 L22 -4 H48 L58 6 Z" fill={carColor} />
          <rect x="25" y="-1" width="20" height="7" fill="#cfe0ea" />
          <circle cx="16" cy="23" r="6" fill="#2f2f2f" />
          <circle cx="54" cy="23" r="6" fill="#2f2f2f" />
        </g>
      )}
    </g>
  );
}

function Living({ p }: { p: P }) {
  return (
    <g>
      <rect width="400" height="260" fill={p.wall} />
      <rect y="190" width="400" height="70" fill="#c8b59a" />
      <rect x="250" y="40" width="110" height="100" fill={p.sky} stroke="#fff" strokeWidth="6" />
      <rect x="60" y="130" width="170" height="60" rx="10" fill={p.accent} />
      <rect x="50" y="150" width="190" height="45" rx="10" fill={p.accent} opacity="0.85" />
      <rect x="70" y="120" width="40" height="30" rx="6" fill="#f2e6cf" />
      <rect x="180" y="120" width="40" height="30" rx="6" fill="#f2e6cf" />
      <ellipse cx="200" cy="225" rx="80" ry="14" fill="#a8916f" />
      <rect x="290" y="150" width="8" height="45" fill={p.roof} />
      <circle cx="294" cy="140" r="18" fill="#4f8a5e" />
    </g>
  );
}

function Kitchen({ p }: { p: P }) {
  return (
    <g>
      <rect width="400" height="260" fill="#f4efe6" />
      <rect y="200" width="400" height="60" fill="#bfae94" />
      <rect x="20" y="40" width="360" height="55" fill={p.roof} opacity="0.85" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={26 + i * 59} y="46" width="52" height="43" fill="none" stroke="#ffffff55" />
      ))}
      <rect x="20" y="140" width="360" height="62" fill={p.roof} />
      <rect x="20" y="132" width="360" height="10" fill="#e9e3d8" />
      <rect x="160" y="105" width="80" height="27" fill="#9fb7c4" />
      <circle cx="90" cy="125" r="8" fill={p.accent} />
      <rect x="280" y="112" width="30" height="20" fill={p.accent} />
    </g>
  );
}

function Bedroom({ p }: { p: P }) {
  return (
    <g>
      <rect width="400" height="260" fill={p.sky} />
      <rect y="195" width="400" height="65" fill="#c9b79c" />
      <rect x="90" y="110" width="220" height="30" rx="6" fill={p.roof} />
      <rect x="80" y="140" width="240" height="60" rx="8" fill="#ffffff" />
      <rect x="80" y="160" width="240" height="40" rx="8" fill={p.accent} opacity="0.8" />
      <rect x="110" y="125" width="60" height="25" rx="6" fill="#f2e6cf" />
      <rect x="230" y="125" width="60" height="25" rx="6" fill="#f2e6cf" />
      <rect x="30" y="160" width="40" height="40" fill={p.wall} />
      <rect x="40" y="135" width="20" height="25" fill="#f7d58b" />
      <rect x="330" y="40" width="50" height="160" fill={p.wall} stroke="#00000018" />
    </g>
  );
}
