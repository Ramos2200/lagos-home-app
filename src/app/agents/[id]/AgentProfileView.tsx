"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckBadge } from "@/components/Badges";
import { ListingCard } from "@/components/ListingCard";
import { Avatar } from "@/components/SiteHeader";
import { EmptyState, MessagePage, Segmented } from "@/components/ui";
import { agencyLabel, agentStats, isAgent, replyTimeLabel } from "@/lib/agents";
import { formatDate, relativeDays } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Purpose } from "@/lib/types";

/** Public profile for an agent: who they are, where they work and their live listings. All demo data. */
export function AgentProfileView() {
  const { id } = useParams<{ id: string }>();
  const { data, ready } = useStore();
  const [tab, setTab] = useState<"all" | Purpose>("all");

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-48 animate-pulse" /></div>;

  const agent = data.users.find((u) => u.id === id);
  if (!agent || !isAgent(agent)) {
    return (
      <MessagePage
        title="Agent not found"
        body="This profile may have been removed."
        actions={<Link href="/agents" className="btn-primary">See all agents</Link>}
      />
    );
  }

  const s = agentStats(agent, data);
  const shown = tab === "all" ? s.live : s.live.filter((l) => l.purpose === tab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link href="/agents" className="btn-ghost btn-sm -ml-3">← All agents</Link>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_340px]">
        <header className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar name={agent.name} size={64} />
            <div className="min-w-0">
              <h1 className="page-title">{agent.name}</h1>
              <p className="mt-0.5 font-semibold text-ink-700">{agencyLabel(agent)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-500">On IleLagos since {formatDate(agent.createdAt)}</span>
              </div>
            </div>
          </div>
          {agent.bio && <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-700">{agent.bio}</p>}

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sand-200 bg-sand-200 sm:grid-cols-4">
            <Stat label="Live listings" value={String(s.live.length)} />
            <Stat label="For rent / sale" value={`${s.rentCount} / ${s.saleCount}`} />
            <Stat label="Rented, sold or paused" value={String(s.pastCount)} />
            <Stat label="Replies" value={replyTimeLabel(s).replace("Usually replies ", "")} small sub={s.repliesMeasured ? `From ${s.repliesMeasured} conversation${s.repliesMeasured === 1 ? "" : "s"}` : undefined} />
          </dl>

          {s.areas.length > 0 && (
            <div className="mt-5">
              <h2 className="text-sm font-bold text-ink-900">Areas covered</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.areas.map((a) => (
                  <Link key={a} href={`/areas/${encodeURIComponent(a)}`} className="chip !min-h-8 text-[13px]">{a}</Link>
                ))}
              </div>
            </div>
          )}
        </header>

        <aside className="card self-start p-5">
          <h2 className="text-sm font-bold text-ink-900">Checks on this agent</h2>
          <p className="mt-0.5 text-xs text-ink-500">Each check is separate. During the beta, IleLagos doesn&apos;t verify anyone yet.</p>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <p className="font-semibold text-ink-900">Identity</p>
              <CheckBadge state={agent.checks.identity.state} kind="identity" />
              <p className="mt-0.5 text-xs text-ink-500">{agent.checks.identity.date ? `Recorded ${relativeDays(agent.checks.identity.date)}` : "No date recorded"}</p>
            </li>
            <li>
              <p className="font-semibold text-ink-900">Agent licence</p>
              <CheckBadge state={agent.checks.agentLicensing?.state ?? "not_started"} kind="agentLicensing" />
              <p className="mt-0.5 text-xs text-ink-500">{agent.checks.agentLicensing?.date ? `Recorded ${relativeDays(agent.checks.agentLicensing.date)}` : "No date recorded"}</p>
            </li>
          </ul>
          <p className="mt-4 text-xs text-ink-500">
            To contact {agent.name.split(" ")[0]}, open one of their listings and request a viewing or send a message. Contact details stay private until either of you chooses to share them.
          </p>
          <Link href="/trust" className="link mt-2 inline-block text-sm">How checks work</Link>
        </aside>
      </div>

      <section className="mt-8" aria-labelledby="agent-listings">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="agent-listings" className="section-title">Listings by {agent.name.split(" ")[0]}</h2>
          <Segmented
            label="Show"
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: `All (${s.live.length})` },
              { value: "rent", label: `Rent (${s.rentCount})` },
              { value: "sale", label: `Sale (${s.saleCount})` },
            ]}
          />
        </div>
        {shown.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No live listings here" body="This agent has nothing listed in this category right now." />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, small = false }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="bg-white p-3">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className={`mt-0.5 font-extrabold tracking-tight text-ink-900 ${small ? "text-sm" : "text-xl"}`}>{value}</dd>
      {sub && <dd className="text-[11px] text-ink-500">{sub}</dd>}
    </div>
  );
}
