"use client";

import { useId } from "react";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";

/** Language picker. `compact` is the small header version; the full one also shows the draft-translation note. */
export function LanguageSelect({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { lang, setLang, t } = useI18n();
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={compact ? "sr-only" : "mb-1 block text-xs font-semibold text-ink-700"}>
        {lang === "en" || t("lang.label") === "Language" ? "Language" : `${t("lang.label")} / Language`}
      </label>
      <div className="relative">
        {compact && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-700" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9M12 3c-2.5 2.7-3.8 5.7-3.8 9s1.3 6.3 3.8 9" />
          </svg>
        )}
        <select
          id={id}
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className={compact ? "h-10 cursor-pointer appearance-none rounded-full bg-transparent pr-3 pl-8 text-sm font-semibold text-ink-900 hover:bg-sand-200" : "field !min-h-10 text-sm"}
          aria-describedby={lang !== "en" && !compact ? `${id}-note` : undefined}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.htmlLang}>
              {l.name}
              {l.name !== l.english ? ` — ${l.english}` : ""}
            </option>
          ))}
        </select>
      </div>
      {!compact && lang !== "en" && (
        <p id={`${id}-note`} className="mt-1 text-xs text-ink-500">{t("lang.note")}</p>
      )}
    </div>
  );
}

/** Shown under the header while a draft translation is in use. */
export function TranslationNotice() {
  const { lang, setLang, t } = useI18n();
  if (lang === "en") return null;
  return (
    <div className="border-b border-sky-200 bg-sky-50 px-4 py-1.5 text-center text-xs text-sky-900">
      {t("lang.note")}{" "}
      <button type="button" className="font-semibold underline" onClick={() => setLang("en")} lang="en">
        Switch to English
      </button>
    </div>
  );
}
