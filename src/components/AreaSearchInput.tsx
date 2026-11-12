"use client";

import { useId, useMemo, useState } from "react";
import { suggest } from "@/lib/areas";
import { useStore } from "@/lib/store";
import { SearchIcon } from "./Icons";

/**
 * Text box with type-ahead suggestions for areas, area groups ("Lekki", "Mainland"),
 * nicknames ("VI"), estates and landmarks. Keyboard: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function AreaSearchInput({
  value,
  onChange,
  onPick,
  placeholder = "Area, estate or landmark",
  size = "md",
  id,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onPick: (v: string) => void;
  placeholder?: string;
  size?: "md" | "lg";
}) {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const extras = useMemo(
    () => ({
      estates: [...new Set(data.listings.map((l) => l.estate).filter(Boolean) as string[])],
      landmarks: [...new Set(data.listings.map((l) => l.landmark).filter(Boolean) as string[])],
    }),
    [data.listings],
  );
  const items = useMemo(() => suggest(value, extras), [value, extras]);
  const show = open && items.length > 0;

  const pick = (v: string) => {
    onChange(v);
    onPick(v);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-500"
        size={size === "lg" ? 18 : 16}
      />
      <input
        id={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search by area, estate or landmark"
        className={`field ${size === "lg" ? "!min-h-12 !pl-10" : "!pl-9"}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(items[active].value);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        enterKeyHint="search"
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 z-40 mt-1 w-[max(100%,16.5rem)] overflow-hidden rounded-xl border border-sand-200 bg-white py-1 shadow-lg"
        >
          {items.map((s, i) => (
            <li
              key={s.kind + s.label}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s.value);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-brand-50" : "hover:bg-sand-50"}`}
            >
              <span className="block font-medium text-ink-900">{s.label}</span>
              {s.hint && <span className="block truncate text-xs text-ink-500">{s.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
