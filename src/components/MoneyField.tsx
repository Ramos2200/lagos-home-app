"use client";

/**
 * Naira input that shows thousands separators as you type (8,500,000) while the
 * value passed in and out stays as plain digits ("8500000").
 */
export function MoneyField({
  value,
  onChange,
  onBlur,
  onEnter,
  id,
  placeholder,
  className = "",
  ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  value: string;
  onChange: (digits: string) => void;
  onBlur?: () => void;
  onEnter?: () => void;
  id?: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const digits = value.replace(/\D/g, "");
  const shown = digits ? Number(digits).toLocaleString("en-NG") : "";
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-500" aria-hidden>
        ₦
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`field !pl-7 ${className}`}
        placeholder={placeholder}
        value={shown}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}
