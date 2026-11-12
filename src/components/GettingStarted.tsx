"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { CheckIcon } from "./Icons";

export interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
  action?: () => void;
  cta: string;
}

/** Dismissible "Getting started" checklist for owner and agent dashboards. */
export function GettingStarted({ items, dismissed }: { items: ChecklistItem[]; dismissed?: boolean }) {
  const { dismissChecklist } = useStore();
  const done = items.filter((i) => i.done).length;
  if (dismissed || done === items.length) return null;

  return (
    <section className="card mt-5 p-4 sm:p-5" aria-labelledby="gs-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="gs-title" className="section-title">Getting started</h2>
          <p className="text-sm text-ink-500">{done} of {items.length} done</p>
        </div>
        <button className="text-sm font-semibold text-ink-500 hover:text-ink-900" onClick={dismissChecklist}>Hide</button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-sand-200">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 py-2.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i.done ? "bg-brand-600 text-white" : "border-2 border-sand-300"}`}>
              {i.done && <CheckIcon size={14} />}
            </span>
            <span className={`flex-1 text-sm ${i.done ? "text-ink-500 line-through" : "text-ink-900"}`}>{i.label}</span>
            {!i.done &&
              (i.href ? (
                <Link href={i.href} className="text-sm font-semibold text-brand-700">{i.cta}</Link>
              ) : (
                <button className="text-sm font-semibold text-brand-700" onClick={i.action}>{i.cta}</button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
