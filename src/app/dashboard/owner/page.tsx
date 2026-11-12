"use client";

import Link from "next/link";
import { DashboardShell, Panel, useHashSection } from "@/components/DashboardShell";
import { AvailabilityCheckItem, InquiryItem, RowList, isCheckDue, isCheckSoon, isHidden, isLive } from "@/components/DashboardParts";
import { FlashNotice } from "@/components/FlashNotice";
import { GettingStarted } from "@/components/GettingStarted";
import { InquiryList, ManageListingRow } from "@/components/ManageListing";
import { RequireRole } from "@/components/RequireRole";
import { StatusGuide } from "@/components/StatusGuide";
import { FutureIntegrations } from "@/components/TrustPanel";
import { EmptyState, StatStrip } from "@/components/ui";
import { todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Listing, User } from "@/lib/types";

const SECTIONS = ["overview", "listings", "inquiries", "checks"] as const;
type S = (typeof SECTIONS)[number];

export default function OwnerDashboardPage() {
  return <RequireRole role="owner">{(user) => <OwnerDashboard user={user} />}</RequireRole>;
}

function OwnerDashboard({ user }: { user: User }) {
  const { data, setUserCheck } = useStore();
  const [section, go] = useHashSection<S>(SECTIONS, "overview");

  const mine = data.listings.filter((l) => l.ownerId === user.id && l.listedBy === "owner");
  const viaAgent = data.listings.filter((l) => l.ownerId === user.id && l.listedBy === "agent" && l.agentId !== user.id);
  const ids = new Set(mine.map((l) => l.id));
  const inquiries = data.inquiries.filter((i) => ids.has(i.listingId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const needReply = inquiries.filter((i) => i.status === "new");
  const newCount = (id: string) => needReply.filter((i) => i.listingId === id).length;

  const due = mine.filter(isCheckDue);
  const soon = mine.filter(isCheckSoon);
  const live = mine.filter((l) => isLive(l) && !isCheckDue(l));
  const hidden = mine.filter(isHidden);

  const addListing = <Link href="/dashboard/listings/new?as=owner" className="btn-primary">+ Add a listing</Link>;

  const rows = (list: Listing[]) => (
    <ul className="space-y-3">
      {list.map((l) => (
        <ManageListingRow key={l.id} listing={l} inquiryCount={newCount(l.id)} onViewInquiries={() => go("inquiries")} />
      ))}
    </ul>
  );

  return (
    <DashboardShell
      eyebrow="Owner dashboard"
      title={`Welcome, ${user.name.split(" ")[0]}`}
      description="Your homes, how they appear in search, and people waiting to hear from you."
      actions={addListing}
      active={section}
      onChange={go}
      aside={[
        { href: "/account", label: "Account & roles" },
        { href: "/trust", label: "How checks work" },
      ]}
      sections={[
        { id: "overview", label: "Overview" },
        { id: "listings", label: "My listings", count: mine.length },
        { id: "inquiries", label: "Inquiries", count: needReply.length, urgent: needReply.length > 0 },
        { id: "checks", label: "Availability checks", count: due.length, urgent: due.length > 0 },
      ]}
    >
      <FlashNotice />

      {section === "overview" && (
        <div className="space-y-10">
          <StatStrip
            stats={[
              { label: "Live in search", value: mine.filter(isLive).length },
              { label: "Checks due", value: due.length, warn: due.length > 0 },
              { label: "Waiting for a reply", value: needReply.length },
              { label: "Hidden from search", value: hidden.length },
            ]}
          />

          {mine.length === 0 ? (
            <EmptyState
              title="You haven't listed a home yet"
              body="Add your first listing in four short steps. Your progress is saved as you go."
              action={addListing}
            />
          ) : (
            <>
              <Panel
                title="Needs your attention"
                description="Reply to people and keep availability up to date — renters trust listings that were confirmed recently."
              >
                {due.length === 0 && needReply.length === 0 ? (
                  <EmptyState title="You're all caught up" body="No replies or availability checks are waiting." />
                ) : (
                  <div className="space-y-4">
                    {due.length > 0 && (
                      <RowList label="Availability checks due">
                        {due.map((l) => <AvailabilityCheckItem key={l.id} listing={l} />)}
                      </RowList>
                    )}
                    {needReply.length > 0 && (
                      <RowList label="Inquiries waiting for a reply">
                        {needReply.slice(0, 3).map((i) => <InquiryItem key={i.id} inquiry={i} listings={data.listings} />)}
                      </RowList>
                    )}
                    {needReply.length > 3 && (
                      <button className="link text-sm" onClick={() => go("inquiries")}>See all {needReply.length} inquiries</button>
                    )}
                  </div>
                )}
              </Panel>

              <Panel title="Your listings at a glance" action={<button className="link text-sm" onClick={() => go("listings")}>Manage listings</button>}>
                <dl className="grid gap-px overflow-hidden rounded-2xl border border-sand-200 bg-sand-200 shadow-card sm:grid-cols-3">
                  <Group label="Live in search" value={mine.filter(isLive).length} hint="People can find and contact you" />
                  <Group label="Check due soon" value={soon.length} hint="Confirm within the next 7 days" />
                  <Group label="Hidden" value={hidden.length} hint="Paused, rented or sold" />
                </dl>
              </Panel>
            </>
          )}

          <GettingStarted
            dismissed={user.checklistDismissed}
            items={[
              { label: "Add your first listing", done: mine.length > 0, href: "/dashboard/listings/new?as=owner", cta: "Start" },
              { label: "Keep availability confirmed (every 30 days)", done: mine.length > 0 && due.length === 0, action: () => go("checks"), cta: "Review" },
              {
                label: "Start your identity check (demo)",
                done: user.checks.identity.state !== "not_started",
                action: () => setUserCheck("identity", { state: "submitted", date: todayISO() }),
                cta: "Simulate",
              },
              { label: "Reply to new inquiries", done: needReply.length === 0, action: () => go("inquiries"), cta: "Open" },
            ]}
          />
        </div>
      )}

      {section === "listings" && (
        <div className="space-y-10">
          {mine.length === 0 ? (
            <EmptyState title="No listings yet" body="Add your first home — it takes a few minutes." action={addListing} />
          ) : (
            <>
              <StatusGuide />
              {due.length > 0 && (
                <Panel title={`Needs an availability check (${due.length})`} description="Still shown in search, but marked “Availability unconfirmed” until you confirm.">
                  {rows(due)}
                </Panel>
              )}
              <Panel title={`Live in search (${live.length})`}>
                {live.length ? rows(live) : <EmptyState title="Nothing live right now" body="Relist a hidden home or add a new one." />}
              </Panel>
              {hidden.length > 0 && (
                <Panel title={`Hidden from search (${hidden.length})`} description="Paused, rented or sold. Relist any of them when they're available again.">
                  {rows(hidden)}
                </Panel>
              )}
            </>
          )}
          {viaAgent.length > 0 && (
            <Panel title="Managed by an agent on your behalf" description="Your agent updates these. Contact them to make changes.">
              <ul className="space-y-3">
                {viaAgent.map((l) => {
                  const agent = data.users.find((u) => u.id === l.agentId);
                  return (
                    <ManageListingRow
                      key={l.id}
                      listing={l}
                      inquiryCount={0}
                      readOnlyReason={`Managed by ${agent?.name ?? "an agent"}${agent?.agencyName ? `, ${agent.agencyName}` : ""}.`}
                    />
                  );
                })}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {section === "inquiries" && (
        <Panel title="Inquiries" description="Viewing requests and messages about your homes. New ones are shown first.">
          <InquiryList inquiries={inquiries} listings={data.listings} />
        </Panel>
      )}

      {section === "checks" && (
        <div className="space-y-10">
          <Panel
            title="Availability checks"
            description="Confirm each live listing at least every 30 days. If you don't, renters see “Availability unconfirmed”."
          >
            {due.length + soon.length === 0 ? (
              <EmptyState
                title={mine.some(isLive) ? "No checks due" : "No live listings to check"}
                body={mine.some(isLive) ? "Every live listing was confirmed recently. We'll list them here when a check is due." : "Checks appear here once you have a listing in search."}
              />
            ) : (
              <RowList label="Listings to confirm">
                {[...due, ...soon].map((l) => <AvailabilityCheckItem key={l.id} listing={l} />)}
              </RowList>
            )}
          </Panel>
          <FutureIntegrations />
        </div>
      )}
    </DashboardShell>
  );
}

function Group({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-ink-900">{value}</dd>
      <dd className="text-xs text-ink-500">{hint}</dd>
    </div>
  );
}
