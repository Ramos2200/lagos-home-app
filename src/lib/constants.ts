import type { CheckState, InquiryStatus, ListingStatus, Occupancy, PropertyType, Purpose, ReportReason, ReportStatus, Role } from "./types";

export const LAGOS_AREAS = [
  "Lekki Phase 1",
  "Ikate",
  "Chevron",
  "Ajah",
  "Sangotedo",
  "Ikoyi",
  "Victoria Island",
  "Yaba",
  "Surulere",
  "Ikeja GRA",
  "Maryland",
  "Gbagada",
  "Magodo",
  "Ogudu",
  "Festac",
  "Ilupeju",
] as const;

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "self_contain", label: "Self-contain" },
  { value: "mini_flat", label: "Mini flat (1-bed)" },
  { value: "flat", label: "Flat / apartment" },
  { value: "terrace", label: "Terrace duplex" },
  { value: "semi_detached", label: "Semi-detached duplex" },
  { value: "detached", label: "Detached duplex" },
  { value: "bungalow", label: "Bungalow" },
  { value: "penthouse", label: "Penthouse" },
];

export const PROPERTY_TYPE_LABEL = Object.fromEntries(
  PROPERTY_TYPES.map((p) => [p.value, p.label]),
) as Record<PropertyType, string>;

export const AMENITIES: { key: string; label: string; key_filter?: boolean }[] = [
  { key: "borehole", label: "Borehole water", key_filter: true },
  { key: "treated_water", label: "Water treatment", key_filter: false },
  { key: "power_24", label: "24-hr power support", key_filter: true },
  { key: "inverter", label: "Inverter / solar backup" },
  { key: "prepaid_meter", label: "Prepaid meter", key_filter: true },
  { key: "gated", label: "Gated estate / street", key_filter: true },
  { key: "security_guard", label: "Security guards" },
  { key: "cctv", label: "CCTV" },
  { key: "parking", label: "Parking", key_filter: true },
  { key: "good_road", label: "Tarred road access", key_filter: true },
  { key: "fitted_kitchen", label: "Fitted kitchen" },
  { key: "wardrobes", label: "Built-in wardrobes" },
  { key: "pop_ceiling", label: "POP ceiling" },
  { key: "bq", label: "Boys' quarters (BQ)" },
  { key: "pool", label: "Swimming pool" },
  { key: "gym", label: "Gym" },
  { key: "elevator", label: "Elevator" },
  { key: "serviced", label: "Serviced" },
  { key: "furnished", label: "Furnished" },
];

export const AMENITY_LABEL = Object.fromEntries(AMENITIES.map((a) => [a.key, a.label])) as Record<
  string,
  string
>;

export const KEY_AMENITY_FILTERS = AMENITIES.filter((a) => a.key_filter);

