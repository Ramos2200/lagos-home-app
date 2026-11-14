"use client";

import { useId, useState } from "react";
import { annualize, naira } from "@/lib/format";
import { costBreakdown, type CostLine } from "@/lib/listing-utils";
import type { Listing, RentFrequency } from "@/lib/types";
import { InfoIcon } from "./Icons";
import { MoneyField } from "./MoneyField";

/**
 * "Can I afford this?" — a quick calculator on the listing page.
 * Uses only the amounts the lister entered; anything they left blank is named, never counted as zero.
 * The pay figure stays in this page only: it is not saved or sent anywhere.
 */
export function AffordabilityCalculator({ listing }: { listing: Listing }) {
  return listing.purpose === "rent" ? <RentCalculator listing={listing} /> : <MortgageCalculator listing={listing} />;
}

const known = (x: CostLine) => typeof x.amount === "number";
const pct = (n: number) => `${n < 10 ? n.toFixed(1) : Math.round(n)}%`;

/** Turns a cost line's "per year" / "per month" label back into a frequency so it can be annualized. */
function freqOf(per?: string): RentFrequency | undefined {
  return per === "per month" ? "monthly" : per === "per quarter" ? "quarterly" : per === "per year" ? "annual" : undefined;
}

function PayField({ id, value, onChange, who = "paying the rent" }: { id: string; value: string; onChange: (v: string) => void; who?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">Your monthly take-home pay</label>
      <MoneyField id={id} value={value} onChange={onChange} placeholder="e.g. 1,200,000" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">After tax, for everyone {who}. Stays on this page — it isn&apos;t saved or sent.</p>
    </div>
  );
}

/** Green / amber / red bar for "share of pay", with the rule-of-thumb mark at a third. */
function ShareBar({ share, label }: { share: number; label: string }) {
  const tone = share <= 33 ? "bg-brand-600" : share <= 45 ? "bg-amber-500" : "bg-red-600";
  const word = share <= 33 ? "Within the usual guide" : share <= 45 ? "Stretching" : "Above the usual guide";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-extrabold text-ink-900">{pct(share)}</span>
      </div>
      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand-200" role="img" aria-label={`${pct(share)} of take-home pay. ${word}.`}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(share, 100)}%` }} />
        <span className="absolute top-0 left-1/3 h-full w-0.5 bg-ink-900/40" aria-hidden />
      </div>
      <p className={`mt-1 text-xs font-semibold ${share <= 33 ? "text-brand-700" : share <= 45 ? "text-amber-800" : "text-red-700"}`}>{word}</p>
    </div>
  );
}

