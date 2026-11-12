/**
 * Small layout primitives shared across pages so headings, sections, tabs,
 * stats and the Rent/Buy toggle look the same everywhere.
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

/** A titled block of content. Plain by default; pass `card` to put it on a white surface. */
export function Section({
  title,
  description,
  actions,
  children,
  card = false,
  id,
  className = "",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  card?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`${card ? "card p-4 sm:p-6" : ""} ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="section-title">{title}</h2>}
            {description && <p className="muted mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`segment ${size === "sm" ? "!px-3" : ""} ${value === o.value ? "segment-on" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T;
  tabs: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-sand-200" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={`tab ${value === t.value ? "tab-on" : ""}`}>
          {t.label}
          {t.count ? <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-px text-[11px] text-white">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** A row of key numbers inside one surface, instead of one card per number. */
export function StatStrip({ stats }: { stats: { label: string; value: number | string; warn?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sand-200 bg-sand-200 shadow-card sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white px-4 py-3.5">
          <dt className="text-xs font-medium text-ink-500">{s.label}</dt>
          <dd className={`mt-0.5 text-2xl font-semibold tracking-tight ${s.warn ? "text-orange-700" : "text-ink-900"}`}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-6 py-10 text-center">
      <p className="font-semibold text-ink-900">{title}</p>
      {body && <p className="muted mx-auto mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Centered message page (not found, sign-in required…). */
export function MessagePage({ title, body, actions }: { title: string; body?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {body && <p className="muted mt-2 text-[15px]">{body}</p>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
