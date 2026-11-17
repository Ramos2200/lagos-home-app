"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Chrome/Edge/Android only: the browser's own "Install app" prompt, kept so a button can open it later. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/**
 * Registers the service worker (production builds only, so it never interferes with development)
 * and remembers the install prompt when the browser offers one.
 */
export function PwaSetup() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallPromptEvent;
      notify();
    };
    const onInstalled = () => {
      deferred = null;
      notify();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Not supported or blocked (e.g. private browsing): the site still works normally.
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Whether the browser is offering a one-tap install right now, and a function to show it. */
export function useInstallPrompt(): { canPrompt: boolean; prompt: () => Promise<"accepted" | "dismissed" | "unavailable"> } {
  const canPrompt = useSyncExternalStore(subscribe, () => !!deferred, () => false);
  return {
    canPrompt,
    prompt: async () => {
      if (!deferred) return "unavailable";
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      notify();
      return outcome;
    },
  };
}

/** True when IleLagos is already running as an installed app. */
export function useIsInstalled(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
}
