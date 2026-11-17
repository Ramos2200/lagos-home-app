"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatDate, todayISO, uid } from "./format";
import { DATA_VERSION, SEED_LOCAL_NOTES, createSeedData } from "./seed";
import type { AppData, Inquiry, InquiryStatus, Listing, ListingReport, ListingStatus, ReportStatus, Role, SavedSearch, SeekerPreferences, SeekerProfile, TrustCheck, User } from "./types";

const STORAGE_KEY = "lagos-homes-demo-v1";

type NewListing = Omit<
  Listing,
  "id" | "createdAt" | "updatedAt" | "priceHistory" | "checks" | "isDemo" | "photoSeed" | "lastConfirmed"
> & { checks?: Partial<Listing["checks"]> };

interface StoreApi {
  ready: boolean;
  data: AppData;
  currentUser: User | null;
  // session
  signIn: (userId: string) => void;
  signOut: () => void;
  signUp: (input: { name: string; email: string; phone?: string; roles: Role[]; agencyName?: string }) => User;
  addRole: (role: Role) => void;
  setActiveRole: (role: Role) => void;
  updateProfile: (patch: Partial<Pick<User, "name" | "email" | "phone" | "agencyName" | "bio" | "areasServed">>) => void;
  setUserCheck: (key: keyof User["checks"], check: TrustCheck) => void;
  // listings
  createListing: (input: NewListing) => Listing;
  updateListing: (id: string, patch: Partial<Listing>, priceNote?: string) => void;
  setListingStatus: (id: string, status: ListingStatus) => void;
  confirmAvailability: (id: string) => void;
  setListingCheck: (id: string, key: keyof Listing["checks"], check: TrustCheck) => void;
  // inquiries
  /** Creates a viewing request or message thread and returns its id. */
  addInquiry: (input: Omit<Inquiry, "id" | "status" | "createdAt">) => string;
  setInquiryStatus: (id: string, status: InquiryStatus) => void;
  /** Changes a viewing's status and records it in the conversation. */
  updateViewing: (
    id: string,
    status: InquiryStatus,
    note: string | undefined,
    by: "seeker" | "lister",
    proposal?: { date?: string; time?: string },
  ) => void;
  sendMessage: (id: string, from: "seeker" | "lister", text: string) => void;
  markThreadRead: (id: string, side: "seeker" | "lister") => void;
  /** The seeker or the lister chooses to reveal their own contact details in a thread. */
  shareContact: (id: string, side: "seeker" | "lister", value?: string) => void;
  markSearchSeen: (id: string) => void;
  /** A visitor reports a listing. Stored in this browser only — nothing is sent anywhere. */
  addReport: (input: Omit<ListingReport, "id" | "status" | "createdAt" | "history">) => string;
  /** Demo staff change a report's status and/or add a note. */
  updateReport: (id: string, status: ReportStatus | undefined, note: string | undefined, by: string) => void;
  /** Adds a demo staff account to existing data (only when someone asks for it). */
  createStaffUser: () => string;
  toggleSaved: (listingId: string) => void;
  /** Private note on a saved home; an empty note removes it. */
  setSavedNote: (listingId: string, note: string) => void;
  setPreferences: (p: SeekerPreferences) => void;
  /** Saves the signed-in person's renter/buyer profile for reuse on viewing requests. */
  saveSeekerProfile: (p: SeekerProfile) => void;
  dismissChecklist: () => void;
  saveSearch: (label: string, query: string) => SavedSearch;
  deleteSearch: (id: string) => void;
  /** Records that the current person (or a guest) opened a listing page, in this browser only. */
  recordView: (listingId: string) => void;
  clearRecentlyViewed: () => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

/** Plain-language line added to a conversation when a viewing's status changes. */
function viewingEventText(status: InquiryStatus, i: Inquiry, proposal?: { date?: string; time?: string }): string {
  const when = (d?: string, t?: string) => [d ? formatDate(d) : null, t?.toLowerCase()].filter(Boolean).join(", ") || "a time to be agreed";
  switch (status) {
    case "accepted":
      return i.proposedDate ? `New time accepted: ${when(i.proposedDate, i.proposedTime)}.` : `Viewing accepted for ${when(i.preferredDate, i.preferredTime)}.`;
    case "reschedule":
      return `The lister asked to reschedule${proposal?.date || proposal?.time ? ` — suggested ${when(proposal?.date, proposal?.time)}` : ""}.`;
    case "completed":
      return "Viewing marked as completed.";
    case "declined":
      return "The lister declined this viewing request.";
    case "cancelled":
      return `${i.name} cancelled the viewing request.`;
    default:
      return "Status updated.";
  }
}

/** Fills in fields added in later versions, so saved demo data is kept rather than replaced. */
function migrate(parsed: AppData): AppData {
  return {
    ...parsed,
    version: DATA_VERSION,
    // Older inquiries had a single message: turn it into the first message of the conversation.
    inquiries: (parsed.inquiries ?? []).map((i) => ({
      ...i,
      messages: i.messages ?? (i.message?.trim() ? [{ id: `m-${i.id}`, from: "seeker" as const, text: i.message.trim(), at: `${i.createdAt}T09:00:00.000Z` }] : []),
    })),
    // The sample "Diesel levy (monthly)" was stored as a one-off cost; mark it as the monthly cost it is.
    listings: parsed.listings.map((l) => ({
      ...l,
      // Flooding and nearby-places notes were added later: fill them on sample listings that have never had them.
      details:
        l.isDemo && SEED_LOCAL_NOTES[l.id] && l.details.flooding === undefined && l.details.nearby === undefined
          ? { ...l.details, ...SEED_LOCAL_NOTES[l.id] }
          : l.details,
      costs: {
        ...l.costs,
        other: l.costs.other?.map((o) =>
          o.recurring === undefined && /\(monthly\)$/i.test(o.label) ? { ...o, label: o.label.replace(/\s*\(monthly\)$/i, ""), recurring: true, frequency: "monthly" as const } : o,
        ),
      },
    })),
    savedListingIds: parsed.savedListingIds ?? [],
    savedNotes: parsed.savedNotes ?? {},
    savedSearches: parsed.savedSearches ?? [],
    recentlyViewed: parsed.recentlyViewed ?? [],
    viewCounts: parsed.viewCounts ?? {},
    reports: parsed.reports ?? [],
  };
}

/** Uses saved data whenever there is any; seeds sample data only when nothing usable is saved. */
function load(): AppData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return createSeedData(); // storage unavailable: run in memory
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppData;
      if (Array.isArray(parsed.listings) && Array.isArray(parsed.users) && parsed.users.length) return migrate(parsed);
    } catch {
      // unreadable — fall through, but keep a copy first
    }
    try {
      localStorage.setItem(`${STORAGE_KEY}-unreadable-backup`, raw);
    } catch {}
  }
  return createSeedData();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => ({
    version: DATA_VERSION,
    listings: [],
    users: [],
    inquiries: [],
    currentUserId: null,
    savedListingIds: [],
    savedNotes: {},
    savedSearches: [],
    recentlyViewed: [],
    viewCounts: {},
    reports: [],
  }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load from localStorage once, on the client only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(load());
    setReady(true);
  }, []);

  useEffect(() => {
    // Only persist after the saved data has been loaded, so the empty initial state never overwrites it.
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage may be full or blocked; the demo keeps working in memory
    }
  }, [data, ready]);

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === data.currentUserId) ?? null,
    [data.users, data.currentUserId],
  );

  const mutateUser = useCallback((fn: (u: User) => User) => {
    setData((d) => ({
      ...d,
      users: d.users.map((u) => (u.id === d.currentUserId ? fn(u) : u)),
    }));
  }, []);

  const mutateListing = useCallback((id: string, fn: (l: Listing) => Listing) => {
    setData((d) => ({ ...d, listings: d.listings.map((l) => (l.id === id ? fn(l) : l)) }));
  }, []);

  const api: StoreApi = {
    ready,
    data,
    currentUser,
    signIn: (userId) => setData((d) => ({ ...d, currentUserId: userId })),
    signOut: () => setData((d) => ({ ...d, currentUserId: null })),
    signUp: (input) => {
      const user: User = {
        id: uid("u"),
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || undefined,
        roles: input.roles,
        activeRole: input.roles[0],
        agencyName: input.agencyName?.trim() || undefined,
        checks: {
          identity: { state: "not_started" },
          ...(input.roles.includes("agent") ? { agentLicensing: { state: "not_started" as const } } : {}),
        },
        createdAt: todayISO(),
        isDemo: true,
      };
      setData((d) => ({ ...d, users: [...d.users, user], currentUserId: user.id }));
      return user;
    },
    addRole: (role) =>
      mutateUser((u) =>
        u.roles.includes(role)
          ? { ...u, activeRole: role }
          : {
              ...u,
              roles: [...u.roles, role],
              activeRole: role,
              checks:
                role === "agent" && !u.checks.agentLicensing
                  ? { ...u.checks, agentLicensing: { state: "not_started" } }
                  : u.checks,
            },
      ),
    setActiveRole: (role) => mutateUser((u) => ({ ...u, activeRole: role })),
    updateProfile: (patch) => mutateUser((u) => ({ ...u, ...patch })),
    setUserCheck: (key, check) => mutateUser((u) => ({ ...u, checks: { ...u.checks, [key]: check } })),

    createListing: (input) => {
      const today = todayISO();
      const { checks, ...rest } = input;
      const listing: Listing = {
        ...rest,
        id: uid("lst"),
        checks: {
          ownerAuthorization:
            checks?.ownerAuthorization ??
            (input.listedBy === "owner" ? { state: "self_declared", date: today } : { state: "not_started" }),
          documentReview: checks?.documentReview ?? { state: "not_started" },
          availabilityConfirmation: { state: "self_declared", date: today },
        },
        priceHistory: [{ date: today, price: input.price, note: "First listed" }],
        photoSeed: Math.floor(Math.random() * 1000),
        lastConfirmed: today,
        createdAt: today,
        updatedAt: today,
        modifiedAt: new Date().toISOString(),
        isDemo: true,
      };
      setData((d) => ({ ...d, listings: [listing, ...d.listings] }));
      return listing;
    },
    updateListing: (id, patch, priceNote) =>
      mutateListing(id, (l) => {
        const today = todayISO();
        const priceChanged = patch.price !== undefined && patch.price !== l.price;
        return {
          ...l,
          ...patch,
          priceHistory: priceChanged
            ? [...l.priceHistory, { date: today, price: patch.price!, note: priceNote?.trim() || undefined }]
            : l.priceHistory,
          updatedAt: today,
          modifiedAt: new Date().toISOString(),
        };
      }),
    setListingStatus: (id, status) =>
      mutateListing(id, (l) => {
        const today = todayISO();
        // Setting "available" is itself a confirmation by the lister.
        const confirm = status === "available";
        return {
          ...l,
          status,
          updatedAt: today,
          modifiedAt: new Date().toISOString(),
          ...(confirm
            ? { lastConfirmed: today, checks: { ...l.checks, availabilityConfirmation: { state: "self_declared", date: today } } }
            : {}),
        };
      }),
    confirmAvailability: (id) =>
      mutateListing(id, (l) => {
        const today = todayISO();
        return {
          ...l,
          status: l.status === "unconfirmed" ? "available" : l.status,
          lastConfirmed: today,
          updatedAt: today,
          modifiedAt: new Date().toISOString(),
          checks: { ...l.checks, availabilityConfirmation: { state: "self_declared", date: today } },
        };
      }),
    setListingCheck: (id, key, check) =>
      mutateListing(id, (l) => ({ ...l, checks: { ...l.checks, [key]: check } })),

    addInquiry: (input) => {
      const now = new Date().toISOString();
      const id = uid("inq");
      const first = input.message.trim() ? [{ id: uid("m"), from: "seeker" as const, text: input.message.trim(), at: now }] : [];
      setData((d) => ({
        ...d,
        inquiries: [{ ...input, id, status: "new", createdAt: todayISO(), messages: first, seekerReadAt: now }, ...d.inquiries],
      }));
      return id;
    },
    setInquiryStatus: (id, status) =>
      setData((d) => ({ ...d, inquiries: d.inquiries.map((i) => (i.id === id ? { ...i, status } : i)) })),
    updateViewing: (id, status, note, by, proposal) =>
      setData((d) => ({
        ...d,
        inquiries: d.inquiries.map((i) => {
          if (i.id !== id) return i;
          const now = new Date().toISOString();
          const extra = note?.trim() ? [{ id: uid("m"), from: by, text: note.trim(), at: now }] : [];
          const sys = { id: uid("m"), from: "system" as const, text: viewingEventText(status, i, proposal), at: now };
          return {
            ...i,
            status,
            ...(status === "reschedule" && proposal ? { proposedDate: proposal.date, proposedTime: proposal.time } : {}),
            // Accepting a proposed time makes it the agreed time.
            ...(status === "accepted" && by === "seeker" && i.proposedDate
              ? { preferredDate: i.proposedDate, preferredTime: i.proposedTime, proposedDate: undefined, proposedTime: undefined }
              : {}),
            messages: [...(i.messages ?? []), sys, ...extra],
            ...(by === "lister" ? { listerReadAt: now } : { seekerReadAt: now }),
          };
        }),
      })),
    sendMessage: (id, from, text) =>
      setData((d) => ({
        ...d,
        inquiries: d.inquiries.map((i) => {
          if (i.id !== id || !text.trim()) return i;
          const now = new Date().toISOString();
          return {
            ...i,
            // A reply from the lister moves a new message thread to "replied".
            status: from === "lister" && i.type === "message" && i.status === "new" ? "responded" : i.status,
            messages: [...(i.messages ?? []), { id: uid("m"), from, text: text.trim(), at: now }],
            ...(from === "lister" ? { listerReadAt: now } : { seekerReadAt: now }),
          };
        }),
      })),
    markThreadRead: (id, side) =>
      setData((d) => ({
        ...d,
        inquiries: d.inquiries.map((i) => (i.id === id ? { ...i, [side === "lister" ? "listerReadAt" : "seekerReadAt"]: new Date().toISOString() } : i)),
      })),
    shareContact: (id, side, value) =>
      setData((d) => ({
        ...d,
        inquiries: d.inquiries.map((i) => {
          if (i.id !== id) return i;
          const now = new Date().toISOString();
          const text = side === "seeker" ? `${i.name} shared their contact details.` : "The lister shared their contact details.";
          return {
            ...i,
            ...(side === "seeker" ? { shareContact: true, contact: value ?? i.contact } : { listerShared: true }),
            messages: [...(i.messages ?? []), { id: uid("m"), from: "system" as const, text, at: now }],
          };
        }),
      })),
    toggleSaved: (listingId) =>
      setData((d) => ({
        ...d,
        savedListingIds: d.savedListingIds.includes(listingId)
          ? d.savedListingIds.filter((x) => x !== listingId)
          : [...d.savedListingIds, listingId],
      })),
    setSavedNote: (listingId, note) =>
      setData((d) => {
        const savedNotes = { ...d.savedNotes };
        if (note.trim()) savedNotes[listingId] = note.trim();
        else delete savedNotes[listingId];
        return { ...d, savedNotes };
      }),
    setPreferences: (p) => mutateUser((u) => ({ ...u, preferences: p })),
    saveSeekerProfile: (p) => mutateUser((u) => ({ ...u, seekerProfile: p })),
    dismissChecklist: () => mutateUser((u) => ({ ...u, checklistDismissed: true })),
    saveSearch: (label, query) => {
      const s: SavedSearch = { id: uid("ss"), userId: data.currentUserId, label, query, createdAt: todayISO(), lastSeenAt: new Date().toISOString() };
      setData((d) => ({ ...d, savedSearches: [s, ...d.savedSearches.filter((x) => !(x.query === query && x.userId === d.currentUserId))] }));
      return s;
    },
    deleteSearch: (id) => setData((d) => ({ ...d, savedSearches: d.savedSearches.filter((x) => x.id !== id) })),
    addReport: (input) => {
      const id = uid("rep");
      const now = new Date().toISOString();
      setData((d) => ({
        ...d,
        reports: [{ ...input, id, status: "open", createdAt: now, history: [{ at: now, by: input.reporterName, status: "open", note: "Report submitted" }] }, ...d.reports],
      }));
      return id;
    },
    updateReport: (id, status, note, by) =>
      setData((d) => ({
        ...d,
        reports: d.reports.map((r) =>
          r.id !== id
            ? r
            : {
                ...r,
                status: status ?? r.status,
                history: [...r.history, { at: new Date().toISOString(), by, ...(status && status !== r.status ? { status } : {}), ...(note?.trim() ? { note: note.trim() } : {}) }],
              },
        ),
      })),
    createStaffUser: () => {
      const existing = data.users.find((u) => u.isStaff);
      if (existing) return existing.id;
      const staff: User = {
        id: "u-staff-demo",
        name: "Demo Moderator",
        email: "moderator.demo@example.com",
        roles: ["seeker"],
        activeRole: "seeker",
        isStaff: true,
        checks: { identity: { state: "not_started" } },
        createdAt: todayISO(),
        isDemo: true,
      };
      setData((d) => (d.users.some((u) => u.isStaff) ? d : { ...d, users: [...d.users, staff] }));
      return staff.id;
    },
    markSearchSeen: (id) =>
      setData((d) => ({ ...d, savedSearches: d.savedSearches.map((s) => (s.id === id ? { ...s, lastSeenAt: new Date().toISOString() } : s)) })),
    recordView: (listingId) =>
      setData((d) => {
        const uidNow = d.currentUserId;
        const others = d.recentlyViewed.filter((v) => !(v.userId === uidNow && v.listingId === listingId));
        const mine = [{ userId: uidNow, listingId, viewedAt: new Date().toISOString() }, ...others.filter((v) => v.userId === uidNow)].slice(0, 20);
        return {
          ...d,
          recentlyViewed: [...mine, ...others.filter((v) => v.userId !== uidNow)],
          viewCounts: { ...d.viewCounts, [listingId]: (d.viewCounts[listingId] ?? 0) + 1 },
        };
      }),
    clearRecentlyViewed: () => setData((d) => ({ ...d, recentlyViewed: d.recentlyViewed.filter((v) => v.userId !== d.currentUserId) })),
    resetDemo: () => setData({ ...createSeedData() }),
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
