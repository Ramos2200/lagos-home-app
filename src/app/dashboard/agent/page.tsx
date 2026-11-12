"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckBadge } from "@/components/Badges";
import { DashboardShell, Panel, useHashSection } from "@/components/DashboardShell";
import { AvailabilityCheckItem, InquiryItem, MiniListing, RowList, ViewingItem, isCheckDue, isLive, upcomingViewings } from "@/components/DashboardParts";
import { FlashNotice } from "@/components/FlashNotice";
import { GettingStarted } from "@/components/GettingStarted";
import { InquiryList, ManageListingRow } from "@/components/ManageListing";
import { RequireRole } from "@/components/RequireRole";
import { StatusGuide } from "@/components/StatusGuide";
import { CheckRow, FutureIntegrations } from "@/components/TrustPanel";
import { EmptyState, StatStrip } from "@/components/ui";
import { LAGOS_AREAS } from "@/lib/constants";
import { daysSince, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

export default function AgentDashboardPage() {
  return <RequireRole role="agent">{(user) => <AgentDashboard user={user} />}</RequireRole>;
}

const SECTIONS = ["overview", "listings", "leads", "viewings", "profile"] as const;
type S = (typeof SECTIONS)[number];

function AgentDashboard({ user }: { user: User }) {
  const { data, setUserCheck, setListingCheck } = useStore();
  const [section, go] = useHashSection<S>(SECTIONS, "overview");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "hidden">("all");

  const mine = data.listings.filter((l) => l.agentId === user.id);
  const ids = new Set(mine.map((l) => l.id));
  const inquiries = data.inquiries.filter((i) => ids.has(i.listingId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const needReply = inquiries.filter((i) => i.status === "new");
  /** New leads: unanswered inquiries received in the last 7 days. */
  const newLeads = needReply.filter((i) => daysSince(i.createdAt) <= 7);
  const viewings = upcomingViewings(inquiries);
  const authMissing = mine.filter((l) => l.checks.ownerAuthorization.state === "not_started");
  const due = mine.filter(isCheckDue);
  const shown = mine.filter((l) => statusFilter === "all" || (statusFilter === "live" ? isLive(l) : !isLive(l)));
  const newCount = (id: string) => needReply.filter((i) => i.listingId === id).length;

  const addListing = <Link href="/dashboard/listings/new?as=agent" className="btn-primary">+ Add a listing</Link>;

  const markAuth = (id: string) => setListingCheck(id, "ownerAuthorization", { state: "submitted", date: todayISO() });

  return (
    <DashboardShell
      eyebrow={`Agent dashboard · ${user.agencyName ?? "Independent agent"}`}
      title={user.name}
      description="Homes you're authorized to represent, new leads and booked viewings."
      actions={addListing}
      active={section}
      onChange={go}
      aside={[
        { href: "/account", label: "Account & roles" },
        { href: "/trust", label: "How checks work" },
      ]}
      sections={[
        { id: "overview", label: "Overview" },
        { id: "listings", label: "Authorized listings", count: mine.length },
        { id: "leads", label: "Leads & inquiries", count: needReply.length, urgent: needReply.length > 0 },
        { id: "viewings", label: "Upcoming viewings", count: viewings.length },
        { id: "profile", label: "Profile" },
      ]}
    >
      <FlashNotice />

      {section === "overview" && (
        <div className="space-y-10">
          <StatStrip
            stats={[
              { label: "Authorized listings", value: mine.length },
              { label: "New leads (7 days)", value: newLeads.length },
              { label: "Upcoming viewings", value: viewings.length },
              { label: "Authorization missing", value: authMissing.length, warn: authMissing.length > 0 },
            ]}
          />

          {mine.length === 0 && (
            <EmptyState
              title="No listings yet"
              body="Add a home you've been authorized to rent out or sell. You'll confirm the owner's authorization as part of the listing."
              action={addListing}
            />
          )}

          <Panel
            title="Inquiries needing a reply"
            description="Newest first. Mark each one as replied once you've contacted the person."
            action={needReply.length > 3 ? <button className="link text-sm" onClick={() => go("leads")}>See all {needReply.length}</button> : undefined}
          >
            {needReply.length ? (
              <RowList label="Inquiries needing a reply">{needReply.slice(0, 3).map((i) => <InquiryItem key={i.id} inquiry={i} listings={data.listings} />)}</RowList>
            ) : (
              <EmptyState title="No one is waiting for a reply" body="New viewing requests and messages for your listings will appear here." />
            )}
          </Panel>

          <Panel
            title="Upcoming viewings"
            action={viewings.length > 3 ? <button className="link text-sm" onClick={() => go("viewings")}>See all</button> : undefined}
          >
            {viewings.length ? (
              <RowList label="Upcoming viewings">{viewings.slice(0, 3).map((i) => <ViewingItem key={i.id} inquiry={i} listings={data.listings} />)}</RowList>
            ) : (
              <EmptyState title="No viewings booked" body="When someone requests a viewing with a date, it shows up here." />
            )}
          </Panel>

          {mine.length > 0 && (
            <Panel title="Owner authorization" description="Only represent homes you're authorized to. Each listing has its own authorization check.">
              <RowList label="Owner authorization by listing">
                {mine.map((l) => (
                  <MiniListing
                    key={l.id}
                    listing={l}
                    right={
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <CheckBadge state={l.checks.ownerAuthorization.state} kind="ownerAuthorization" />
                        {l.checks.ownerAuthorization.state === "not_started" && (
                          <button className="link text-xs" onClick={() => markAuth(l.id)}>Mark as submitted (demo)</button>
                        )}
                      </div>
                    }
                  />
                ))}
              </RowList>
            </Panel>
          )}

          {due.length > 0 && (
            <Panel title="Availability checks due" description="These show as “Availability unconfirmed” until you confirm them.">
              <RowList label="Availability checks due">{due.map((l) => <AvailabilityCheckItem key={l.id} listing={l} />)}</RowList>
            </Panel>
          )}

          <GettingStarted
            dismissed={user.checklistDismissed}
            items={[
              { label: "Complete your profile (agency, bio, areas)", done: !!(user.agencyName && user.bio && user.areasServed?.length), action: () => go("profile"), cta: "Edit" },
              {
                label: "Start your agent licensing check (demo)",
                done: (user.checks.agentLicensing?.state ?? "not_started") !== "not_started",
                action: () => setUserCheck("agentLicensing", { state: "submitted", date: todayISO() }),
                cta: "Simulate",
              },
              { label: "Add a listing you are authorized to represent", done: mine.length > 0, href: "/dashboard/listings/new?as=agent", cta: "Add" },
              { label: "Submit owner authorization for every listing", done: mine.length > 0 && authMissing.length === 0, action: () => go("listings"), cta: "Review" },
            ]}
          />
        </div>
      )}

      {section === "listings" && (
        <Panel title="Authorized listings" description="Homes you represent for their owners. Each row shows the owner authorization check.">
          {mine.length > 0 && <StatusGuide />}
          <div className="mb-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter listings">
            {(["all", "live", "hidden"] as const).map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)} aria-pressed={statusFilter === f} className={`chip shrink-0 ${statusFilter === f ? "chip-on" : ""}`}>
                {f === "all" ? `All (${mine.length})` : f === "live" ? `Live in search (${mine.filter(isLive).length})` : `Hidden (${mine.filter((l) => !isLive(l)).length})`}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <EmptyState
              title={mine.length ? "No listings match this filter" : "No listings yet"}
              body={mine.length ? "Try another filter." : "Add a home you're authorized to represent."}
              action={mine.length ? <button className="btn-secondary btn-sm" onClick={() => setStatusFilter("all")}>Show all</button> : addListing}
            />
          ) : (
            <ul className="space-y-3">
              {shown.map((l) => (
                <ManageListingRow key={l.id} listing={l} inquiryCount={newCount(l.id)} onViewInquiries={() => go("leads")} />
              ))}
            </ul>
          )}
        </Panel>
      )}

      {section === "leads" && (
        <Panel title="Leads & inquiries" description={`${newLeads.length} new in the last 7 days · ${needReply.length} waiting for a reply in total.`}>
          <InquiryList inquiries={inquiries} listings={data.listings} />
        </Panel>
      )}

      {section === "viewings" && (
        <Panel title="Upcoming viewings" description="Viewing requests with a date from today onwards, soonest first. Times are the person's preference — confirm with them directly.">
          {viewings.length ? (
            <RowList label="Upcoming viewings">{viewings.map((i) => <ViewingItem key={i.id} inquiry={i} listings={data.listings} />)}</RowList>
          ) : (
            <EmptyState title="No viewings booked" body="When someone requests a viewing with a date, it shows up here." />
          )}
        </Panel>
      )}

      {section === "profile" && <AgentProfile user={user} />}
    </DashboardShell>
  );
}

