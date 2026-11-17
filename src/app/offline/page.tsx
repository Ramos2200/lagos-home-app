import Link from "next/link";

/** Shown by the installed app when there's no internet and the page hasn't been opened before. */
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand-100 text-ink-700" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
          <path d="M3 3l18 18" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 text-ink-500">
        This page hasn&apos;t been saved for offline use yet. Pages you&apos;ve already opened, and your saved homes, still work without internet.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/saved" className="btn-primary">Saved homes</Link>
        <Link href="/" className="btn-secondary">Home</Link>
      </div>
    </div>
  );
}
