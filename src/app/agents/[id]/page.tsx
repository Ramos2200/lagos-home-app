import { Suspense } from "react";
import { AgentProfileView } from "./AgentProfileView";

export default function AgentProfilePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-ink-500">Loading agent…</div>}>
      <AgentProfileView />
    </Suspense>
  );
}
