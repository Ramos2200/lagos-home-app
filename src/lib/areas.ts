import { LAGOS_AREAS } from "./constants";

/**
 * How people in Lagos commonly talk about places. Each alias maps to the
 * neighbourhoods it usually covers, so "Lekki" also finds Ikate, Chevron and Ajah.
 */
export const AREA_GROUPS: { name: string; aliases: string[]; areas: string[]; hint: string }[] = [
  {
    name: "Lekki (corridor)",
    aliases: ["lekki", "lekki corridor", "lekki axis"],
    areas: ["Lekki Phase 1", "Ikate", "Chevron", "Ajah", "Sangotedo"],
    hint: "Lekki Phase 1, Ikate, Chevron, Ajah, Sangotedo",
  },
  {
    name: "The Island",
    aliases: ["island", "the island", "lagos island"],
    areas: ["Ikoyi", "Victoria Island", "Lekki Phase 1", "Ikate", "Chevron", "Ajah", "Sangotedo"],
    hint: "Ikoyi, VI and the Lekki corridor",
  },
  {
    name: "The Mainland",
    aliases: ["mainland", "the mainland"],
    areas: ["Yaba", "Surulere", "Ikeja GRA", "Maryland", "Gbagada", "Magodo", "Ogudu", "Festac", "Ilupeju"],
    hint: "Yaba, Surulere, Ikeja, Gbagada, Magodo and more",
  },
  {
    name: "Ikeja",
    aliases: ["ikeja"],
    areas: ["Ikeja GRA", "Maryland", "Ilupeju", "Ogudu", "Magodo"],
    hint: "Ikeja GRA and nearby: Maryland, Ilupeju, Ogudu, Magodo",
  },
];

/** Short names and spellings people type for a single area. */
const AREA_NICKNAMES: Record<string, string[]> = {
  "Victoria Island": ["vi", "v.i", "v.i.", "vic island"],
  "Lekki Phase 1": ["lekki phase one", "lekki ph 1", "phase 1", "phase one", "lekki 1"],
  "Ikeja GRA": ["ikeja gra", "gra ikeja"],
  "Ajah": ["aja"],
  "Festac": ["festac town"],
  "Magodo": ["magodo gra"],
  "Ikate": ["ikate elegushi", "elegushi"],
};

/** Rough neighbours, used to suggest alternatives when a search finds nothing. */
export const NEARBY: Record<string, string[]> = {
  "Lekki Phase 1": ["Ikate", "Ikoyi", "Victoria Island", "Chevron"],
  Ikate: ["Lekki Phase 1", "Chevron", "Ajah"],
  Chevron: ["Ikate", "Ajah", "Lekki Phase 1"],
  Ajah: ["Sangotedo", "Chevron", "Ikate"],
  Sangotedo: ["Ajah", "Chevron"],
  Ikoyi: ["Victoria Island", "Lekki Phase 1"],
  "Victoria Island": ["Ikoyi", "Lekki Phase 1"],
  Yaba: ["Surulere", "Gbagada", "Ilupeju"],
  Surulere: ["Yaba", "Festac", "Ilupeju"],
  "Ikeja GRA": ["Maryland", "Ogudu", "Magodo"],
  Maryland: ["Ikeja GRA", "Gbagada", "Ilupeju", "Ogudu"],
  Gbagada: ["Maryland", "Yaba", "Ogudu"],
  Magodo: ["Ogudu", "Ikeja GRA"],
  Ogudu: ["Magodo", "Maryland", "Gbagada"],
  Festac: ["Surulere"],
  Ilupeju: ["Maryland", "Yaba", "Surulere"],
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\bone\b/g, "1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a free-text query to a set of areas when it names an area, a nickname
 * or a group. Returns null when the query is something else (an estate, a landmark…).
 */
export function resolveAreas(q: string): string[] | null {
  const n = normalize(q);
  if (!n) return null;
  for (const g of AREA_GROUPS) if (g.aliases.map(normalize).includes(n)) return g.areas;
  for (const a of LAGOS_AREAS) {
    if (normalize(a) === n) return [a];
    if ((AREA_NICKNAMES[a] ?? []).map(normalize).includes(n)) return [a];
  }
  return null;
}

export interface Suggestion {
  label: string;
  hint?: string;
  value: string;
  kind: "group" | "area" | "estate" | "landmark";
}

/** Type-ahead suggestions from areas, groups, nicknames, and estates/landmarks in the data. */
export function suggest(q: string, extras: { estates: string[]; landmarks: string[] }): Suggestion[] {
  const n = normalize(q);
  if (n.length < 1) return [];
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    if (seen.has(s.label)) return;
    seen.add(s.label);
    out.push(s);
  };
  for (const g of AREA_GROUPS) {
    if (g.aliases.some((a) => normalize(a).startsWith(n) || n.startsWith(normalize(a)))) {
      push({ label: g.name, hint: g.hint, value: g.aliases[0], kind: "group" });
    }
  }
  for (const a of LAGOS_AREAS) {
    const names = [a, ...(AREA_NICKNAMES[a] ?? [])].map(normalize);
    if (names.some((x) => x.includes(n))) push({ label: a, hint: "Area", value: a, kind: "area" });
  }
  // Estates and landmarks match on the start of a word ("adm" → "Admiralty Way"), max two each.
  const wordStart = (s: string) => normalize(s).split(" ").some((w) => w.startsWith(n)) || (n.length >= 4 && normalize(s).includes(n));
  extras.estates.filter(wordStart).slice(0, 2).forEach((e) => push({ label: e, hint: "Estate", value: e.replace(/ \(fictional\)$/, ""), kind: "estate" }));
  extras.landmarks
    .filter((l) => wordStart(l.replace(/^(Near|Close to) /i, "")))
    .slice(0, 2)
    .forEach((l) => push({ label: l, hint: "Landmark", value: l.replace(/^(Near|Close to) /i, ""), kind: "landmark" }));
  return out.slice(0, 7);
}

