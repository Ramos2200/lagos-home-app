"use client";

import { useId, useState } from "react";
import { useStore } from "@/lib/store";

const MAX = 300;

/**
 * A private note on a saved home ("ask about generator"). Kept in this browser only —
 * listers never see it and nothing is sent anywhere.
 */
export function SavedNote({ listingId, compact = false }: { listingId: string; compact?: boolean }) {
  const { data, setSavedNote } = useStore();
  const saved = data.savedNotes[listingId] ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState("");
  const id = useId();

  function save() {
    setSavedNote(listingId, draft.slice(0, MAX));
    setEditing(false);
    setStatus(draft.trim() ? "Note saved" : "Note removed");
    setTimeout(() => setStatus(""), 2000);
  }

  if (!editing) {
    return (
      <div className={compact ? "" : "rounded-xl bg-amber-50/70 p-3 ring-1 ring-amber-200"}>
        {saved ? (
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm whitespace-pre-line text-ink-900">
              <span className="mr-1 text-xs font-bold tracking-wide text-amber-800 uppercase">Your note</span> {saved}
            </p>
            <button type="button" className="link shrink-0 text-sm" onClick={() => { setDraft(saved); setEditing(true); }} aria-label="Edit your note">
              Edit
            </button>
          </div>
        ) : (
          <button type="button" className="link text-sm" onClick={() => { setDraft(""); setEditing(true); }}>
            + Add a private note
          </button>
        )}
        <p className="sr-only" role="status">{status}</p>
        {status && <p className="mt-1 text-xs font-semibold text-brand-700" aria-hidden>{status}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label !mb-1">Private note</label>
      <textarea
        id={id}
        className="field min-h-20 text-sm"
        value={draft}
        maxLength={MAX}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
        }}
        placeholder="e.g. Ask about the generator hours and if the caution fee is refundable"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="text-xs text-ink-500">
        Only you see this — it&apos;s kept in this browser and never shown to the lister. {draft.length}/{MAX}
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn-primary btn-sm" onClick={save}>Save note</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}
