import { Suspense } from "react";
import { AreaGuideView } from "./AreaGuideView";

export default function AreaGuidePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-ink-500">Loading area guide…</div>}>
      <AreaGuideView />
    </Suspense>
  );
}
