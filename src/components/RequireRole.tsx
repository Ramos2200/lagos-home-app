"use client";

import Link from "next/link";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Role, User } from "@/lib/types";

export function RequireRole({ role, children }: { role: Role; children: (user: User) => React.ReactNode }) {
  const { ready, currentUser, addRole } = useStore();

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-40 animate-pulse bg-sand-50" /></div>;

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to continue</h1>
        <p className="mt-2 text-ink-500">The {ROLE_LABEL[role].toLowerCase()} dashboard needs an account.</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link href="/signin" className="btn-secondary">Use a test account</Link>
          <Link href="/signup" className="btn-primary">Sign up</Link>
        </div>
      </div>
    );
  }

  if (!currentUser.roles.includes(role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Add the {ROLE_LABEL[role].toLowerCase()} role?</h1>
        <p className="mt-2 text-ink-500">{ROLE_DESCRIPTION[role]}. You can keep your existing roles.</p>
        <button className="btn-primary mt-6" onClick={() => addRole(role)}>
          Add {ROLE_LABEL[role].toLowerCase()} role
        </button>
      </div>
    );
  }

  return <>{children(currentUser)}</>;
}
