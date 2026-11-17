"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { FEEDBACK_URL } from "@/lib/beta";
import { ROLE_LABEL } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { listerReminders, managedListings, reminderCount } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import type { AppData, Role } from "@/lib/types";
import { unreadFor } from "./InquiryBits";
import { LanguageSelect } from "./LanguageSelect";

// New key for the beta banner, so people who hid the old prototype notice see it once.
const BANNER_KEY = "ilelagos-beta-banner-dismissed";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
      <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill="var(--color-brand-600)" />
        <path d="M7 14.5 14 8l7 6.5V21a1 1 0 0 1-1 1h-4v-5h-4v5H8a1 1 0 0 1-1-1z" fill="#fff" />
      </svg>
      <span className="text-[20px] font-extrabold tracking-tight">
        Ile<span className="text-brand-600">Lagos</span>
      </span>
    </Link>
  );
}

/** Slim prototype notice. It scrolls away with the page and can be hidden. */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(localStorage.getItem(BANNER_KEY) === "1");
    } catch {}
  }, []);
  if (hidden) return null;
  return (
    <div className="flex items-center justify-center gap-x-3 gap-y-0.5 bg-brand-800 px-3 py-1.5 text-[11px] text-brand-50 sm:text-xs">
      <span>
        <b className="font-bold text-white">Beta</b> · the homes and people here are samples for testing
      </span>
      <Link
        href={FEEDBACK_URL ?? "/feedback"}
        {...(FEEDBACK_URL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="shrink-0 rounded-full bg-white px-2.5 py-0.5 font-bold text-brand-800 hover:bg-brand-50"
      >
        Give feedback
      </Link>
      <button
        type="button"
        aria-label="Hide beta notice"
        className="rounded px-1 text-brand-100 hover:bg-brand-700"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(BANNER_KEY, "1");
          } catch {}
        }}
      >
        ✕
      </button>
    </div>
  );
}

const LINKS = [
  { href: "/search?mode=rent", label: "nav.rent" as MessageKey, match: (p: string, m: string | null) => p === "/search" && m !== "sale" },
  { href: "/search?mode=sale", label: "nav.buy" as MessageKey, match: (p: string, m: string | null) => p === "/search" && m === "sale" },
  { href: "/dashboard/owner", label: "nav.list" as MessageKey, match: (p: string) => p.startsWith("/dashboard/owner") },
  { href: "/trust", label: "nav.checks" as MessageKey, match: (p: string) => p === "/trust" },
];

const DASHBOARDS: Record<Role, { href: string; label: string }> = {
  seeker: { href: "/dashboard/home", label: "My homes" },
  owner: { href: "/dashboard/owner", label: "My listings" },
  agent: { href: "/dashboard/agent", label: "Agent dashboard" },
};

/** One dashboard link per role the person has, in a stable order. */
export function dashboardsFor(roles: Role[]) {
  return (["seeker", "owner", "agent"] as Role[]).filter((r) => roles.includes(r)).map((r) => DASHBOARDS[r]);
}

function NavLinksInner({ mobile, onNavigate, hideList }: { mobile?: boolean; onNavigate?: () => void; hideList?: boolean }) {
  const pathname = usePathname();
  const mode = useSearchParams().get("mode");
  return <NavLinkList pathname={pathname} mode={mode} mobile={mobile} onNavigate={onNavigate} hideList={hideList} />;
}

function NavLinkList({ pathname, mode, mobile, onNavigate, hideList }: { pathname: string; mode: string | null; mobile?: boolean; onNavigate?: () => void; hideList?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {LINKS.filter((l) => !(hideList && l.href === "/dashboard/owner")).map((l) => {
        const active = l.match(pathname, mode);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `rounded-lg px-3 py-3 text-[15px] font-medium ${active ? "bg-brand-50 text-brand-800" : "text-ink-900 hover:bg-sand-200"}`
                : `rounded-md px-3 py-2 text-[15px] font-semibold ${l.href === "/trust" ? "hidden lg:inline-block" : ""} ${active ? "text-brand-700 underline decoration-2 underline-offset-[22px]" : "text-ink-900 hover:text-brand-700"}`
            }
          >
            {t(l.label)}
          </Link>
        );
      })}
    </>
  );
}

