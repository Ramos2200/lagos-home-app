"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./ui";

export interface DashSection<T extends string> {
  id: T;
  label: string;
  count?: number;
  /** Highlight the count (e.g. things that need action). */
  urgent?: boolean;
}

/**
 * Keeps the open dashboard section in the URL hash (e.g. #inquiries), so a section
 * can be linked to and the browser Back button works as people expect.
 */
export function useHashSection<T extends string>(ids: readonly T[], fallback: T): [T, (s: T) => void] {
  const [active, setActive] = useState<T>(fallback);
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1) as T;
      setActive(ids.includes(h) ? h : fallback);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = useCallback((s: T) => {
    setActive(s);
    if (window.location.hash.slice(1) !== s) window.history.pushState(null, "", `#${s}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return [active, go];
}

/**
 * Dashboard layout: page header, a section menu (sidebar on desktop, tab row on phones)
 * and the active section's content.
 */
export function DashboardShell<T extends string>({
  eyebrow,
  title,
  description,
  actions,
  sections,
  active,
  onChange,
  aside,
  children,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  sections: DashSection<T>[];
  active: T;
  onChange: (s: T) => void;
  /** Extra links under the desktop menu (e.g. account settings). */
  aside?: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const badge = (s: DashSection<T>, on: boolean) =>
    s.count ? (
      <span
        className={`ml-auto min-w-6 rounded-full px-1.5 py-px text-center text-[11px] font-semibold ${
          s.urgent ? "bg-brand-600 text-white" : on ? "bg-white text-ink-700" : "bg-sand-200 text-ink-700"
        }`}
      >
        {s.count}
      </span>
    ) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />

      {/* Phones and tablets: a simple scrollable tab row that stays in reach */}
      <nav
        aria-label="Dashboard sections"
        className="sticky top-14 z-20 -mx-4 mt-6 border-b border-sand-200 bg-sand-100/95 px-4 backdrop-blur-md lg:hidden"
      >
        <ul className="flex gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(s.id)}
                  aria-current={on ? "page" : undefined}
                  className={`tab flex items-center gap-1.5 ${on ? "tab-on" : ""}`}
                >
                  {s.label}
                  {s.count ? (
                    <span className={`rounded-full px-1.5 py-px text-[11px] ${s.urgent ? "bg-brand-600 text-white" : "bg-sand-200 text-ink-700"}`}>{s.count}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[220px_1fr]">
        {/* Desktop: sidebar menu */}
        <nav aria-label="Dashboard sections" className="hidden lg:block">
          <ul className="sticky top-20 space-y-1">
            {sections.map((s) => {
              const on = s.id === active;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onChange(s.id)}
                    aria-current={on ? "page" : undefined}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      on ? "bg-white text-ink-900 shadow-card ring-1 ring-sand-200" : "text-ink-700 hover:bg-sand-200/70"
                    }`}
                  >
                    {on && <span className="h-4 w-1 rounded-full bg-brand-600" aria-hidden />}
                    {s.label}
                    {badge(s, on)}
                  </button>
                </li>
              );
            })}
            {aside && aside.length > 0 && (
              <li className="mt-4 border-t border-sand-200 pt-4">
                {aside.map((a) => (
                  <Link key={a.href} href={a.href} className="block rounded-xl px-3 py-2 text-sm text-ink-500 hover:bg-sand-200/70 hover:text-ink-900">
                    {a.label}
                  </Link>
                ))}
              </li>
            )}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** A titled block inside a dashboard section, with an optional "See all" style action. */
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="muted mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
