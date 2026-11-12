"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard basics for modal dialogs and sheets: moves focus into the dialog,
 * keeps Tab inside it, closes on Escape, and returns focus to where it was.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () =>
      Array.from(el?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? []);
    (el?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, []);

  return ref;
}
