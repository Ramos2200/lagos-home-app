"use client";

import Link from "next/link";
import { useState } from "react";
import { daysFromNowISO, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { InquiryType, Listing, Occupation, SeekerProfile } from "@/lib/types";
import { CheckIcon } from "./Icons";
import { MoneyField } from "./MoneyField";
import { OCCUPATION_LABEL, hasProfile } from "./SeekerProfileView";
import { useDialog } from "./useDialog";

type Errors = { name?: string; contact?: string; when?: string; message?: string; profile?: string };

const MAX_MESSAGE = 300;

export function InquiryDialog({
  listing,
  type,
  onClose,
}: {
  listing: Listing;
  type: InquiryType;
  onClose: () => void;
}) {
  const { currentUser, addInquiry, saveSeekerProfile } = useStore();
  // Optional renter/buyer profile (viewings only). Pre-filled from the saved one; off unless they've shared one before.
  const savedProfile = currentUser?.seekerProfile;
  const [withProfile, setWithProfile] = useState(hasProfile(savedProfile));
  const [budget, setBudget] = useState(savedProfile?.budget ? String(savedProfile.budget) : "");
  const [moveIn, setMoveIn] = useState(savedProfile?.moveInDate ?? "");
  const [household, setHousehold] = useState(savedProfile?.householdSize ? String(savedProfile.householdSize) : "");
  const [occupation, setOccupation] = useState<Occupation | "">(savedProfile?.occupation ?? "");
  const [remember, setRemember] = useState(true);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [share, setShare] = useState(false);
  const [contact, setContact] = useState(currentUser?.email ?? "");
  const [message, setMessage] = useState(type === "viewing" ? "" : `Hello, is "${listing.title}" still available?`);
  const [date, setDate] = useState(daysFromNowISO(2));
  const [time, setTime] = useState("Morning");
  const [sentId, setSentId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const ref = useDialog<HTMLDivElement>(onClose);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Enter your name so the lister knows who's asking.";
    if (share) {
      if (!contact.trim()) next.contact = "Add the phone number or email you want to share, or untick “Share my contact details”.";
      else if (!/@/.test(contact) && contact.replace(/\D/g, "").length < 7) next.contact = "That doesn't look like a phone number or email. Check it and try again.";
    }
    if (type === "viewing") {
      if (!date && !time) next.when = "Choose a date, a time of day, or both.";
      else if (date && date < todayISO()) next.when = "Choose today or a later date.";
    }
    const profile: SeekerProfile = {
      budget: Number(budget) || undefined,
      moveInDate: moveIn || undefined,
      householdSize: Number(household) || undefined,
      occupation: occupation || undefined,
    };
    if (type === "viewing" && withProfile) {
      const size = Number(household);
      if (!hasProfile(profile)) next.profile = "Fill in at least one profile detail, or untick “Include my profile”.";
      else if (household && (!Number.isInteger(size) || size < 1 || size > 20)) next.profile = "Household size should be a whole number from 1 to 20.";
      else if (moveIn && moveIn < todayISO()) next.profile = "Choose a move-in date from today onwards.";
    }
    if (type === "message" && !message.trim()) next.message = "Write a short message for the lister.";
    if (message.length > MAX_MESSAGE) next.message = `Keep your message under ${MAX_MESSAGE} characters.`;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(first === "when" ? "inq-date" : first === "profile" ? "inq-budget" : `inq-${first}`)?.focus();
      return;
    }
    const sendProfile = type === "viewing" && withProfile;
    if (sendProfile && currentUser && remember) saveSeekerProfile(profile);
    const id = addInquiry({
      listingId: listing.id,
      type,
      fromUserId: currentUser?.id,
      name: name.trim(),
      contact: share ? contact.trim() : "",
      shareContact: share,
      message: message.trim(),
      preferredDate: type === "viewing" ? date || undefined : undefined,
      preferredTime: type === "viewing" ? time || undefined : undefined,
      profile: sendProfile ? profile : undefined,
    });
    setSentId(id);
  }

  const inv = (k: keyof Errors) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `inq-${k}-error` } : {});
  const errCls = (k: keyof Errors) => (errors[k] ? "!border-red-500 ring-2 ring-red-100" : "");
  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`inq-${k}-error`} className="mt-1 text-sm font-medium text-red-700">
        <span aria-hidden className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-700 align-[-2px] text-[10px] font-bold text-white">!</span>
        {errors[k]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="inq-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl sm:p-6">
        {sentId ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <CheckIcon size={24} />
            </div>
            <h2 id="inq-title" className="mt-3 section-title">{type === "viewing" ? "Viewing request sent" : "Message sent"}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {type === "viewing" ? "The lister can accept it or suggest another time." : "The lister can reply in the app."}{" "}
              {share ? "You chose to share your contact details." : "Your contact details stay private."}
              {type === "viewing" && withProfile ? ` Your ${listing.purpose === "sale" ? "buyer" : "renter"} profile was included.` : ""} Demo only — nothing is sent outside IleLagos.
            </p>
            <div className="mt-5 grid gap-2">
              {currentUser ? (
                <Link href={`/messages#${sentId}`} className="btn-primary w-full" data-autofocus>Open conversation</Link>
              ) : (
                <p className="rounded-xl bg-sand-100 p-3 text-xs text-ink-700">
                  <Link href="/signin" className="link">Sign in</Link> to follow replies in Messages.
                </p>
              )}
              <button className="btn-secondary w-full" onClick={onClose} {...(currentUser ? {} : { "data-autofocus": true })}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="inq-title" className="section-title">{type === "viewing" ? "Request a viewing" : "Message the lister"}</h2>
                <p className="text-sm text-ink-500">{listing.title}</p>
              </div>
              <button type="button" className="btn-ghost btn-icon !min-h-9 !min-w-9" onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div>
              <label className="label" htmlFor="inq-name">Your name</label>
              <input id="inq-name" className={`field ${errCls("name")}`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-autofocus {...inv("name")} />
              {err("name")}
            </div>

            {type === "viewing" && (
              <fieldset>
                <legend className="label">When would you like to view?</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="inq-date">Date</label>
                    <input id="inq-date" type="date" min={todayISO()} className={`field ${errCls("when")}`} value={date} onChange={(e) => setDate(e.target.value)} {...inv("when")} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="inq-time">Time of day</label>
                    <select id="inq-time" className="field" value={time} onChange={(e) => setTime(e.target.value)}>
                      <option value="">No preference</option>
                      <option>Morning</option>
                      <option>Afternoon</option>
                      <option>Evening</option>
                    </select>
                  </div>
                </div>
                <button type="button" className="link mt-1.5 text-xs" onClick={() => setDate("")}>I&apos;m flexible on the date</button>
                {err("when")}
              </fieldset>
            )}

            <div>
              <label className="label" htmlFor="inq-message">
                {type === "viewing" ? "Short message" : "Your message"} {type === "viewing" && <span className="font-normal text-ink-500">(optional)</span>}
              </label>
              <textarea
                id="inq-message"
                rows={3}
                maxLength={MAX_MESSAGE + 50}
                className={`field ${errCls("message")}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === "viewing" ? "e.g. Can I come with my partner?" : undefined}
                {...inv("message")}
              />
              <p className={`mt-1 text-right text-xs ${message.length > MAX_MESSAGE ? "text-red-700" : "text-ink-500"}`}>{message.length}/{MAX_MESSAGE}</p>
              {err("message")}
            </div>

            {type === "viewing" && (
              <div className="rounded-xl border border-sand-200 p-3">
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" checked={withProfile} onChange={(e) => setWithProfile(e.target.checked)} />
                  <span>
                    <span className="font-medium text-ink-900">Include my {listing.purpose === "sale" ? "buyer" : "renter"} profile</span>
                    <span className="block text-xs text-ink-500">Optional. Helps the lister see if the home suits you. Just a few basics — never ID, BVN or bank details.</span>
                  </span>
                </label>
                {withProfile && (
                  <fieldset className="mt-3 space-y-3" aria-describedby={errors.profile ? "inq-profile-error" : undefined}>
                    <legend className="sr-only">Your {listing.purpose === "sale" ? "buyer" : "renter"} profile</legend>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="inq-budget">
                        {listing.purpose === "sale" ? "Budget (total)" : "Budget (rent per year)"}
                      </label>
                      <MoneyField id="inq-budget" value={budget} onChange={setBudget} placeholder={listing.purpose === "sale" ? "e.g. 90,000,000" : "e.g. 3,000,000"} aria-invalid={errors.profile ? true : undefined} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="inq-movein">{listing.purpose === "sale" ? "Move by" : "Move-in date"}</label>
                        <input id="inq-movein" type="date" min={todayISO()} className="field" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="inq-household">Household size</label>
                        <input id="inq-household" type="number" inputMode="numeric" min={1} max={20} className="field" value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="e.g. 3" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-500" htmlFor="inq-occupation">Work (optional)</label>
                      <select id="inq-occupation" className="field" value={occupation} onChange={(e) => setOccupation(e.target.value as Occupation | "")}>
                        <option value="">Prefer not to say</option>
                        {(Object.keys(OCCUPATION_LABEL) as Occupation[]).map((o) => (
                          <option key={o} value={o}>{OCCUPATION_LABEL[o]}</option>
                        ))}
                      </select>
                    </div>
                    {currentUser && (
                      <label className="flex items-center gap-2 text-xs text-ink-700">
                        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                        Remember this profile for my next viewing request
                      </label>
                    )}
                    {err("profile")}
                  </fieldset>
                )}
              </div>
            )}

            <div className="rounded-xl border border-sand-200 p-3">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" checked={share} onChange={(e) => setShare(e.target.checked)} />
                <span>
                  <span className="font-medium text-ink-900">Share my contact details with the lister</span>
                  <span className="block text-xs text-ink-500">Off by default. If you leave it off, you&apos;ll talk in IleLagos Messages and your phone and email stay private.</span>
                </span>
              </label>
              {share && (
                <div className="mt-3">
                  <label className="label" htmlFor="inq-contact">Phone or email to share</label>
                  <input id="inq-contact" className={`field ${errCls("contact")}`} value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="email" placeholder="e.g. 0800 000 0000 — use test details" {...inv("contact")} />
                  {err("contact")}
                </div>
              )}
            </div>

            <p className="rounded-xl bg-sand-100 p-3 text-xs text-ink-700">
              Stay safe: view the home in person and confirm who you&apos;re dealing with before paying anything. Never share bank PINs, BVN or ID documents in messages.
            </p>
            <button type="submit" className="btn-primary w-full">{type === "viewing" ? "Send viewing request" : "Send message"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
