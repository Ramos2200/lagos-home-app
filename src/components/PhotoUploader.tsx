"use client";

import { useId, useRef, useState } from "react";
import { MAX_PHOTOS, dataUrlKB, shrinkPhoto } from "@/lib/photos";

/**
 * Pick, reorder and remove listing photos. Photos are shrunk in the browser before they're kept.
 * The first photo is the cover shown in search results.
 */
export function PhotoUploader({ value, onChange }: { value: string[]; onChange: (photos: string[]) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const room = MAX_PHOTOS - value.length;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setProblems([]);
    const picked = Array.from(files);
    const errs: string[] = [];
    if (picked.length > room) errs.push(`You can add ${room} more photo${room === 1 ? "" : "s"} (${MAX_PHOTOS} at most). Extra photos were skipped.`);
    const added: string[] = [];
    for (const f of picked.slice(0, room)) {
      try {
        added.push(await shrinkPhoto(f));
      } catch (e) {
        errs.push(e instanceof Error ? e.message : `“${f.name}” couldn't be added.`);
      }
    }
    if (added.length) onChange([...value, ...added]);
    setProblems(errs);
    setStatus(added.length ? `${added.length} photo${added.length === 1 ? "" : "s"} added.` : "");
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setStatus(j === 0 ? "Cover photo changed." : `Photo moved to position ${j + 1}.`);
  };
  const remove = (i: number) => {
    onChange(value.filter((_, k) => k !== i));
    setStatus(`Photo ${i + 1} removed.`);
  };

  const totalKB = value.reduce((s, p) => s + dataUrlKB(p), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="label !mb-0">Photos <span className="font-normal text-ink-500">(optional · up to {MAX_PHOTOS})</span></p>
          <p id={`${id}-hint`} className="text-xs text-ink-500">The first photo is the cover in search results. Start with the outside of the home.</p>
        </div>
        <label
          htmlFor={id}
          className={`btn-secondary btn-sm cursor-pointer ${room <= 0 || busy ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={room <= 0 || busy}
        >
          {busy ? "Adding…" : value.length ? "+ Add more photos" : "+ Add photos"}
        </label>
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={room <= 0 || busy}
          aria-describedby={`${id}-hint ${id}-privacy`}
          onChange={(e) => add(e.target.files)}
        />
      </div>

      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((src, i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-sand-200 bg-white">
              <div className="relative aspect-[4/3] bg-sand-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${i + 1}${i === 0 ? " (cover)" : ""}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">Cover</span>}
              </div>
              <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                <div className="flex">
                  <button type="button" className="btn-ghost !min-h-8 !px-2 text-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}>←</button>
                  <button type="button" className="btn-ghost !min-h-8 !px-2 text-sm" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Move photo ${i + 1} later`}>→</button>
                </div>
                <button type="button" className="btn-ghost !min-h-8 !px-2 text-xs font-semibold text-red-700" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <label htmlFor={id} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 px-4 py-8 text-center hover:border-ink-900">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-500" aria-hidden>
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <circle cx="12" cy="13" r="3.5" />
            <path d="M8 6l1.5-2h5L16 6" />
          </svg>
          <span className="mt-2 text-sm font-semibold text-ink-900">Add photos of the home</span>
          <span className="text-xs text-ink-500">On a phone you can take them with the camera</span>
        </label>
      )}

      <p className="sr-only" role="status">{status}</p>
      {problems.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <p id={`${id}-privacy`} className="text-xs text-ink-500">
        Beta: photos are made smaller and kept only in this browser{value.length ? ` (about ${totalKB} KB)` : ""}, so other people won&apos;t see them.
        Location details hidden in photos are removed. Don&apos;t upload photos of people, ID documents or anything private.
      </p>
    </div>
  );
}
