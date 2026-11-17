"use client";

import { useState } from "react";
import { useInstallPrompt, useIsInstalled } from "@/components/PwaSetup";
import { PageHeader } from "@/components/ui";

const STEPS: { device: string; steps: string[] }[] = [
  {
    device: "Android phone (Chrome)",
    steps: ["Open IleLagos in Chrome.", "Tap the ⋮ menu at the top right.", "Tap “Install app” or “Add to Home screen”, then “Install”."],
  },
  {
    device: "iPhone or iPad (Safari)",
    steps: ["Open IleLagos in Safari.", "Tap the Share button (the square with an arrow).", "Scroll down and tap “Add to Home Screen”, then “Add”."],
  },
  {
    device: "Computer (Chrome or Edge)",
    steps: ["Open IleLagos in Chrome or Edge.", "Click the install icon at the right end of the address bar (a screen with a down arrow).", "Click “Install”."],
  },
];

/** How to install IleLagos on a phone or computer, with a one-tap button where the browser supports it. */
export default function InstallPage() {
  const { canPrompt, prompt } = useInstallPrompt();
  const installed = useIsInstalled();
  const [result, setResult] = useState("");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <PageHeader
        eyebrow="Get the app"
        title="Install IleLagos on your phone"
        description="Add IleLagos to your home screen. It opens full screen like an app, starts faster and keeps working for pages you've already opened when you're offline."
      />

      <div className="mt-6 card flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white" aria-hidden>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20h14V9.5" />
            <path d="M10 20v-5.5h4V20" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink-900">IleLagos</p>
          <p className="text-sm text-ink-500">
            {installed ? "You're using the installed app." : canPrompt ? "Your browser can install it in one tap." : "Follow the steps for your device below."}
          </p>
        </div>
        {!installed && canPrompt && (
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              const r = await prompt();
              setResult(r === "accepted" ? "Installed — look for IleLagos on your home screen." : r === "dismissed" ? "No problem — you can install it any time from this page." : "");
            }}
          >
            Install app
          </button>
        )}
        <p className="w-full text-sm font-semibold text-brand-700" role="status">{result}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <section key={s.device} className="card p-5" aria-labelledby={`dev-${s.device}`}>
            <h2 id={`dev-${s.device}`} className="font-bold text-ink-900">{s.device}</h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-700">
              {s.steps.map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-2xl bg-sand-50 p-5 text-sm text-ink-700" aria-labelledby="good-to-know">
        <h2 id="good-to-know" className="font-bold text-ink-900">Good to know</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Installing works on the live website (https). It won&apos;t show on a local test copy of the site.</li>
          <li>The app is free and small — it&apos;s the same IleLagos, so updates arrive automatically.</li>
          <li>Your saved homes and listings stay on the device, just like in the browser.</li>
          <li>IleLagos doesn&apos;t send push notifications. Reminders are shown inside the app only.</li>
        </ul>
      </section>
    </div>
  );
}