function NavLinks(props: { mobile?: boolean; onNavigate?: () => void; hideList?: boolean }) {
  const pathname = usePathname();
  return (
    <Suspense fallback={<NavLinkList pathname={pathname} mode={null} {...props} />}>
      <NavLinksInner {...props} />
    </Suspense>
  );
}

export function SiteHeader() {
  const { currentUser, ready, data } = useStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const dashLinks = currentUser ? [...dashboardsFor(currentUser.roles), ...(currentUser.isStaff ? [{ href: "/moderation", label: "Moderation" }] : [])] : [];
  const savedCount = ready ? data.savedListingIds.length : 0;
  const unread = ready && currentUser ? unreadTotal(data, currentUser.id) : 0;
  // Things an owner or agent should do soon (availability checks, replies, viewings). In-app only.
  const reminders = ready && currentUser ? reminderCount(listerReminders(managedListings(data, currentUser.id), data.inquiries, () => true)) : 0;
  const dashHref = dashboardsFor([currentUser?.activeRole ?? "seeker"])[0].href;

  return (
    <header className="sticky top-0 z-30 border-b border-sand-200 bg-white">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 lg:px-6">
        {/* Left: browse links (desktop) or menu button (phones) */}
        <div className="flex items-center">
          <button type="button" className="btn-ghost btn-icon -ml-2 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            <NavLinks hideList={!!currentUser?.roles.includes("owner")} />
          </nav>
        </div>

        {/* Centre: logo */}
        <div className="justify-self-center">
          <Logo />
        </div>

        {/* Right: saved, messages, account */}
        <div className="flex items-center justify-end gap-1">
          <LanguageSelect compact className="hidden lg:block" />
          <HeaderIcon href="/saved" label={t("nav.saved")} count={savedCount} active={pathname === "/saved"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={savedCount ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden className={savedCount ? "text-red-600" : ""}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          </HeaderIcon>
          {ready && currentUser && (
            <HeaderIcon href="/messages" label={t("nav.messages")} count={unread} active={pathname === "/messages"} urgent>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
            </HeaderIcon>
          )}
          {ready && currentUser ? (
            <AccountMenu name={currentUser.name} roleLabel={currentUser.isStaff ? "Staff" : ROLE_LABEL[currentUser.activeRole]} links={dashLinks} primaryHref={dashHref} reminders={reminders} />
          ) : (
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/signin" className="btn-ghost btn-sm">{t("nav.signin")}</Link>
              <Link href="/signup" className="btn-primary btn-sm">{t("nav.join")}</Link>
            </div>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-sand-200 bg-white px-4 pb-4 shadow-raised md:hidden">
          <nav className="flex flex-col py-2" aria-label="Mobile">
            {ready && currentUser && (
              <>
                <p className="px-3 pt-1 pb-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Your dashboards</p>
                {dashLinks.map((d) => (
                  <Link
                    key={d.href}
                    href={d.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname.startsWith(d.href) ? "page" : undefined}
                    className={`rounded-lg px-3 py-3 text-[15px] font-semibold ${pathname.startsWith(d.href) ? "bg-brand-50 text-brand-800" : "text-ink-900 hover:bg-sand-200"}`}
                  >
                    {d.label}
                  </Link>
                ))}
                <Link href="/messages" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-semibold text-ink-900 hover:bg-sand-200">
                  {t("nav.messages")}{unread > 0 ? ` (${unread})` : ""}
                </Link>
                <p className="mt-3 border-t border-sand-200 px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Browse</p>
              </>
            )}
            <NavLinks mobile onNavigate={() => setOpen(false)} hideList={!!currentUser?.roles.includes("owner")} />
            <Link href="/saved" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-medium text-ink-900 hover:bg-sand-200">
              {t("nav.saved")}{savedCount ? ` (${savedCount})` : ""}
            </Link>
          </nav>
          <Link href="/install" onClick={() => setOpen(false)} className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-3 text-[15px] font-semibold text-brand-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M12 18h.01" /></svg>
            Get the app
          </Link>
          <LanguageSelect className="mb-3 px-3" />
          {ready && currentUser ? (
            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-sand-200 bg-white p-3">
              <Avatar name={currentUser.name} />
              <div className="text-sm">
                <div className="font-semibold">{currentUser.name}</div>
                <div className="text-ink-500">Account, roles & saved searches</div>
              </div>
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/signin" onClick={() => setOpen(false)} className="btn-secondary">{t("nav.signin")}</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary">{t("nav.getStarted")}</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Unread messages across conversations this person is part of (as renter or lister). */
function unreadTotal(data: AppData, userId: string): number {
  let n = 0;
  for (const i of data.inquiries) {
    const l = data.listings.find((x) => x.id === i.listingId);
    const lister = !!l && (l.agentId === userId || (l.ownerId === userId && l.listedBy === "owner"));
    if (lister) n += unreadFor(i, "lister");
    else if (i.fromUserId === userId) n += unreadFor(i, "seeker");
  }
  return n;
}

function HeaderIcon({ href, label, count, active, urgent, children }: { href: string; label: string; count: number; active: boolean; urgent?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={count ? `${label} (${count}${urgent ? " unread" : ""})` : label}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition ${active ? "bg-brand-50 text-brand-800" : "text-ink-700 hover:bg-sand-200"}`}
    >
      {children}
      {count > 0 && (
        <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] leading-[18px] font-bold ${urgent ? "bg-brand-600 text-white" : "bg-ink-900 text-white"}`} aria-hidden>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

/** Account button with a small menu of the person's dashboards and settings. */
function AccountMenu({ name, roleLabel, links, primaryHref, reminders }: { name: string; roleLabel: string; links: { href: string; label: string }[]; primaryHref: string; reminders: number }) {
  const { signOut } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = "block rounded-md px-3 py-2 text-sm font-medium text-ink-900 hover:bg-sand-100";
  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-label={`${name.split(" ")[0]}, account menu${reminders ? `, ${reminders} reminder${reminders === 1 ? "" : "s"}` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex items-center gap-2 rounded-full border border-sand-300 py-1 pr-2.5 pl-1 text-sm font-semibold text-ink-900 hover:border-ink-500"
      >
        <span className="relative">
          <Avatar name={name} />
          {reminders > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-red-600" aria-hidden />}
        </span>
        <span className="max-w-[8rem] truncate">{name.split(" ")[0]}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-sand-200 bg-white p-1.5 shadow-float">
          <p className="px-3 pt-2 pb-1 text-xs text-ink-500">Signed in as {roleLabel.toLowerCase()}</p>
          <Link role="menuitem" href={primaryHref} className={`${item} font-semibold`} onClick={() => setOpen(false)}>
            Go to my dashboard
            {reminders > 0 && <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{reminders} reminder{reminders === 1 ? "" : "s"}</span>}
          </Link>
          {links.filter((l) => l.href !== primaryHref).map((l) => (
            <Link key={l.href} role="menuitem" href={l.href} className={item} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Link role="menuitem" href="/messages" className={item} onClick={() => setOpen(false)}>Messages</Link>
          <Link role="menuitem" href="/saved" className={item} onClick={() => setOpen(false)}>Saved homes</Link>
          <Link role="menuitem" href="/account" className={item} onClick={() => setOpen(false)}>Account &amp; roles</Link>
          <div className="my-1 border-t border-sand-200" />
          <button role="menuitem" type="button" className={`${item} w-full text-left`} onClick={() => { signOut(); setOpen(false); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}
