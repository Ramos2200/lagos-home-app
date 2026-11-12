"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { AREA_GROUPS, areasToQuery } from "@/lib/areas";
import { BUDGET_PRESETS, LAGOS_AREAS } from "@/lib/constants";
import { DEFAULT_FILTERS, filtersToQuery } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { Purpose, Role } from "@/lib/types";

/** The three ways people use IleLagos, in plain words. */
const CHOICES: { role: Role; title: string; body: string; icon: string }[] = [
  { role: "seeker", title: "I'm looking for a home", body: "Find a place to rent or buy and arrange viewings.", icon: "🔍" },
  { role: "owner", title: "I want to list a home I own", body: "Advertise your own home for rent or sale.", icon: "🏠" },
  { role: "agent", title: "I'm an agent", body: "Manage homes you've been authorized to rent out or sell for their owners.", icon: "🤝" },
];

type Step = "role" | "details" | "purpose" | "areas" | "budget" | "next";

const STEPS_FOR: Record<Role, Step[]> = {
  seeker: ["role", "details", "purpose", "areas", "budget"],
  owner: ["role", "details", "next"],
  agent: ["role", "details", "next"],
};

export default function SignupPage() {
  const router = useRouter();
  const { signUp, setPreferences } = useStore();
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<Step>("role");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agency, setAgency] = useState("");
  const [errors, setErrors] = useState<{ role?: string; name?: string; email?: string }>({});
  const [created, setCreated] = useState(false);
  // home seeker preferences
  const [mode, setMode] = useState<Purpose>("rent");
  const [areas, setAreas] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [beds, setBeds] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const steps = STEPS_FOR[role ?? "seeker"];
  const index = steps.indexOf(step);

  // Move focus to each new step's heading so keyboard and screen-reader users know where they are.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const goNext = () => setStep(steps[index + 1]);
  const goBack = () => setStep(steps[index - 1]);

  function chooseRole(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return setErrors({ role: "Choose one option to continue." });
    setErrors({});
    goNext();
  }

  function createAccount(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter your name so listers and renters know who they're talking to.";
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "That email doesn't look right — check for a missing @ or dot. A test address is fine.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.name ? "name" : "email")?.focus();
      return;
    }
    if (!created) {
      signUp({ name, email, phone, roles: [role!], agencyName: agency });
      setCreated(true);
    }
    goNext();
  }

  function finishSeeker() {
    const preset = budget !== null ? BUDGET_PRESETS[mode][budget] : undefined;
    setPreferences({ mode, areas, min: preset?.min, max: preset?.max, beds: beds || undefined });
    router.push(`/search?${filtersToQuery({ ...DEFAULT_FILTERS, mode, q: areasToQuery(areas), min: preset?.min, max: preset?.max, beds: beds || undefined })}`);
  }

  const toggleArea = (a: string) => setAreas((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]));

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-medium text-ink-500">
          <span>Step {index + 1} of {steps.length}</span>
          {index > 0 && step !== "next" && (
            <button type="button" className="link" onClick={goBack}>← Back</button>
          )}
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-brand-600" : "bg-sand-300"}`} />
          ))}
        </div>
      </div>

      {step === "role" && (
        <form onSubmit={chooseRole} noValidate>
          <Heading hRef={headingRef} sub="Pick the one that fits you best. You can add another later from your account.">How will you use IleLagos?</Heading>
          <fieldset aria-describedby={errors.role ? "role-error" : undefined}>
            <legend className="sr-only">How will you use IleLagos?</legend>
            <div className="space-y-3">
              {CHOICES.map((c) => {
                const on = role === c.role;
                return (
                  <label
                    key={c.role}
                    className={`card flex cursor-pointer items-start gap-4 p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${on ? "!border-brand-600 bg-brand-50" : "hover:border-ink-300"}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={c.role}
                      checked={on}
                      onChange={() => {
                        setRole(c.role);
                        setErrors({});
                      }}
                      className="sr-only"
                    />
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-xl" aria-hidden>
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-900">{c.title}</span>
                      <span className="mt-0.5 block text-sm text-ink-500">{c.body}</span>
                    </span>
                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-sand-300"}`} aria-hidden>
                      {on && <CheckIcon size={12} />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {errors.role && <p id="role-error" className="mt-3 text-sm font-medium text-red-700" role="alert"><span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>{errors.role}</p>}
          <button type="submit" className="btn-primary mt-6 w-full">Continue</button>
          <p className="mt-5 text-center text-sm text-ink-500">
            Already have an account, or just exploring? <Link href="/signin" className="link">Sign in or use a demo account</Link>
          </p>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={createAccount} noValidate className="space-y-4">
          <Heading hRef={headingRef} sub="Just the basics. This creates a demo account saved only in this browser — please use test details.">
            {created ? "Your details" : "Create your account"}
          </Heading>
          <FormField id="name" label="Your name" error={errors.name}>
            <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name || undefined} aria-describedby={errors.name ? "name-error" : undefined} />
          </FormField>
          <FormField id="email" label="Email address" error={errors.email} hint="We'll use this to send you viewing updates (not in this demo).">
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!errors.email || undefined}
              aria-describedby={["email-hint", errors.email && "email-error"].filter(Boolean).join(" ")}
            />
          </FormField>
          <FormField id="phone" label="Phone number" optional>
            <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0800 000 0000" />
          </FormField>
          {role === "agent" && (
            <FormField id="agency" label="Agency name" optional hint="Leave blank if you work independently.">
              <input id="agency" className="field" value={agency} onChange={(e) => setAgency(e.target.value)} aria-describedby="agency-hint" />
            </FormField>
          )}
          <p className="rounded-xl bg-sand-200/60 p-3 text-xs text-ink-700">
            We never ask for ID documents, BVN, NIN or bank details in this prototype.
          </p>
          <button type="submit" className="btn-primary w-full">{created ? "Continue" : "Create account"}</button>
        </form>
      )}

      {step === "purpose" && (
        <div>
          <Heading hRef={headingRef} sub="We'll show you matching homes first.">Are you renting or buying?</Heading>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Renting or buying">
            {(["rent", "sale"] as Purpose[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setMode(m);
                  setBudget(null);
                }}
                className={`card flex flex-col items-start gap-1 p-4 text-left transition ${mode === m ? "!border-brand-600 bg-brand-50" : "hover:border-ink-300"}`}
              >
                <span className="text-xl" aria-hidden>{m === "rent" ? "🔑" : "🏡"}</span>
                <span className="font-semibold text-ink-900">{m === "rent" ? "Renting" : "Buying"}</span>
                <span className="text-xs text-ink-500">{m === "rent" ? "Yearly or monthly rent" : "Homes for sale"}</span>
              </button>
            ))}
          </div>
          <button className="btn-primary mt-6 w-full" onClick={goNext}>Continue</button>
        </div>
      )}

      {step === "areas" && (
        <div>
          <Heading hRef={headingRef} sub="Pick as many as you like, or skip this.">Where in Lagos?</Heading>
          <p className="mb-2 text-xs font-medium text-ink-500">Whole areas</p>
          <div className="flex flex-wrap gap-2">
            {AREA_GROUPS.slice(0, 3).map((g) => {
              const on = g.areas.every((a) => areas.includes(a));
              return (
                <button
                  key={g.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAreas((xs) => (on ? xs.filter((x) => !g.areas.includes(x)) : [...new Set([...xs, ...g.areas])]))}
                  className={`chip ${on ? "chip-on" : ""}`}
                >
                  {on && <CheckIcon size={13} />} All of {g.name.replace(" (corridor)", "")}
                </button>
              );
            })}
          </div>
          <p className="mt-5 mb-2 text-xs font-medium text-ink-500">Neighbourhoods</p>
          <div className="flex flex-wrap gap-2">
            {LAGOS_AREAS.map((a) => {
              const on = areas.includes(a);
              return (
                <button key={a} type="button" aria-pressed={on} onClick={() => toggleArea(a)} className={`chip ${on ? "chip-on" : ""}`}>
                  {on && <CheckIcon size={13} />} {a}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-ink-500" aria-live="polite">{areas.length ? `${areas.length} selected` : "Nothing selected — we'll show all of Lagos."}</p>
          <button className="btn-primary mt-6 w-full" onClick={goNext}>Continue</button>
        </div>
      )}

      {step === "budget" && (
        <div>
          <Heading hRef={headingRef} sub="Optional — you can change these on the search page any time.">Budget and bedrooms</Heading>
          <fieldset>
            <legend className="label">Budget {mode === "rent" ? "per year" : "(asking price)"}</legend>
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS[mode].map((b, i) => (
                <button key={b.label} type="button" aria-pressed={budget === i} onClick={() => setBudget(budget === i ? null : i)} className={`chip ${budget === i ? "chip-on" : ""}`}>
                  {b.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-6">
            <legend className="label">Bedrooms (at least)</legend>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-pressed={beds === n} onClick={() => setBeds(n)} className={`tile ${beds === n ? "tile-on" : ""}`}>
                  {n === 0 ? "Any" : `${n}+`}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn-primary mt-8 w-full" onClick={finishSeeker}>Show me homes</button>
        </div>
      )}

      {step === "next" && role === "owner" && (
        <div>
          <Heading hRef={headingRef} sub="Here's how listing works on IleLagos.">You&apos;re set up, {name.split(" ")[0]}</Heading>
          <NextSteps
            items={[
              "Add your home in four short steps: the basics, price and fees, details, then a final check.",
              "Renters see the rent, each fee and when you last confirmed it's available.",
              "Viewing requests arrive in your dashboard. Pause or mark it rented whenever you like.",
            ]}
          />
          <div className="mt-8 grid gap-2">
            <Link href="/dashboard/listings/new?as=owner" className="btn-primary w-full">List my first home</Link>
            <Link href="/dashboard/owner" className="btn-secondary w-full">Go to my dashboard</Link>
          </div>
        </div>
      )}

      {step === "next" && role === "agent" && (
        <div>
          <Heading hRef={headingRef} sub="Here's how agent listings work on IleLagos.">You&apos;re set up, {name.split(" ")[0]}</Heading>
          <NextSteps
            items={[
              "Only list homes you're authorized to represent. You'll confirm this for each listing.",
              "Your identity and agent licence are separate checks — you can start them (as a demo) from your profile.",
              "Inquiries for all your listings appear in one place in your dashboard.",
            ]}
          />
          <div className="mt-8 grid gap-2">
            <Link href="/dashboard/listings/new?as=agent" className="btn-primary w-full">Add a listing</Link>
            <Link href="/dashboard/agent" className="btn-secondary w-full">Go to my dashboard</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ id, label, optional, hint, error, children }: { id: string; label: string; optional?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={error ? "[&_.field]:border-red-500 [&_.field]:ring-2 [&_.field]:ring-red-100" : ""}>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-500">(optional)</span>}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700"><span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>{error}</p>}
    </div>
  );
}

function NextSteps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-4">
      {items.map((t, i) => (
        <li key={t} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
          <p className="pt-0.5 text-[15px] text-ink-700">{t}</p>
        </li>
      ))}
    </ol>
  );
}

function Heading({ hRef, children, sub }: { hRef: React.RefObject<HTMLHeadingElement | null>; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 ref={hRef} tabIndex={-1} className="page-title focus:outline-none">{children}</h1>
      {sub && <p className="mt-1.5 text-[15px] text-ink-500">{sub}</p>}
    </div>
  );
}
