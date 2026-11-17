import { formatDate, naira } from "@/lib/format";
import type { Occupation, Purpose, SeekerProfile } from "@/lib/types";

export const OCCUPATION_LABEL: Record<Occupation, string> = {
  employed: "Employed",
  self_employed: "Self-employed / business owner",
  student: "Student",
  retired: "Retired",
  other: "Other",
};

export function hasProfile(p?: SeekerProfile): p is SeekerProfile {
  return !!p && (!!p.budget || !!p.moveInDate || !!p.householdSize || !!p.occupation);
}

/** What a renter or buyer chose to share with their viewing request. Shown to the lister. */
export function SeekerProfileView({ profile: p, purpose, byYou = false, className = "" }: { profile?: SeekerProfile; purpose?: Purpose; byYou?: boolean; className?: string }) {
  if (!hasProfile(p)) return null;
  const rows: [string, string][] = [];
  if (p.budget) rows.push(["Budget", `${naira(p.budget)}${purpose === "sale" ? " total" : " per year"}`]);
  if (p.moveInDate) rows.push([purpose === "sale" ? "Hopes to move by" : "Move-in date", formatDate(p.moveInDate)]);
  if (p.householdSize) rows.push(["Household", `${p.householdSize} ${p.householdSize === 1 ? "person" : "people"}`]);
  if (p.occupation) rows.push(["Work", OCCUPATION_LABEL[p.occupation]]);
  return (
    <div className={`rounded-xl bg-brand-50/60 p-3 ring-1 ring-brand-100 ${className}`}>
      <p className="text-xs font-bold tracking-wide text-brand-800 uppercase">{purpose === "sale" ? "Buyer profile" : "Renter profile"} · {byYou ? "you shared this" : "shared by them"}</p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-ink-500">{k}</dt>
            <dd className="font-medium text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-ink-500">Self-reported and not checked.</p>
    </div>
  );
}
