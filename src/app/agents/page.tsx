"use client";

import Link from "next/link";
import { CheckBadge } from "@/components/Badges";
import { Avatar } from "@/components/SiteHeader";
import { EmptyState, PageHeader } from "@/components/ui";
import { agencyLabel, agentStats, isAgent, replyTimeLabel } from "@/lib/agents";
import { useStore } from "@/lib/store";

/** Every agent in the demo data, with their areas and live listings. */
export default function AgentsPage() {
  const { data, ready } = useStore();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-40 animate-pulse" /></div>;
  const agents = data.users.filter(isAgent).map((a) => ({ a, s: agentStats(a, data) })).sort((x, y) => y.s.live.length - x.s.live.length);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Agents"
        title="Agents on IleLagos"
        description="See where each agent works, what they have listed and which checks they've started."
      />
      {agents.length === 0 ? (
        <div className="mt-8"><EmptyState title="No agents yet" body="Agents appear here when they sign up and list a home." /></div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(({ a, s }) => (
            <li key={a.id} className="card relative flex flex-col gap-3 p-5 transition hover:shadow-raised">
              <div className="flex items-center gap-3">
                <Avatar name={a.name} size={48} />
                <div className="min-w-0">
                  <Link href={`/agents/${a.id}`} className="font-bold text-ink-900 after:absolute after:inset-0 after:content-[''] hover:underline">
                    {a.name}
                  </Link>
                  <p className="truncate text-sm text-ink-500">{agencyLabel(a)}</p>
                </div>
              </div>
              <p className="text-sm text-ink-700">
                <b className="text-ink-900">{s.live.length}</b> live listing{s.live.length === 1 ? "" : "s"} · {replyTimeLabel(s)}
              </p>
              {s.areas.length > 0 && <p className="line-clamp-2 text-xs text-ink-500">{s.areas.join(" · ")}</p>}
              <div className="mt-auto flex flex-wrap gap-1.5">
                <CheckBadge state={a.checks.identity.state} kind="identity" />
                <CheckBadge state={a.checks.agentLicensing?.state ?? "not_started"} kind="agentLicensing" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