export const STATUS_OPTIONS: Record<Purpose, ListingStatus[]> = {
  rent: ["available", "under_offer", "rented", "paused", "unconfirmed"],
  sale: ["available", "under_offer", "sold", "paused", "unconfirmed"],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers can vary labels by purpose later
export function statusLabel(status: ListingStatus, purpose: Purpose): string {
  switch (status) {
    case "available":
      return "Available";
    case "under_offer":
      return "Under offer";
    case "rented":
      return "Rented";
    case "sold":
      return "Sold";
    case "paused":
      return "Paused";
    case "unconfirmed":
      return "Availability unconfirmed";
  }
}

export const STATUS_TONE: Record<ListingStatus, "green" | "amber" | "slate" | "red" | "orange"> = {
  available: "green",
  under_offer: "amber",
  rented: "slate",
  sold: "slate",
  paused: "slate",
  unconfirmed: "orange",
};

export const OCCUPANCY_LABEL: Record<Occupancy, string> = {
  vacant: "Vacant",
  owner_occupied: "Owner-occupied",
  tenant_occupied: "Tenant in place",
};

export const ROLE_LABEL: Record<Role, string> = {
  seeker: "Home seeker",
  owner: "Property owner",
  agent: "Agent",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  seeker: "I'm looking for a home to rent or buy",
  owner: "I'm listing a home I own",
  agent: "I'm an agent managing listings I'm authorized to represent",
};

export const CHECK_STATE_LABEL: Record<CheckState, string> = {
  not_started: "Not started",
  submitted: "Submitted · not yet reviewed",
  demo_reviewed: "Sample review only · not a real check",
  self_declared: "Self-declared by lister",
};

export type CheckKind = "identity" | "agentLicensing" | "ownerAuthorization" | "ownerDeclaration" | "documentReview" | "availability";

/**
 * Exact wording per check, so a badge always says what it refers to and how far it went.
 * Nothing in the prototype is ever "verified"; the strongest state is a labelled demo review.
 */
export const CHECK_WORDING: Record<CheckKind, Record<CheckState, string>> = {
  identity: {
    not_started: "ID not submitted",
    submitted: "ID submitted · not yet reviewed",
    demo_reviewed: "ID reviewed (sample only · not a real check)",
    self_declared: "Identity self-declared",
  },
  agentLicensing: {
    not_started: "Agent licence not submitted",
    submitted: "Agent licence submitted · not yet reviewed",
    demo_reviewed: "Agent licence reviewed (sample only · not a real check)",
    self_declared: "Agent licence self-declared",
  },
  ownerAuthorization: {
    not_started: "No owner authorization on file",
    submitted: "Owner authorization submitted · not yet reviewed",
    demo_reviewed: "Owner authorization reviewed (sample only · not a real check)",
    self_declared: "Owner authorization self-declared",
  },
  ownerDeclaration: {
    not_started: "Ownership not declared",
    submitted: "Ownership documents submitted · not yet reviewed",
    demo_reviewed: "Ownership reviewed (sample only · not a real check)",
    self_declared: "Lister says they own this home",
  },
  documentReview: {
    not_started: "No property documents submitted",
    submitted: "Documents submitted · not yet reviewed",
    demo_reviewed: "Documents reviewed (sample only) · title not confirmed",
    self_declared: "Documents self-declared",
  },
  availability: {
    not_started: "Availability not confirmed",
    submitted: "Availability submitted",
    demo_reviewed: "Availability reviewed (sample only)",
    self_declared: "Lister confirmed it's available",
  },
};

/** Listings marked "available" but not reconfirmed within this window show as unconfirmed. */
export const STALE_AFTER_DAYS = 30;

export const BUDGET_PRESETS: Record<Purpose, { label: string; min?: number; max?: number }[]> = {
  rent: [
    { label: "Under ₦2M/yr", max: 2_000_000 },
    { label: "₦2M – ₦5M", min: 2_000_000, max: 5_000_000 },
    { label: "₦5M – ₦10M", min: 5_000_000, max: 10_000_000 },
    { label: "₦10M+", min: 10_000_000 },
  ],
  sale: [
    { label: "Under ₦80M", max: 80_000_000 },
    { label: "₦80M – ₦200M", min: 80_000_000, max: 200_000_000 },
    { label: "₦200M – ₦500M", min: 200_000_000, max: 500_000_000 },
    { label: "₦500M+", min: 500_000_000 },
  ],
};

/** Plain status names for viewing requests and message threads. */
export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  accepted: "Accepted",
  reschedule: "Reschedule requested",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  responded: "Replied",
  closed: "Closed",
};

export const INQUIRY_STATUS_TONE: Record<InquiryStatus, "amber" | "green" | "orange" | "slate" | "blue" | "red"> = {
  new: "amber",
  accepted: "green",
  reschedule: "orange",
  completed: "blue",
  declined: "slate",
  cancelled: "slate",
  responded: "green",
  closed: "slate",
};

/** Viewings that are still going ahead (shown as upcoming). */
export const OPEN_VIEWING: InquiryStatus[] = ["new", "accepted", "reschedule", "responded"];

export const REPORT_REASONS: { value: ReportReason; label: string; help: string }[] = [
  { value: "scam", label: "Suspected scam", help: "For example: asked to pay before viewing, the lister can't show the home, or the details don't add up." },
  { value: "duplicate", label: "Duplicate listing", help: "The same home is listed more than once." },
  { value: "price", label: "Incorrect price", help: "The rent, price or fees shown don't match what you were told." },
  { value: "unavailable", label: "Home not available", help: "It's already let or sold, or the lister says it isn't available." },
];

export const REPORT_REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])) as Record<ReportReason, string>;

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  under_review: "Under review",
  resolved: "Resolved",
};