/** Areas to suggest when a search returns nothing. */
export function nearbyAreasFor(q: string): string[] {
  const areas = resolveAreas(q);
  if (!areas) return [];
  const set = new Set<string>();
  for (const a of areas) for (const b of NEARBY[a] ?? []) if (!areas.includes(b)) set.add(b);
  return [...set].slice(0, 4);
}

/** Turns a list of areas into a short search query, e.g. all Lekki-corridor areas + Yaba → "Lekki, Yaba". */
export function areasToQuery(areas: string[]): string {
  let rest = [...areas];
  const parts: string[] = [];
  for (const g of AREA_GROUPS.slice(0, 1).concat(AREA_GROUPS.slice(2, 3))) {
    if (g.areas.every((a) => rest.includes(a))) {
      parts.push(g.aliases[0][0].toUpperCase() + g.aliases[0].slice(1));
      rest = rest.filter((a) => !g.areas.includes(a));
    }
  }
  return [...parts, ...rest].join(", ");
}

/** Destinations used in the rough travel guide on listing pages. */
export const TRAVEL_DESTINATIONS = ["Victoria Island", "Ikeja", "Lekki Phase 1"] as const;

/**
 * Rough drive times in minutes, [quiet roads, rush hour], from each area to the destinations above.
 * A hand-made guide for the prototype — NOT live traffic, and real Lagos journeys vary a lot.
 * null means the home is already in or next to that destination.
 */
export const TRAVEL_GUIDE: Record<string, [[number, number] | null, [number, number] | null, [number, number] | null]> = {
  "Lekki Phase 1": [[15, 45], [45, 120], null],
  Ikate: [[20, 60], [50, 130], [10, 25]],
  Chevron: [[25, 75], [55, 140], [15, 40]],
  Ajah: [[35, 100], [65, 160], [25, 70]],
  Sangotedo: [[45, 120], [75, 180], [35, 90]],
  Ikoyi: [[10, 30], [40, 110], [15, 40]],
  "Victoria Island": [null, [40, 110], [15, 45]],
  Yaba: [[25, 75], [30, 80], [35, 90]],
  Surulere: [[25, 75], [30, 80], [35, 95]],
  Gbagada: [[30, 90], [20, 60], [40, 110]],
  Maryland: [[35, 100], [15, 40], [45, 120]],
  "Ikeja GRA": [[40, 110], null, [50, 130]],
  Magodo: [[45, 120], [25, 70], [55, 140]],
  Ogudu: [[35, 100], [20, 55], [45, 120]],
  Festac: [[40, 120], [45, 120], [50, 140]],
  Ilupeju: [[30, 90], [20, 50], [40, 110]],
};

export interface AreaNote {
  side: "Island" | "Mainland";
  /** One-line summary for tiles. */
  tagline: string;
  /** A short general overview. Written for this demo — not local research. */
  overview: string;
  /** Things renters and buyers commonly ask about here. */
  askAbout: string[];
}