function AgentProfile({ user }: { user: User }) {
  const { updateProfile, setUserCheck } = useStore();
  const [name, setName] = useState(user.name);
  const [agency, setAgency] = useState(user.agencyName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [areas, setAreas] = useState<string[]>(user.areasServed ?? []);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  return (
    <div className="space-y-6">
      <form
        className="card space-y-4 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setNameError("Enter your name — renters see it on every listing you manage.");
            document.getElementById("ap-name")?.focus();
            return;
          }
          setNameError("");
          updateProfile({ name: name.trim(), agencyName: agency.trim() || undefined, phone: phone.trim() || undefined, bio: bio.trim(), areasServed: areas });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }}
      >
        <h2 className="section-title">Profile details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ap-name">
              Name <span className="font-normal text-ink-500">(required)</span>
            </label>
            <input
              id="ap-name"
              className={`field ${nameError ? "!border-red-500 ring-2 ring-red-100" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "ap-name-error" : undefined}
            />
            {nameError && (
              <p id="ap-name-error" className="mt-1 text-sm font-medium text-red-700">
                <span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>
                {nameError}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="ap-agency">Agency <span className="font-normal text-ink-500">(optional)</span></label>
            <input id="ap-agency" className="field" value={agency} onChange={(e) => setAgency(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ap-phone">Business phone <span className="font-normal text-ink-500">(optional)</span></label>
            <input id="ap-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Use a test number" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ap-bio">About you</label>
          <textarea id="ap-bio" rows={3} className="field" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <fieldset>
          <legend className="label">Areas you cover</legend>
          <div className="flex flex-wrap gap-2">
            {LAGOS_AREAS.map((a) => {
              const on = areas.includes(a);
              return (
                <button
                  type="button"
                  key={a}
                  aria-pressed={on}
                  onClick={() => setAreas((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}
                  className={`chip !py-1 ${on ? "chip-on" : ""}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">Save profile</button>
          {saved && <span className="text-sm text-brand-700" role="status">Saved</span>}
        </div>
      </form>

      <section className="card p-4 sm:p-5">
        <h2 className="section-title">Your checks</h2>
        <p className="text-sm text-ink-500">Identity and agent licensing are separate checks, each with its own date.</p>
        <ul className="mt-2 divide-y divide-sand-200">
          <CheckRow label="Identity" kind="identity" help="Placeholder — no ID documents are collected." check={user.checks.identity} />
          <CheckRow label="Agent licence" kind="agentLicensing" help="Placeholder — no regulator/registry lookup is performed." check={user.checks.agentLicensing} />
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {user.checks.identity.state === "not_started" && (
            <button className="btn-secondary text-sm" onClick={() => setUserCheck("identity", { state: "submitted", date: todayISO() })}>
              Simulate identity submission (demo)
            </button>
          )}
          {(user.checks.agentLicensing?.state ?? "not_started") === "not_started" && (
            <button className="btn-secondary text-sm" onClick={() => setUserCheck("agentLicensing", { state: "submitted", date: todayISO() })}>
              Simulate licence submission (demo)
            </button>
          )}
        </div>
      </section>

      <FutureIntegrations />
    </div>
  );
}
