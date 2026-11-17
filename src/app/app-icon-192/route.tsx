import { appIcon } from "@/lib/app-icon";

/** 192px app icon for the installable app (see manifest.ts). */
export function GET() {
  return appIcon(192);
}
