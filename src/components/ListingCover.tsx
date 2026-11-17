"use client";

import { useListingPhotos } from "@/lib/photos";
import type { Listing } from "@/lib/types";
import { ListingPhoto } from "./ListingPhoto";

/** The listing's first real photo when it has one, otherwise its illustrated placeholder. */
export function ListingCover({ listing, className = "" }: { listing: Pick<Listing, "id" | "photoSeed" | "propertyType" | "title">; className?: string }) {
  const photos = useListingPhotos(listing.id);
  if (photos.length) {
    return (
      <div className={`relative overflow-hidden bg-sand-200 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[0]} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return <ListingPhoto seed={listing.photoSeed} type={listing.propertyType} className={className} showTag={false} />;
}
