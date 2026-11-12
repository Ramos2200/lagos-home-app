"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ROLE_LABEL } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { AppData, Role } from "@/lib/types";
import { unreadFor } from "./InquiryBits";

const BANNER_KEY = "ilelagos-banner-dismissed";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink-900">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect width="28" height="28" rx="8" fill="var(--color-brand-600)" />
        <path d="M7 14.5 14 8l7 6.5V21a1 1 0 0 1-1 1h-4v-5h-4v5H8a1 1 0 0 1-1-1z" fill="#fff" />
      </svg>
      <span className="text-[17px]">
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
    <div className="flex items-center justify-center gap-2 bg-brand-800 px-3 py-1 text-[11px] text-brand-50 sm:text-xs">
      <span>Prototype · listings, people and checks are fictional</span>
      <button
        type="button"
        aria-label="Hide prototype notice"
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
  { href: "/search?mode=rent", label: "Rent", match: (p: string, m: string | null) => p === "/search" && m !== "sale" },
  { href: "/search?mode=sale", label: "Buy", match: (p: string, m: string | null) => p === "/search" && m === "sale" },
  { href: "/dashboard/owner", label: "List your home", match: (p: string) => p.startsWith("/dashboard/owner") },
  { href: "/trust", label: "How checks work", match: (p: string) => p === "/trust" },
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
                : `rounded-lg px-3 py-2 text-sm font-medium ${l.href === "/trust" ? "hidden lg:inline-block" : ""} ${active ? "bg-brand-50 text-brand-800" : "text-ink-700 hover:bg-sand-200"}`
            }
          >
            {l.label}
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const dashLinks = currentUser ? [...dashboardsFor(currentUser.roles), ...(currentUser.isStaff ? [{ href: "/moderation", label: "Moderation" }] : [])] : [];
  const savedCount = ready ? data.savedListingIds.length : 0;
  const unread = ready && currentUser ? unreadTotal(data, currentUser.id) : 0;
  const dashHref = dashboardsFor([currentUser?.activeRole ?? "seeker"])[0].href;

  return (
    <header className="sticky top-0 z-30 border-b border-sand-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLinks hideList={!!currentUser?.roles.includes("owner")} />
          {ready && dashLinks.length > 0 && (
            <>
              <span className="mx-1 hidden h-5 w-px bg-sand-300 lg:block" aria-hidden />
              {dashLinks.map((d) => {
                const on = pathname.startsWith(d.href);
                return (
                  <Link
                    key={d.href}
                    href={d.href}
                    aria-current={on ? "page" : undefined}
                    className={`hidden rounded-lg px-3 py-2 text-sm font-semibold lg:inline-block ${on ? "bg-brand-50 text-brand-800" : "text-ink-900 hover:bg-sand-200"}`}
                  >
                    {d.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <HeaderIcon href="/saved" label="Saved homes" count={savedCount} active={pathname === "/saved"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={savedCount ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden className={savedCount ? "text-red-600" : ""}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          </HeaderIcon>
          {ready && currentUser && (
            <HeaderIcon href="/messages" label="Messages" count={unread} active={pathname === "/messages"} urgent>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
            </HeaderIcon>
          )}
          {ready && currentUser ? (
            <Link href={dashHref} className="hidden items-center gap-2 rounded-full border border-sand-300 bg-white py-1 pr-3 pl-1 text-sm font-medium md:flex">
              <Avatar name={currentUser.name} />
              <span className="max-w-[10rem] truncate">{currentUser.name.split(" ")[0]}</span>
              <span className="text-xs text-ink-500">· {ROLE_LABEL[currentUser.activeRole]}</span>
            </Link>
          ) : (
            <div className="hidden gap-2 md:flex">
              <Link href="/signin" className="btn-ghost btn-sm">Sign in</Link>
              <Link href="/signup" className="btn-primary btn-sm">Get started</Link>
            </div>
          )}
          <button type="button" className="btn-ghost !p-2 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
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
                  Messages{unread > 0 ? ` (${unread} unread)` : ""}
                </Link>
                <p className="mt-3 border-t border-sand-200 px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Browse</p>
              </>
            )}
            <NavLinks mobile onNavigate={() => setOpen(false)} hideList={!!currentUser?.roles.includes("owner")} />
            <Link href="/saved" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-medium text-ink-900 hover:bg-sand-200">
              Saved homes{savedCount ? ` (${savedCount})` : ""}
            </Link>
          </nav>
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
              <Link href="/signin" onClick={() => setOpen(false)} className="btn-secondary">Sign in</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary">Get started</Link>
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
