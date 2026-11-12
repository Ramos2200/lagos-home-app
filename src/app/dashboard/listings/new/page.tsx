"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { setFlash } from "@/components/FlashNotice";
import { ListingForm, listingFieldsFromValues, valuesFromListing } from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { RequireRole } from "@/components/RequireRole";
import { todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";

function NewListing() {
  const params = useSearchParams();
  const as = params.get("as") === "agent" ? "agent" : "owner";
  const router = useRouter();
  const { createListing } = useStore();
  const [initial] = useState(() => valuesFromListing());
  const back = as === "agent" ? "/dashboard/agent" : "/dashboard/owner";

  return (
    <RequireRole role={as}>
      {(user) => (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
          <PageHeader
            className="mb-6"
            eyebrow={as === "agent" ? "Agent · new listing" : "Owner · new listing"}
            title="List a home"
            description={<>{as === "agent" ? `Listing as agent · ${user.agencyName ?? user.name}` : "Listing your own home"} · saved as demo data in this browser</>}
          />
          <ListingForm
            mode="create"
            listedBy={as}
            initial={initial}
            draftKey={`ilelagos-draft-${as}-${user.id}`}
            onCancel={() => router.push(back)}
            onSubmit={(v) => {
              const fields = listingFieldsFromValues(v);
              setFlash(`“${fields.title}” is published and now shows in search. Viewing requests will appear here.`);
              createListing({
                ...fields,
                ownerId: user.id,
                agentId: as === "agent" ? user.id : undefined,
                listedBy: as,
                ownerDisplayName: as === "agent" ? fields.ownerDisplayName : undefined,
                checks:
                  as === "agent"
                    ? { ownerAuthorization: v.authorizationSubmitted ? { state: "submitted", date: todayISO() } : { state: "not_started" } }
                    : undefined,
              });
              router.push(back);
            }}
          />
        </div>
      )}
    </RequireRole>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={null}>
      <NewListing />
    </Suspense>
  );
}
