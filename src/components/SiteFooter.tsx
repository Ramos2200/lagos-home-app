"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export function SiteFooter() {
  const { resetDemo } = useStore();
  return (
    <footer className="mt-16 border-t border-sand-200 bg-sand-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-ink-500 md:grid-cols-3">
        <div>
          <p className="font-semibold text-ink-900">IleLagos prototype</p>
          <p className="mt-1">
            Fictional listings for design testing. Nothing here is a real offer, and no property title has been
            legally verified.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Link href="/search?mode=rent" className="hover:text-brand-700">Homes for rent</Link>
          <Link href="/search?mode=sale" className="hover:text-brand-700">Homes for sale</Link>
          <Link href="/agents" className="hover:text-brand-700">Agents</Link>
          <Link href="/areas" className="hover:text-brand-700">Area guides</Link>
          <Link href="/trust" className="hover:text-brand-700">How checks & statuses work</Link>
          <Link href="/moderation" className="hover:text-brand-700">Report queue (demo staff)</Link>
        </div>
        <div>
          <p>Demo changes are saved only in this browser (localStorage).</p>
          <button
            type="button"
            className="mt-2 text-brand-700 underline underline-offset-2"
            onClick={() => {
              if (confirm("Reset all demo data in this browser to the original sample listings?")) resetDemo();
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>
    </footer>
  );
}
