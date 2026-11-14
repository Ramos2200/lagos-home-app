export type Purpose = "rent" | "sale";

export type ListingStatus =
  | "available"
  | "under_offer"
  | "rented" // rent only
  | "sold" // sale only
  | "paused"
  | "unconfirmed";

/** Occupancy is tracked separately from availability. */
export type Occupancy = "vacant" | "owner_occupied" | "tenant_occupied";

export type RentFrequency = "annual" | "monthly" | "quarterly";

export type PropertyType =
  | "self_contain"
  | "mini_flat"
  | "flat"
  | "terrace"
  | "semi_detached"
  | "detached"
  | "bungalow"
  | "penthouse";

export type Role = "seeker" | "owner" | "agent";

/**
 * Trust checks are deliberately separate. In this prototype no check is ever
 * really performed, so the strongest state is "demo_reviewed", which the UI
 * always labels as a demo — never as "verified".
 */
export type CheckState = "not_started" | "submitted" | "demo_reviewed" | "self_declared";

export interface TrustCheck {
  state: CheckState;
  date?: string; // ISO date (yyyy-mm-dd)
}

export interface OtherCost {
  label: string;
  amount: number;
  /** True for costs paid every period (e.g. a monthly diesel levy). Missing means a one-off cost. */
  recurring?: boolean;
  frequency?: RentFrequency;
}

export interface ListingCosts {
  agencyFee?: number;
  legalFee?: number;
  cautionDeposit?: number;
  serviceCharge?: number;
  serviceChargeFrequency?: RentFrequency;
  other?: OtherCost[];
}

export interface PricePoint {
  date: string; // ISO date
  price: number;
  note?: string;
}

export interface ListingDetails {
  water: string;
  power: string;
  security: string;
  parking: string;
  roadAccess: string;
  /** What the lister says about flooding on the street or estate. Missing = "Not provided". */
  flooding?: string;
  /** Schools, markets, hospitals or bus stops nearby, as described by the lister. */
  nearby?: string;
}

export interface Listing {
  id: string;
  title: string;
  purpose: Purpose;
  propertyType: PropertyType;
  area: string;
  estate?: string;
  landmark?: string;
  streetHint?: string;
  price: number;
  rentFrequency?: RentFrequency;
  costs: ListingCosts;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  sizeSqm?: number;
  amenities: string[];
  details: ListingDetails;
  status: ListingStatus;
  occupancy: Occupancy;
  availableFrom: string;
  lastConfirmed: string;
  description: string;
  ownerId: string;
  ownerDisplayName?: string; // for agent-managed listings where owner has no account
  agentId?: string;
  listedBy: "owner" | "agent";
  checks: {
    ownerAuthorization: TrustCheck;
    documentReview: TrustCheck;
    availabilityConfirmation: TrustCheck;
  };
  priceHistory: PricePoint[];
  photoSeed: number;
  createdAt: string;
  updatedAt: string;
  /** Exact time of the last change (ISO date-time), used to flag updates for saved searches. */
  modifiedAt?: string;
  isDemo: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: Role[];
  activeRole: Role;
  agencyName?: string;
  bio?: string;
  areasServed?: string[];
  checks: {
    identity: TrustCheck;
    agentLicensing?: TrustCheck;
  };
  createdAt: string;
  isDemo: boolean;
  /** What a home seeker told us during onboarding. */
  preferences?: SeekerPreferences;
  checklistDismissed?: boolean;
  /** Demo staff account that can use the moderation queue. Not a real staff login. */
  isStaff?: boolean;
}

export interface SeekerPreferences {
  mode: Purpose;
  areas: string[];
  min?: number;
  max?: number;
  beds?: number;
}

export interface SavedSearch {
  id: string;
  userId: string | null;
  label: string;
  query: string; // URL query string for /search
  createdAt: string;
  /** When the person last looked at this search's matches (ISO date-time). */
  lastSeenAt?: string;
}

export type InquiryType = "viewing" | "message";
/**
 * Viewings: new → accepted / reschedule / declined → completed; "cancelled" is set by the person who asked.
 * Messages: new → responded → closed.
 */
export type InquiryStatus = "new" | "accepted" | "reschedule" | "completed" | "declined" | "cancelled" | "responded" | "closed";

export interface ChatMessage {
  id: string;
  from: "seeker" | "lister" | "system";
  text: string;
  at: string; // ISO date-time
}

export interface Inquiry {
  id: string;
  listingId: string;
  type: InquiryType;
  fromUserId?: string;
  name: string;
  /** Phone or email. Only shown to the lister when `shareContact` is true. */
  contact: string;
  shareContact?: boolean;
  /** The lister chose to share their own contact details in this conversation. */
  listerShared?: boolean;
  message: string;
  preferredDate?: string;
  preferredTime?: string;
  /** Set when the lister asks for a different time. */
  proposedDate?: string;
  proposedTime?: string;
  status: InquiryStatus;
  createdAt: string;
  messages?: ChatMessage[];
  seekerReadAt?: string;
  listerReadAt?: string;
}

export interface AppData {
  version: number;
  listings: Listing[];
  users: User[];
  inquiries: Inquiry[];
  currentUserId: string | null;
  savedListingIds: string[];
  /** Private notes on saved homes, by listing id. Kept in this browser only and never shown to listers. */
  savedNotes: Record<string, string>;
  savedSearches: SavedSearch[];
  /** Listing pages opened in this browser, newest first, per signed-in person (null = guest). */
  recentlyViewed: RecentView[];
  /** Demo metric: how many times each listing page was opened in this browser. Not real visitors. */
  viewCounts: Record<string, number>;
  /** Reports about listings from visitors, reviewed by demo staff. */
  reports: ListingReport[];
}

export interface RecentView {
  userId: string | null;
  listingId: string;
  viewedAt: string; // ISO date-time
}

export type ReportReason = "scam" | "duplicate" | "price" | "unavailable";
export type ReportStatus = "open" | "under_review" | "resolved";

export interface ReportEvent {
  at: string; // ISO date-time
  by: string; // display name
  status?: ReportStatus;
  note?: string;
}

export interface ListingReport {
  id: string;
  listingId: string;
  reason: ReportReason;
  details: string;
  /** For duplicates: the listing this one seems to copy. */
  duplicateOfId?: string;
  /** For price reports: the price the reporter believes is right, if they know it. */
  suggestedPrice?: number;
  reporterUserId?: string;
  reporterName: string;
  status: ReportStatus;
  createdAt: string; // ISO date-time
  history: ReportEvent[];
}
