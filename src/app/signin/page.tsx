"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/SiteHeader";
import { ROLE_LABEL } from "@/lib/constants";
import { useStore } from "@/lib/store";

export default function SigninPage() {
  const { data, ready, signIn, currentUser, signOut } = useStore();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="page-title">Sign in</h1>
      <p className="mt-1 text-sm text-ink-500">
        This prototype has no passwords. Pick a demo account to explore, or{" "}
        <Link href="/signup" className="font-semibold text-brand-700">create your own</Link>.
      </p>

      {currentUser && (
        <div className="card mt-5 flex items-center justify-between gap-3 p-4">
          <div className="text-sm">
            Signed in as <b>{currentUser.name}</b>
          </div>
          <button className="btn-secondary btn-sm" onClick={signOut}>Sign out</button>
        </div>
      )}

      <ul className="mt-5 space-y-2">
        {ready &&
          data.users.map((u) => (
            <li key={u.id}>
              <button
                className="card flex w-full items-center gap-3 p-4 text-left hover:border-brand-200"
                onClick={() => {
                  signIn(u.id);
                  router.push(u.isStaff ? "/moderation" : u.activeRole === "agent" ? "/dashboard/agent" : u.activeRole === "owner" ? "/dashboard/owner" : "/dashboard/home");
                }}
              >
                <Avatar name={u.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {u.name} {u.isDemo && <span className="font-normal text-ink-500">(demo)</span>}
                  </span>
                  <span className="block text-sm text-ink-500">
                    {u.isStaff ? "Demo staff · moderation queue" : u.roles.map((r) => ROLE_LABEL[r]).join(" · ")}
                    {u.agencyName ? ` — ${u.agencyName}` : ""}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brand-700">Continue</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
