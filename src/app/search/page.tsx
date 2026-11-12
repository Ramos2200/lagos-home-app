import { Suspense } from "react";
import { SearchView } from "./SearchView";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-ink-500">Loading search…</div>}>
      <SearchView />
    </Suspense>
  );
}
