import { ImageResponse } from "next/og";

/**
 * The IleLagos app icon (green tile with a white house), drawn as a PNG at any size.
 * `padded` leaves a safe margin for Android "maskable" icons, which get cropped to a circle.
 */
export function appIcon(size: number, padded = false) {
  const glyph = Math.round(size * (padded ? 0.46 : 0.6));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a7656",
          borderRadius: padded ? 0 : Math.round(size * 0.22),
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M10 20v-5.5h4V20" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
