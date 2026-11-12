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
