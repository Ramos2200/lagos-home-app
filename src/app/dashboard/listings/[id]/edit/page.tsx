"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { setFlash } from "@/components/FlashNotice";
import { ListingForm, listingFieldsFromValues, valuesFromListing } from "@/components/ListingForm";
import { PageHeader } from "@/components/ui";
import { todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";

function EditListing() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, data, currentUser, updateListing, setListingCheck } = useStore();

  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-10"><div className="card h-40 animate-pulse bg-sand-50" /></div>;

  const listing = data.listings.find((l) => l.id === id);
  if (!listing) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center"><h1 className="text-xl font-semibold tracking-tight">Listing not found</h1></div>;
  }
  const isAgent = !!currentUser && listing.agentId === currentUser.id;
  const isOwner = !!currentUser && listing.ownerId === currentUser.id && listing.listedBy === "owner";
  if (!isAgent && !isOwner) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">You can&apos;t edit this listing</h1>
        <p className="mt-2 text-ink-500">Only the owner who listed it, or the agent managing it, can make changes.</p>
        <Link href="/signin" className="btn-primary mt-6">Switch demo account</Link>
      </div>
    );
  }
  const back = isAgent ? "/dashboard/agent" : "/dashboard/owner";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <PageHeader className="mb-6" eyebrow="Edit listing" title={listing.title} description="Price changes are added to the listing's dated asking price history." />
      <ListingForm
        mode="edit"
        listedBy={isAgent ? "agent" : "owner"}
        initial={valuesFromListing(listing)}
        originalPrice={listing.price}
        onCancel={() => router.push(back)}
        onSubmit={(v) => {
          const fields = listingFieldsFromValues(v);
          const statusChangedToAvailable = fields.status === "available" && listing.status !== "available";
          updateListing(
            listing.id,
            {
              ...fields,
              ...(statusChangedToAvailable
                ? { lastConfirmed: todayISO(), checks: { ...listing.checks, availabilityConfirmation: { state: "self_declared", date: todayISO() } } }
                : {}),
            },
            v.priceNote,
          );
          if (isAgent && v.authorizationSubmitted && listing.checks.ownerAuthorization.state === "not_started") {
            setListingCheck(listing.id, "ownerAuthorization", { state: "submitted", date: todayISO() });
          }
          setFlash(`Changes to “${fields.title}” are saved.`);
          router.push(back);
        }}
      />
    </div>
  );
}

export default function EditListingPage() {
  return (
    <Suspense fallback={null}>
      <EditListing />
    </Suspense>
  );
}