function NotProvided({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
      <InfoIcon className="mt-0.5 shrink-0" size={14} />
      <span>
        Not included because the lister didn&apos;t provide them: <b>{items.join(", ")}</b>. Ask before you commit — the real figures will be higher.
      </span>
    </p>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold tracking-tight text-ink-900">{value}</p>
      {sub && <p className="text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

function RentCalculator({ listing }: { listing: Listing }) {
  const id = useId();
  const [pay, setPay] = useState("");
  const b = costBreakdown(listing);
  // Yearly cost of everything paid every period (rent, service charge, recurring levies), from entered amounts.
  const yearly = b.recurring.filter(known).reduce((s, x) => s + annualize(x.amount ?? 0, freqOf(x.per) ?? "annual"), 0);
  const yearlyRent = annualize(listing.price, listing.rentFrequency);
  const monthlyPay = Number(pay) || 0;
  const yearPay = monthlyPay * 12;
  const upfront = b.firstPayment;

  return (
    <div className="space-y-4">
      <PayField id={`${id}-pay`} value={pay} onChange={setPay} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Rent per year" value={naira(yearlyRent)} sub={listing.rentFrequency && listing.rentFrequency !== "annual" ? `Paid ${listing.rentFrequency}` : "Usually paid up front"} />
        <Stat label="Rent + charges per year" value={naira(yearly)} sub="Service charge and levies included if entered" />
        <Stat label="First payment estimate" value={naira(upfront)} sub={monthlyPay ? `≈ ${(upfront / monthlyPay).toFixed(1)} months of pay` : "Rent plus move-in fees"} />
      </div>
      {monthlyPay > 0 ? (
        <div className="space-y-3 rounded-xl border border-sand-200 p-4">
          <ShareBar share={(yearly / yearPay) * 100} label="Rent and charges as a share of your pay" />
          <p className="text-sm text-ink-700">
            You&apos;d need about <b className="text-ink-900">{(upfront / monthlyPay).toFixed(1)} months of take-home pay</b> to cover the first payment
            {listing.rentFrequency === "annual" || !listing.rentFrequency ? ", since a full year's rent is usually paid at once" : ""}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink-500">Enter your pay to see what share of it this home would take.</p>
      )}
      <NotProvided items={b.notProvided} />
      <p className="text-xs text-ink-500">
        A common guide is to keep rent and charges under about a third of take-home pay. This is a rough guide for planning, not financial advice.
      </p>
    </div>
  );
}

function NumberField({ id, label, value, onChange, suffix, hint, min, max, step }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix: string; hint?: string; min: number; max: number; step: number }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className="field !pr-14"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-500" aria-hidden>{suffix}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

/** Monthly repayment on a standard repayment mortgage. */
export function monthlyRepayment(loan: number, yearlyRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (loan <= 0 || n <= 0) return 0;
  const r = yearlyRatePct / 100 / 12;
  if (r === 0) return loan / n;
  return (loan * r) / (1 - Math.pow(1 + r, -n));
}

function MortgageCalculator({ listing }: { listing: Listing }) {
  const id = useId();
  const [deposit, setDeposit] = useState("30");
  const [rate, setRate] = useState("18");
  const [years, setYears] = useState("20");
  const [pay, setPay] = useState("");
  const b = costBreakdown(listing);

  const clamp = (v: string, lo: number, hi: number) => Math.min(Math.max(Number(v) || 0, lo), hi);
  const depPct = clamp(deposit, 0, 100);
  const ratePct = clamp(rate, 0, 60);
  const term = clamp(years, 0, 35);
  const depositAmt = Math.round((listing.price * depPct) / 100);
  const loan = listing.price - depositAmt;
  const monthly = monthlyRepayment(loan, ratePct, term);
  const totalInterest = Math.max(monthly * Math.round(term * 12) - loan, 0);
  const fees = b.oneTime.filter(known).reduce((s, x) => s + (x.amount ?? 0), 0);
  const monthlyPay = Number(pay) || 0;
  const valid = term > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField id={`${id}-dep`} label="Deposit" value={deposit} onChange={setDeposit} suffix="%" min={0} max={100} step={5} hint={naira(depositAmt)} />
        <NumberField id={`${id}-rate`} label="Interest rate" value={rate} onChange={setRate} suffix="% / yr" min={0} max={60} step={0.5} hint="Example — use the rate you're offered" />
        <NumberField id={`${id}-yrs`} label="Loan length" value={years} onChange={setYears} suffix="years" min={1} max={35} step={1} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Monthly repayment" value={valid && loan > 0 ? naira(Math.round(monthly)) : loan <= 0 ? "No loan" : "—"} sub={loan > 0 ? `On a loan of ${naira(loan)}` : "Deposit covers the price"} />
        <Stat label="Cash needed up front" value={naira(depositAmt + fees)} sub="Deposit + fees the lister entered" />
        <Stat label="Total interest" value={valid && loan > 0 ? naira(Math.round(totalInterest)) : "—"} sub={valid ? `Over ${term} years` : undefined} />
      </div>
      <PayField id={`${id}-pay`} value={pay} onChange={setPay} who="paying the mortgage" />
      {monthlyPay > 0 && valid && loan > 0 && (
        <div className="rounded-xl border border-sand-200 p-4">
          <ShareBar share={(monthly / monthlyPay) * 100} label="Repayment as a share of your pay" />
        </div>
      )}
      <NotProvided items={b.notProvided} />
      <p className="text-xs text-ink-500">
        Estimate only, not financial advice. Banks, mortgage institutions and schemes such as the National Housing Fund set their own rates, deposits, fees and limits. Nothing is applied for from this page.
      </p>
    </div>
  );
}
