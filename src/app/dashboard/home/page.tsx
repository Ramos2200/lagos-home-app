"use client";

import Link from "next/link";
import { DashboardShell, Panel, useHashSection } from "@/components/DashboardShell";
import { RowList, ViewingItem, upcomingViewings } from "@/components/DashboardParts";
import { ListingCard } from "@/components/ListingCard";
import { RequireRole } from "@/components/RequireRole";
import { SavedSearchItem, seenAt } from "@/components/SavedSearchItem";
import { Badge } from "@/components/Badges";
import { unreadFor, whenText } from "@/components/InquiryBits";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE } from "@/lib/constants";
import { EmptyState, StatStrip } from "@/components/ui";
import { formatDate, localDateOf, relativeDays } from "@/lib/format";
import { searchUpdates } from "@/lib/listing-utils";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";

const SECTIONS = ["overview", "saved", "viewed", "searches", "requests"] as const;
type S = (typeof SECTIONS)[number];

export default function SeekerDashboardPage() {
  return <RequireRole role="seeker">{(user) => <SeekerDashboard user={user} />}</RequireRole>;
}

function SeekerDashboard({ user }: { user: User }) {
  const { data, updateViewing, clearRecentlyViewed } = useStore();
  const [section, go] = useHashSection<S>(SECTIONS, "overview");

  const saved = data.listings.filter((l) => data.savedListingIds.includes(l.id));
  const viewed = data.recentlyViewed
    .filter((v) => v.userId === user.id)
    .map((v) => ({ v, l: data.listings.find((l) => l.id === v.listingId) }))
    .filter((x): x is { v: (typeof data.recentlyViewed)[number]; l: NonNullable<typeof x.l> } => !!x.l);
  const searches = data.savedSearches.filter((s) => s.userId === user.id);
  const updatesFor = (s: (typeof searches)[number]) => searchUpdates(data.listings, s.query, seenAt(s)).length;
  const totalUpdates = searches.reduce((n, s) => n + updatesFor(s), 0);
  const requests = data.inquiries.filter((i) => i.fromUserId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcoming = upcomingViewings(requests);
  const waiting = requests.filter((r) => r.status === "new").length;

  const browse = (
    <Link href={`/search?mode=${user.preferences?.mode ?? "rent"}`} className="btn-primary btn-sm">Browse homes</Link>
  );

  const savedGrid = (list: typeof saved) => (
    <div className="grid gap-3 xl:grid-cols-2">
      {list.map((l) => <ListingCard key={l.id} listing={l} layout="list" />)}
    </div>
  );

  const requestRows = (list: typeof requests) => (
    <RowList label="Your viewing requests and messages">
      {list.map((r) => {
        const l = data.listings.find((x) => x.id === r.listingId);
        const unread = unreadFor(r, "seeker");
        const open = !["completed", "declined", "cancelled", "closed"].includes(r.status);
        return (
          <li key={r.id} className="px-4 py-3.5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                {l ? <Link href={`/listings/${l.id}`} className="font-semibold text-ink-900 hover:underline">{l.title}</Link> : <span className="font-semibold">Listing removed</span>}
                <p className="text-ink-500">
                  {r.type === "viewing" ? "Viewing request" : "Message"} sent {formatDate(r.createdAt)}
                  {r.type === "viewing" && <> · {r.status === "accepted" ? "agreed" : "asked for"} {whenText(r.preferredDate, r.preferredTime)}</>}
                </p>
                {r.status === "reschedule" && (
                  <p className="mt-1 font-medium text-orange-800">The lister suggested {whenText(r.proposedDate, r.proposedTime)}.</p>
                )}
              </div>
              <Badge tone={INQUIRY_STATUS_TONE[r.status]}>{r.status === "new" ? "Waiting for the lister" : INQUIRY_STATUS_LABEL[r.status]}</Badge>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link href={`/messages#${r.id}`} className="btn-secondary btn-sm">
                Open conversation{unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{unread} new</span>}
              </Link>
              {r.status === "reschedule" && (
                <button className="btn-primary btn-sm" onClick={() => updateViewing(r.id, "accepted", undefined, "seeker")}>Accept new time</button>
              )}
              {open && r.type === "viewing" && (
                <button className="btn-ghost btn-sm" onClick={() => updateViewing(r.id, "cancelled", undefined, "seeker")}>Cancel request</button>
              )}
            </div>
          </li>
        );
      })}
    </RowList>
  );

  return (
    <DashboardShell
      eyebrow="Your home search"
      title={`Hello, ${user.name.split(" ")[0]}`}
      description="Homes you've saved or looked at, your saved searches and your viewing requests — all in one place."
      actions={browse}
      active={section}
      onChange={go}
      aside={[{ href: "/account", label: "Account & roles" }]}
      sections={[
        { id: "overview", label: "Overview" },
        { id: "saved", label: "Saved homes", count: saved.length },
        { id: "viewed", label: "Recently viewed", count: viewed.length },
        { id: "searches", label: "Saved searches", count: totalUpdates || searches.length, urgent: totalUpdates > 0 },
        { id: "requests", label: "Viewing requests", count: waiting, urgent: waiting > 0 },
      ]}
    >
      {section === "overview" && (
        <div className="space-y-10">
          <StatStrip
            stats={[
              { label: "Saved homes", value: saved.length },
              { label: "Saved searches", value: searches.length },
              { label: "Upcoming viewings", value: upcoming.length },
              { label: "Waiting for a reply", value: waiting },
            ]}
          />

          <Panel title="Upcoming viewings" action={requests.length ? <button className="link text-sm" onClick={() => go("requests")}>All requests</button> : undefined}>
            {upcoming.length ? (
              <RowList label="Upcoming viewings">{upcoming.slice(0, 3).map((i) => <ViewingItem key={i.id} inquiry={i} listings={data.listings} side="seeker" />)}</RowList>
            ) : (
              <EmptyState title="No viewings booked yet" body="Open any listing and tap “Request a viewing”. Your requests show up here." action={browse} />
            )}
          </Panel>

          <Panel title="Saved homes" action={saved.length > 3 ? <button className="link text-sm" onClick={() => go("saved")}>See all {saved.length}</button> : undefined}>
            {saved.length ? savedGrid(saved.slice(0, 3)) : <EmptyState title="No saved homes yet" body="Tap the heart on any home to keep it here and compare later." action={browse} />}
          </Panel>

          <Panel title="Recently viewed" action={viewed.length > 3 ? <button className="link text-sm" onClick={() => go("viewed")}>See all</button> : undefined}>
            {viewed.length ? (
              savedGrid(viewed.slice(0, 3).map((x) => x.l))
            ) : (
              <EmptyState title="Nothing viewed yet" body="Homes you open will appear here so you can find them again." />
            )}
          </Panel>

          <Panel title="Saved searches" action={searches.length ? <button className="link text-sm" onClick={() => go("searches")}>Manage</button> : undefined}>
            {searches.length ? (
              <div className="flex flex-wrap gap-2">
                {searches.slice(0, 5).map((s) => (
                  <button key={s.id} type="button" onClick={() => go("searches")} className="chip text-ink-900">
                    {s.label}
                    {updatesFor(s) > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{updatesFor(s)} new</span>}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No saved searches" body="Run a search, then choose “Save search” at the bottom of the results." />
            )}
          </Panel>
        </div>
      )}

      {section === "saved" && (
        <Panel title="Saved homes" description="Saved in this browser. Tap the heart again to remove a home." action={saved.length ? <Link href="/saved" className="btn-secondary btn-sm">Compare saved homes</Link> : undefined}>
          {saved.length ? savedGrid(saved) : <EmptyState title="No saved homes yet" body="Tap the heart on any home to keep it here and compare later." action={browse} />}
        </Panel>
      )}

      {section === "viewed" && (
        <Panel
          title="Recently viewed"
          description="The last homes you opened, newest first."
          action={viewed.length ? <button className="btn-ghost btn-sm" onClick={clearRecentlyViewed}>Clear history</button> : undefined}
        >
          {viewed.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {viewed.map(({ v, l }) => (
                <div key={l.id}>
                  <ListingCard listing={l} layout="list" />
                  <p className="mt-1 px-1 text-xs text-ink-500">Viewed {relativeDays(localDateOf(v.viewedAt))}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing viewed yet" body="Homes you open will appear here so you can find them again." action={browse} />
          )}
        </Panel>
      )}

      {section === "searches" && (
        <Panel
          title="Saved searches"
          description="We check your saved searches whenever you open the app and flag homes that are new or changed since you last looked. Updates appear here only — no emails, texts or push notifications."
        >
          {searches.length ? (
            <RowList label="Saved searches">
              {searches.map((s) => <SavedSearchItem key={s.id} search={s} />)}
            </RowList>
          ) : (
            <EmptyState
              title="No saved searches"
              body="Run a search with your area, rent or buy, budget, bedrooms and any filters, then choose “Save search” at the bottom of the results."
              action={browse}
            />
          )}
        </Panel>
      )}

      {section === "requests" && (
        <Panel title="Viewing requests and messages" description="Requests you've sent to listers. Cancel one if you no longer want the viewing.">
          {requests.length ? requestRows(requests) : <EmptyState title="No requests yet" body="Open a home you like and tap “Request a viewing” or send the lister a message." action={browse} />}
        </Panel>
      )}
    </DashboardShell>
  );
}
