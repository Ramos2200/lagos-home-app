import { Suspense } from "react";
import { ListingDetailView } from "./ListingDetailView";

export default function ListingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-ink-500">Loading listing…</div>}>
      <ListingDetailView />
    </Suspense>
  );
}
