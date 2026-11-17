"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { setFlash } from "@/components/FlashNotice";
import { ListingForm, listingFieldsFromValues, valuesFromListing } from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { RequireRole } from "@/components/RequireRole";
import { todayISO } from "@/lib/format";
import { usePhotoStore } from "@/lib/photos";
import { agencyLabel } from "@/lib/agents";
import { useStore } from "@/lib/store";

function NewListing() {
  const params = useSearchParams();
  const as = params.get("as") === "agent" ? "agent" : "owner";
  const router = useRouter();
  const { createListing } = useStore();
  const { savePhotos } = usePhotoStore();
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
            description={<>{as === "agent" ? `Listing as agent · ${user.agencyName ? agencyLabel(user) : user.name}` : "Listing your own home"} · saved in this browser during the beta</>}
          />
          <ListingForm
            mode="create"
            listedBy={as}
            initial={initial}
            draftKey={`ilelagos-draft-${as}-${user.id}`}
            onCancel={() => router.push(back)}
            onSubmit={(v) => {
              const fields = listingFieldsFromValues(v);
              const created = createListing({
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
              const photoError = v.photos.length ? savePhotos(created.id, v.photos) : null;
              setFlash(
                photoError
                  ? `“${fields.title}” is published, but its photos weren't saved: ${photoError}`
                  : `“${fields.title}” is published and now shows in search. Viewing requests will appear here.`,
              );
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
