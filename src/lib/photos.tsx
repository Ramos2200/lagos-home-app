"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LISTING_IMAGES } from "./images";

/**
 * Photos uploaded by owners and agents.
 *
 * Prototype only: photos are shrunk in the browser and kept in this browser's storage, under their
 * own key so a full photo store can never stop the rest of the demo data from saving. Nobody else
 * sees them — a live app would upload them to cloud storage instead.
 */
const PHOTO_KEY = "lagos-homes-photos-v1";

export const MAX_PHOTOS = 8;
/** Longest side after shrinking, in pixels. */
const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.72;
/** Refuse very large originals before trying to read them. */
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;

type PhotoMap = Record<string, string[]>;

interface PhotoApi {
  ready: boolean;
  /** Uploaded photos for a listing (empty when none). */
  uploaded: (listingId: string) => string[];
  /** Saves (or clears) a listing's photos. Returns an error message when the browser has no room left. */
  savePhotos: (listingId: string, photos: string[]) => string | null;
}

const PhotoContext = createContext<PhotoApi | null>(null);

export function PhotoProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loaded: PhotoMap = {};
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") loaded = parsed as PhotoMap;
      }
    } catch {
      // unreadable or blocked storage: start with no uploaded photos and leave whatever is there untouched
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhotos(loaded);
    setReady(true);
  }, []);

  const savePhotos = useCallback(
    (listingId: string, list: string[]) => {
      const next = { ...photos };
      if (list.length) next[listingId] = list.slice(0, MAX_PHOTOS);
      else delete next[listingId];
      try {
        localStorage.setItem(PHOTO_KEY, JSON.stringify(next));
      } catch {
        return "This browser's storage is full, so the photos weren't saved. Remove some photos (here or on other listings) and try again.";
      }
      setPhotos(next);
      return null;
    },
    [photos],
  );

  const api = useMemo<PhotoApi>(() => ({ ready, uploaded: (id) => photos[id] ?? [], savePhotos }), [ready, photos, savePhotos]);
  return <PhotoContext.Provider value={api}>{children}</PhotoContext.Provider>;
}

export function usePhotoStore(): PhotoApi {
  const ctx = useContext(PhotoContext);
  if (!ctx) throw new Error("usePhotoStore must be used inside PhotoProvider");
  return ctx;
}

/** Real photos for a listing: uploaded ones first, then any added by hand in lib/images.ts. Empty = use illustrations. */
export function useListingPhotos(listingId: string): string[] {
  const { uploaded } = usePhotoStore();
  const up = uploaded(listingId);
  return up.length ? up : (LISTING_IMAGES[listingId] ?? []);
}

/**
 * Shrinks a photo in the browser and returns it as a JPEG data URL.
 * Re-drawing the image also drops hidden details such as the camera's GPS location.
 */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`“${file.name}” isn't an image. Choose a JPG, PNG or similar photo.`);
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error(`“${file.name}” is over 15 MB. Choose a smaller photo.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`“${file.name}” couldn't be opened. Try a JPG or PNG photo.`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't process photos.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background in JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/** Rough size of a data URL in kilobytes, for showing how much room photos take. */
export function dataUrlKB(url: string): number {
  const base64 = url.slice(url.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4 / 1024);
}
