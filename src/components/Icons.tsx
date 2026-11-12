type P = { className?: string; size?: number };

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const PinIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const BedIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3M7 11.5a1.5 1.5 0 1 0 0-.01" />
  </svg>
);
export const BathIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" />
  </svg>
);
export const CalendarIcon = ({ className, size = 12 }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const HeartIcon = ({ filled, size = 18 }: { filled?: boolean; size?: number }) => (
  <svg {...base(size)} fill={filled ? "currentColor" : "none"} className={filled ? "text-red-600" : ""}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const SearchIcon = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const FilterIcon = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </svg>
);
export const CheckIcon = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m5 12 5 5 9-10" />
  </svg>
);
export const InfoIcon = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const ShieldIcon = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
  </svg>
);
export const ArrowLeftIcon = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M15 18 9 12l6-6" />
  </svg>
);
export const PlugIcon = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4" />
  </svg>
);
