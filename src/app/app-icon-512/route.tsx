import { appIcon } from "@/lib/app-icon";

/** 512px app icon for the installable app (see manifest.ts). */
export function GET() {
  return appIcon(512);
}
