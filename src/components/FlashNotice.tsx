"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "./Icons";

const KEY = "ilelagos-flash";

/** Queue a one-time confirmation message to show on the next page (e.g. after publishing). */
export function setFlash(message: string) {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {}
}

/** Shows (and clears) a queued confirmation message. */
export function FlashNotice() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    try {
      const m = sessionStorage.getItem(KEY);
      if (m) {
        sessionStorage.removeItem(KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMsg(m);
      }
    } catch {}
  }, []);
  if (!msg) return null;
  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <CheckIcon size={14} />
      </span>
      <p className="flex-1">{msg}</p>
      <button type="button" className="btn-ghost btn-sm !min-h-7 !px-2" onClick={() => setMsg(null)} aria-label="Dismiss message">✕</button>
    </div>
  );
}
