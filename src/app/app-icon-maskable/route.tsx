import { appIcon } from "@/lib/app-icon";

/** 512px icon with a safe margin, for Android home screens that crop icons to a shape. */
export function GET() {
  return appIcon(512, true);
}
