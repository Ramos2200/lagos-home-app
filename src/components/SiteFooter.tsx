"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { LanguageSelect } from "./LanguageSelect";

export function SiteFooter() {
  const { resetDemo } = useStore();
  return (
    <footer className="mt-16 border-t border-sand-200 bg-sand-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-ink-500 md:grid-cols-3">
        <div>
          <p className="font-semibold text-ink-900">IleLagos beta</p>
          <p className="mt-1">
            The homes and people shown are samples for testing. Nothing here is a real offer, and no property title has been
            legally verified.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Link href="/search?mode=rent" className="hover:text-brand-700">Homes for rent</Link>
          <Link href="/search?mode=sale" className="hover:text-brand-700">Homes for sale</Link>
          <Link href="/agents" className="hover:text-brand-700">Agents</Link>
          <Link href="/areas" className="hover:text-brand-700">Area guides</Link>
          <Link href="/install" className="hover:text-brand-700">Get the app</Link>
          <Link href="/feedback" className="font-semibold text-brand-700 hover:underline">Give feedback</Link>
          <Link href="/trust" className="hover:text-brand-700">How checks & statuses work</Link>
          <Link href="/moderation" className="hover:text-brand-700">Report queue (staff)</Link>
        </div>
        <div>
          <LanguageSelect className="mb-4 max-w-xs" />
          <p>Your changes are saved only in this browser.</p>
          <button
            type="button"
            className="mt-2 text-brand-700 underline underline-offset-2"
            onClick={() => {
              if (confirm("Start over? This replaces everything saved in this browser with the original sample homes.")) resetDemo();
            }}
          >
            Start over with fresh sample homes
          </button>
        </div>
      </div>
    </footer>
  );
}