/** General notes for area guides. Demo content: always shown with a note saying so. */
export const AREA_NOTES: Record<string, AreaNote> = {
  "Lekki Phase 1": { side: "Island", tagline: "Estates, restaurants and offices", overview: "A busy, well-known part of the Lekki corridor with gated closes, serviced flats and plenty of shops and restaurants. Popular with people working on the Island.", askAbout: ["Flooding on main roads after heavy rain", "Service charge and what it covers", "Traffic on Admiralty Way and the Lekki–Epe Expressway"] },
  Ikate: { side: "Island", tagline: "Newer estates off the expressway", overview: "Sits along the Lekki–Epe Expressway between Lekki Phase 1 and Chevron, with many newer estates and terraces.", askAbout: ["Estate road condition", "Estate power arrangements", "Rush-hour access to the expressway"] },
  Chevron: { side: "Island", tagline: "Family estates, quieter streets", overview: "Named after the large office campus nearby. Mostly residential estates, with schools and shopping a short drive away.", askAbout: ["Drainage at estate entrances", "Generator hours and diesel levies", "School runs in rush hour"] },
  Ajah: { side: "Island", tagline: "More space for the money", overview: "Further along the Lekki corridor, with a wide mix of estates and lower rents than Lekki Phase 1. Traffic towards the Island can be heavy.", askAbout: ["Flooding on access roads in the rainy season", "Daily travel time to work", "Estate security and gates"] },
  Sangotedo: { side: "Island", tagline: "Growing area, newer builds", overview: "A fast-growing area beyond Ajah with many new homes and plots. Roads and services are still developing in places.", askAbout: ["Untarred or unfinished roads", "Water and power supply", "Distance to markets and schools"] },
  Ikoyi: { side: "Island", tagline: "Leafy, central and premium", overview: "One of the most central and expensive parts of Lagos, with apartment blocks, serviced flats and older large plots close to VI.", askAbout: ["Service charges, which can be high", "Parking allocation", "Building management and power backup"] },
  "Victoria Island": { side: "Island", tagline: "Business district living", overview: "A major business and nightlife district. Homes are mostly apartments and penthouses close to offices, hotels and restaurants.", askAbout: ["Noise and traffic around busy streets", "Service charge and diesel costs", "Flooding on some streets in heavy rain"] },
  Yaba: { side: "Mainland", tagline: "Campuses, tech hubs, good transport", overview: "Central Mainland area known for universities, tech hubs and markets. Popular with students and young professionals, with good bus links.", askAbout: ["Water source (borehole or not)", "Prepaid meter and power hours", "Street noise near markets"] },
  Surulere: { side: "Mainland", tagline: "Central, established and lively", overview: "A large, long-established Mainland district with a mix of older blocks and newer flats, and easy access to Yaba and the Island bridges.", askAbout: ["Age and condition of the building", "Street parking", "Shared generator arrangements"] },
  "Ikeja GRA": { side: "Mainland", tagline: "Quiet streets near the airport", overview: "A planned residential area in Ikeja with bigger plots and quieter streets, close to the airport, malls and offices.", askAbout: ["Power backup for larger homes", "Security on the street", "Commute to the Island"] },
  Maryland: { side: "Mainland", tagline: "Well connected, mid-range", overview: "A busy junction area linking Ikeja, Gbagada and the Island routes, with flats close to the mall and transport.", askAbout: ["Traffic around the junction", "Block security", "Water supply"] },
  Gbagada: { side: "Mainland", tagline: "Practical and central", overview: "A residential Mainland area between Ikeja and the Third Mainland Bridge, with phases of estates and good access to the Island.", askAbout: ["Road condition on side streets", "Flooding in low-lying streets", "Bridge traffic at rush hour"] },
  Magodo: { side: "Mainland", tagline: "Gated family estates", overview: "Largely made up of gated estates with schools inside or nearby. Popular with families wanting space on the Mainland.", askAbout: ["Estate dues and what they cover", "Distance to the main road", "Gate rules for visitors"] },
  Ogudu: { side: "Mainland", tagline: "Calm GRA close to the bridge", overview: "A quiet residential area with a GRA, close to the Third Mainland Bridge and the Ikorodu Road routes.", askAbout: ["Street flooding", "Estate security", "Access roads in the rainy season"] },
  Festac: { side: "Mainland", tagline: "Planned town, lower rents", overview: "A large planned town with numbered avenues and closes. Rents are usually lower, and some tenancies are paid quarterly.", askAbout: ["Which avenues flood in heavy rain", "Payment terms (quarterly or yearly)", "Travel time to the Island"] },
  Ilupeju: { side: "Mainland", tagline: "Mixed homes and industry", overview: "A mix of residential streets and light industry near Maryland and Yaba, with good road links.", askAbout: ["Noise from nearby businesses", "Road access", "Power supply"] },
};
