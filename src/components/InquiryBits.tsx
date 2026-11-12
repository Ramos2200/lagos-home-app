import { formatDate } from "@/lib/format";
import type { Inquiry } from "@/lib/types";

/** Contact details are only shown when the person chose to share them. */
export function ContactLine({ inquiry }: { inquiry: Inquiry }) {
  return inquiry.shareContact && inquiry.contact ? (
    <span className="break-all text-ink-900">
      {inquiry.contact} <span className="text-xs text-ink-500">(shared, test data)</span>
    </span>
  ) : (
    <span className="text-ink-500">Not shared — reply in Messages</span>
  );
}

/** Messages from the other side that arrived after this side last opened the conversation. */
export function unreadFor(i: Inquiry, side: "seeker" | "lister") {
  const readAt = side === "lister" ? i.listerReadAt : i.seekerReadAt;
  const other = side === "lister" ? "seeker" : "lister";
  return (i.messages ?? []).filter((m) => (m.from === other || (side === "seeker" && m.from === "system")) && (!readAt || m.at > readAt)).length;
}

export function whenText(date?: string, time?: string) {
  return [date ? formatDate(date) : "Flexible date", time || "any time"].join(" · ");
}
