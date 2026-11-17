import { CHECK_STATE_LABEL, CHECK_WORDING, OCCUPANCY_LABEL, STATUS_TONE, statusLabel, type CheckKind } from "@/lib/constants";
import type { CheckState, ListingStatus, Occupancy, Purpose } from "@/lib/types";

const TONES = {
  green: "bg-brand-50 text-brand-800 border-brand-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  orange: "bg-orange-50 text-orange-800 border-orange-200",
  slate: "bg-stone-100 text-stone-700 border-stone-300",
  red: "bg-red-50 text-red-800 border-red-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  white: "bg-white/95 text-ink-900 border-white",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = "slate",
  children,
  className = "",
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, purpose, className }: { status: ListingStatus; purpose: Purpose; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot className={className}>
      {statusLabel(status, purpose)}
    </Badge>
  );
}

export function PurposeBadge({ purpose }: { purpose: Purpose }) {
  return <Badge tone="white">{purpose === "rent" ? "For rent" : "For sale"}</Badge>;
}

export function OccupancyBadge({ occupancy }: { occupancy: Occupancy }) {
  if (occupancy === "vacant") return <Badge tone="slate">Vacant</Badge>;
  return <Badge tone="blue">{OCCUPANCY_LABEL[occupancy]}</Badge>;
}

export function DemoBadge({ label = "Sample listing" }: { label?: string }) {
  return (
    <Badge tone="amber" className="!font-medium">
      {label}
    </Badge>
  );
}

const CHECK_TONE: Record<CheckState, Tone> = {
  not_started: "slate",
  submitted: "amber",
  demo_reviewed: "blue",
  self_declared: "slate",
};

/** With `kind`, the badge names the exact check ("Owner authorization submitted · not yet reviewed"). */
export function CheckBadge({ state, kind }: { state: CheckState; kind?: CheckKind }) {
  return (
    <Badge tone={CHECK_TONE[state]} className="!whitespace-normal">
      {kind ? CHECK_WORDING[kind][state] : CHECK_STATE_LABEL[state]}
    </Badge>
  );
}
