"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoBadge } from "@/components/Badges";
import { ListingCard } from "@/components/ListingCard";
import { Avatar } from "@/components/SiteHeader";
import { CheckRow, FutureIntegrations } from "@/components/TrustPanel";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/constants";
import { formatDate, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ALL_ROLES: Role[] = ["seeker", "owner", "agent"];
const DASH: Record<Role, string> = { seeker: "/dashboard/home", owner: "/dashboard/owner", agent: "/dashboard/agent" };

export default function AccountPage() {
  const { ready, currentUser, data, addRole, setActiveRole, signOut, setUserCheck, deleteSearch } = useStore();
  const router = useRouter();

  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-10"><div className="card h-40 animate-pulse bg-sand-50" /></div>;
  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">You&apos;re not signed in</h1>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link href="/signin" className="btn-secondary">Sign in</Link>
          <Link href="/signup" className="btn-primary">Sign up</Link>
        </div>
      </div>
    );
  }

  const u = currentUser;
  const saved = data.listings.filter((l) => data.savedListingIds.includes(l.id));
  const myInquiries = data.inquiries.filter((i) => i.fromUserId === u.id);
  const mySearches = data.savedSearches.filter((s) => s.userId === u.id);

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:py-10">
      <div className="flex items-center gap-4">
        <Avatar name={u.name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="page-title truncate">{u.name}</h1>
          <p className="text-sm text-ink-500">{u.email} · joined {formatDate(u.createdAt)}</p>
        </div>
        {u.isDemo && <DemoBadge />}
      </div>

      <section className="border-t border-sand-200 pt-7">
        <h2 className="section-title">Your roles</h2>
        <p className="text-sm text-ink-500">One account can be a seeker, an owner and an agent. Switch or add roles any time.</p>
        <ul className="mt-4 space-y-2">
          {ALL_ROLES.map((r) => {
            const has = u.roles.includes(r);
            const active = u.activeRole === r;
            return (
              <li key={r} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${active ? "border-brand-500 bg-brand-50" : "border-sand-200"}`}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {ROLE_LABEL[r]} {active && <span className="text-xs font-semibold text-brand-700">· Active</span>}
                  </div>
                  <div className="text-sm text-ink-500">{ROLE_DESCRIPTION[r]}</div>
                </div>
                {has ? (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setActiveRole(r);
                      router.push(DASH[r]);
                    }}
                  >
                    Open dashboard
                  </button>
                ) : (
                  <button className="btn-primary btn-sm" onClick={() => addRole(r)}>
                    Add role
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-sand-200 pt-7">
        <h2 className="section-title">Your checks</h2>
        <p className="text-sm text-ink-500">Each check is separate, with its own status and date.</p>
        <ul className="mt-2 divide-y divide-sand-200">
          <CheckRow label="Identity" kind="identity" help="Placeholder — no ID documents are collected in this prototype." check={u.checks.identity} />
          {u.roles.includes("agent") && (
            <CheckRow label="Agent licence" kind="agentLicensing" help="Placeholder — no registry lookup is performed." check={u.checks.agentLicensing} />
          )}
        </ul>
        {u.checks.identity.state === "not_started" && (
          <button
            className="btn-secondary mt-3 text-sm"
            onClick={() => setUserCheck("identity", { state: "submitted", date: todayISO() })}
          >
            Simulate “submitted for review” (demo)
          </button>
        )}
      </section>

      <section>
        <h2 className="section-title">Saved homes</h2>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Tap the heart on any listing to save it here.</p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {saved.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </section>

      <section className="border-t border-sand-200 pt-7">
        <h2 className="section-title">Saved searches</h2>
        {u.preferences && (
          <p className="mt-1 text-sm text-ink-500">
            Your preferences: {u.preferences.mode === "rent" ? "renting" : "buying"}
            {u.preferences.areas.length ? ` in ${u.preferences.areas.join(", ")}` : ""}
            {u.preferences.beds ? ` · ${u.preferences.beds}+ bed` : ""}
          </p>
        )}
        {mySearches.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Use “Save search” at the bottom of any search results page.</p>
        ) : (
          <ul className="mt-2 divide-y divide-sand-200 text-sm">
            {mySearches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/search?${s.query}`} className="min-w-0 truncate font-medium text-brand-700">{s.label}</Link>
                <button className="shrink-0 text-xs font-semibold text-ink-500 hover:text-red-700" onClick={() => deleteSearch(s.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {myInquiries.length > 0 && (
        <section className="border-t border-sand-200 pt-7">
          <h2 className="section-title">Your requests</h2>
          <ul className="mt-2 divide-y divide-sand-200 text-sm">
            {myInquiries.map((i) => {
              const l = data.listings.find((x) => x.id === i.listingId);
              return (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <Link href={`/listings/${i.listingId}`} className="font-medium text-brand-700">{l?.title ?? "Listing"}</Link>
                  <span className="text-ink-500">{i.type === "viewing" ? "Viewing" : "Message"} · {i.status}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FutureIntegrations />

      <button className="btn-ghost text-sm" onClick={() => { signOut(); router.push("/"); }}>
        Sign out
      </button>
    </div>
  );
}
