"use client";

import Link from "next/link";
import { SeekerProfileView } from "@/components/SeekerProfileView";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badges";
import { unreadFor, whenText } from "@/components/InquiryBits";
import { ListingCover } from "@/components/ListingCover";
import { Avatar } from "@/components/SiteHeader";
import { EmptyState, MessagePage, PageHeader } from "@/components/ui";
import { INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE } from "@/lib/constants";
import { formatDate, localDateOf, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Inquiry, Listing, User } from "@/lib/types";

type Side = "seeker" | "lister";
interface Thread {
  inquiry: Inquiry;
  listing?: Listing;
  side: Side;
  other: string;
}

export default function MessagesPage() {
  const { ready, currentUser } = useStore();
  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="card h-40 animate-pulse" /></div>;
  if (!currentUser)
    return (
      <MessagePage
        title="Sign in to see your messages"
        body="Conversations with listers and renters are kept in your account in this browser."
        actions={<><Link href="/signin" className="btn-primary">Sign in</Link><Link href="/signup" className="btn-secondary">Create an account</Link></>}
      />
    );
  return <Messages user={currentUser} />;
}

function Messages({ user }: { user: User }) {
  const { data } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const threads = useMemo<Thread[]>(() => {
    const out: Thread[] = [];
    for (const i of data.inquiries) {
      const listing = data.listings.find((l) => l.id === i.listingId);
      const isLister = !!listing && (listing.agentId === user.id || (listing.ownerId === user.id && listing.listedBy === "owner"));
      if (isLister) out.push({ inquiry: i, listing, side: "lister", other: i.name });
      else if (i.fromUserId === user.id) {
        const lister = data.users.find((u) => u.id === (listing?.agentId ?? listing?.ownerId));
        out.push({ inquiry: i, listing, side: "seeker", other: lister?.name ?? "The lister" });
      }
    }
    const last = (t: Thread) => t.inquiry.messages?.at(-1)?.at ?? `${t.inquiry.createdAt}T00:00:00.000Z`;
    return out.sort((a, b) => last(b).localeCompare(last(a)));
  }, [data.inquiries, data.listings, data.users, user.id]);

  // The open conversation lives in the URL hash so it can be linked to (e.g. from a dashboard).
  useEffect(() => {
    const read = () => setActiveId(window.location.hash.slice(1) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const open = (id: string | null) => {
    setActiveId(id);
    window.history.pushState(null, "", id ? `#${id}` : window.location.pathname);
  };

  const active = threads.find((t) => t.inquiry.id === activeId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Messages"
        title="Conversations"
        description="Talk about viewings without sharing your phone or email. Messages stay inside IleLagos."
      />

      {threads.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No conversations yet"
            body="When you request a viewing or message a lister — or someone contacts you about your listing — the conversation appears here."
            action={<Link href="/search?mode=rent" className="btn-primary btn-sm">Browse homes</Link>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <nav aria-label="Conversations" className={active ? "hidden lg:block" : ""}>
            <ul className="divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card">
              {threads.map((t) => {
                const unread = unreadFor(t.inquiry, t.side);
                const last = [...(t.inquiry.messages ?? [])].reverse()[0];
                const on = t.inquiry.id === activeId;
                return (
                  <li key={t.inquiry.id}>
                    <button
                      type="button"
                      onClick={() => open(t.inquiry.id)}
                      aria-current={on ? "true" : undefined}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${on ? "bg-brand-50" : "hover:bg-sand-50"}`}
                    >
                      <Avatar name={t.other} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${unread ? "font-bold text-ink-900" : "font-semibold text-ink-900"}`}>{t.other}</span>
                          {unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
                        </span>
                        <span className="block truncate text-xs text-ink-500">{t.listing?.title ?? "Listing removed"}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <Badge tone={INQUIRY_STATUS_TONE[t.inquiry.status]} className="!px-1.5 !py-0 !text-[10px]">{INQUIRY_STATUS_LABEL[t.inquiry.status]}</Badge>
                          <span className="truncate text-xs text-ink-500">{last ? last.text : t.inquiry.type === "viewing" ? "Viewing request" : "Message"}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 px-1 text-xs text-ink-500">{threads.filter((t) => t.side === "lister").length} about your listings · {threads.filter((t) => t.side === "seeker").length} you started</p>
          </nav>

          <div className={active ? "" : "hidden lg:block"}>
            {active ? (
              <ThreadView key={active.inquiry.id} thread={active} user={user} onBack={() => open(null)} />
            ) : (
              <EmptyState title="Choose a conversation" body="Select a conversation on the left to read and reply." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ThreadView({ thread, user, onBack }: { thread: Thread; user: User; onBack: () => void }) {
  const { sendMessage, markThreadRead, shareContact, updateViewing } = useStore();
  const { inquiry: i, listing: l, side, other } = thread;
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [suggest, setSuggest] = useState(false);
  const [date, setDate] = useState(i.preferredDate ?? todayISO());
  const [time, setTime] = useState(i.preferredTime ?? "Morning");
  const endRef = useRef<HTMLDivElement>(null);
  const count = i.messages?.length ?? 0;

  // Opening the conversation marks it as read; new messages keep it read while it's open.
  useEffect(() => {
    markThreadRead(i.id, side);
    endRef.current?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i.id, count]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Write a message before sending.");
      document.getElementById("chat-input")?.focus();
      return;
    }
    if (text.length > 500) return setError("Keep messages under 500 characters.");
    sendMessage(i.id, side, text);
    setText("");
    setError("");
  };

  const viewing = i.type === "viewing";
  const closed = ["completed", "declined", "cancelled", "closed"].includes(i.status);
  const mineShared = side === "seeker" ? !!i.shareContact && !!i.contact : !!i.listerShared;
  const theirsShared = side === "seeker" ? !!i.listerShared : !!i.shareContact && !!i.contact;

  return (
    <section className="card flex flex-col overflow-hidden" aria-labelledby="thread-title">
      {/* Header */}
      <header className="flex items-start gap-3 border-b border-sand-200 p-4">
        <button type="button" onClick={onBack} className="btn-ghost btn-sm -ml-2 lg:hidden" aria-label="Back to all conversations">←</button>
        {l && <ListingCover listing={l} className="hidden h-12 w-14 shrink-0 rounded-lg sm:block" />}
        <div className="min-w-0 flex-1">
          <h2 id="thread-title" className="truncate font-semibold text-ink-900">{other}</h2>
          {l ? <Link href={`/listings/${l.id}`} className="link block truncate text-xs">{l.title}</Link> : <p className="text-xs text-ink-500">Listing removed</p>}
        </div>
        <Badge tone={INQUIRY_STATUS_TONE[i.status]}>{INQUIRY_STATUS_LABEL[i.status]}</Badge>
      </header>

      {/* Viewing details and actions */}
      {viewing && (
        <div className="border-b border-sand-200 bg-sand-50 p-4 text-sm">
          <p>
            <span className="text-ink-500">{i.status === "accepted" ? "Agreed time: " : "Requested time: "}</span>
            <b className="text-ink-900">{whenText(i.preferredDate, i.preferredTime)}</b>
          </p>
          {i.status === "reschedule" && (
            <p className="mt-1 text-orange-800">
              Suggested new time: <b>{whenText(i.proposedDate, i.proposedTime)}</b>
              {side === "lister" ? ` — waiting for ${other.split(" ")[0]}` : ""}
            </p>
          )}
          <SeekerProfileView profile={i.profile} purpose={l?.purpose} byYou={side === "seeker"} className="mt-3" />
          <div className="mt-3 flex flex-wrap gap-2">
            {side === "lister" && i.status === "new" && (
              <>
                <button className="btn-primary btn-sm" onClick={() => updateViewing(i.id, "accepted", undefined, "lister")}>Accept</button>
                <button className="btn-secondary btn-sm" onClick={() => setSuggest(true)}>Suggest another time</button>
                <button className="btn-ghost btn-sm" onClick={() => updateViewing(i.id, "declined", undefined, "lister")}>Decline</button>
              </>
            )}
            {side === "lister" && i.status === "accepted" && (
              <>
                <button className="btn-primary btn-sm" onClick={() => updateViewing(i.id, "completed", undefined, "lister")}>Mark as completed</button>
                <button className="btn-secondary btn-sm" onClick={() => setSuggest(true)}>Change time</button>
              </>
            )}
            {side === "seeker" && i.status === "reschedule" && (
              <button className="btn-primary btn-sm" onClick={() => updateViewing(i.id, "accepted", undefined, "seeker")}>Accept new time</button>
            )}
            {side === "seeker" && !closed && (
              <button className="btn-ghost btn-sm" onClick={() => updateViewing(i.id, "cancelled", undefined, "seeker")}>Cancel request</button>
            )}
          </div>
          {suggest && (
            <div className="mt-3 grid gap-2 rounded-xl border border-sand-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="th-date">Date</label>
                <input id="th-date" type="date" min={todayISO()} className="field" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="th-time">Time of day</label>
                <select id="th-time" className="field" value={time} onChange={(e) => setTime(e.target.value)}>
                  <option value="">No preference</option>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary btn-sm"
                  onClick={() => {
                    updateViewing(i.id, "reschedule", undefined, "lister", { date: date || undefined, time: time || undefined });
                    setSuggest(false);
                  }}
                >
                  Send
                </button>
                <button className="btn-ghost btn-sm" onClick={() => setSuggest(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <ol className="max-h-[52vh] min-h-48 space-y-3 overflow-y-auto p-4" aria-label="Messages" aria-live="polite">
        {(i.messages ?? []).length === 0 && <li className="py-6 text-center text-sm text-ink-500">No messages yet. Say hello below.</li>}
        {(i.messages ?? []).map((m) =>
          m.from === "system" ? (
            <li key={m.id} className="text-center text-xs text-ink-500">
              <span className="rounded-full bg-sand-100 px-3 py-1">{m.text}</span>
            </li>
          ) : (
            <li key={m.id} className={`flex ${m.from === side ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.from === side ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-sand-100 text-ink-900"}`}>
                <p className="sr-only">{m.from === side ? "You said:" : `${other} said:`}</p>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className={`mt-1 text-[10px] ${m.from === side ? "text-brand-100" : "text-ink-500"}`}>
                  {formatDate(localDateOf(m.at))} · {new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </li>
          ),
        )}
        <div ref={endRef} />
      </ol>

      {/* Privacy */}
      <div className="border-t border-sand-200 px-4 py-3 text-xs text-ink-700">
        <p>
          <b>Your contact details:</b> {mineShared ? "shared in this conversation." : "private."}{" "}
          <b className="ml-2">Theirs:</b>{" "}
          {theirsShared ? (side === "lister" ? <span className="break-all">{i.contact} (test data)</span> : "shared — see the message above") : "private."}
        </p>
        {!mineShared && <ShareContact inquiry={i} side={side} user={user} onShare={(value) => shareContact(i.id, side, value)} />}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-sand-200 p-3" noValidate>
        <label htmlFor="chat-input" className="sr-only">Write a message to {other}</label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-input"
            rows={2}
            className={`field resize-none ${error ? "!border-red-500" : ""}`}
            placeholder={closed ? "This conversation is closed, but you can still send a note" : `Message ${other.split(" ")[0]}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby="chat-help"
          />
          <button type="submit" className="btn-primary shrink-0">Send</button>
        </div>
        <p id="chat-help" className={`mt-1 text-xs ${error ? "font-medium text-red-700" : "text-ink-500"}`} role={error ? "alert" : undefined}>
          {error || "Ctrl + Enter to send. Messages stay inside IleLagos — no SMS, email or push notification is sent."}
        </p>
      </form>
    </section>
  );
}

function ShareContact({ inquiry, side, user, onShare }: { inquiry: Inquiry; side: Side; user: User; onShare: (value: string) => void }) {
  const { sendMessage } = useStore();
  const [confirming, setConfirming] = useState(false);
  const mine = side === "seeker" ? inquiry.contact || user.email : user.phone || user.email;
  if (!confirming)
    return (
      <button type="button" className="link mt-1 text-xs" onClick={() => setConfirming(true)}>
        Share my contact details
      </button>
    );
  return (
    <div className="mt-2 rounded-lg bg-sand-50 p-2.5 ring-1 ring-sand-200">
      <p>
        Share <b className="break-all">{mine}</b> with the other person? They&apos;ll see it in this conversation. You can&apos;t take it back.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => {
            onShare(mine);
            sendMessage(inquiry.id, side, `My contact details: ${mine}`);
            setConfirming(false);
          }}
        >
          Yes, share
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
      </div>
    </div>
  );
}
