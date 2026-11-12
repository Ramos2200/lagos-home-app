/**
 * Real photos, when you have them.
 *
 * 1. Put image files in /public/images (e.g. /public/images/hero.jpg).
 * 2. Set the path below (starting with "/images/...").
 *
 * Until a path is set, the app shows its illustrated placeholders — no broken images.
 * Only use photos you own or are licensed to use.
 */

/** Large photo behind the home page search (wide, at least 2000px). */
export const HERO_IMAGE: string | null = null;

/** Optional photos per area for the "Explore Lagos" tiles, e.g. { Lekki: "/images/areas/lekki.jpg" }. */
export const AREA_IMAGES: Record<string, string> = {};

/**
 * Optional photos per listing, in gallery order (exterior first), e.g.
 * { "lst-yaba-miniflat": ["/images/listings/yaba-1.jpg", "/images/listings/yaba-2.jpg"] }.
 */
export const LISTING_IMAGES: Record<string, string[]> = {};
