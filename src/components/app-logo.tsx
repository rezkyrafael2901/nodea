import React from "react";

/**
 * Nodea — app logo.
 * A faceted soul crystal / diamond mark with the Vana purple-to-pink
 * brand gradient. Clean geometry, no emoji.
 */

export function AppLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-label="Nodea"
      role="img"
    >
      <defs>
        <linearGradient id="soul-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="soul-grad-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f0abfc" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Outer glow ring */}
      <circle cx="24" cy="24" r="22" fill="url(#soul-grad-soft)" />

      {/* Faceted diamond / soul crystal */}
      <path
        d="M24 4 L41 17 L24 44 L7 17 Z"
        fill="url(#soul-grad)"
        opacity="0.95"
      />
      {/* Facet lines */}
      <path d="M24 4 L24 44" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M7 17 L41 17" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M15.5 10.5 L24 44" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
      <path d="M32.5 10.5 L24 44" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />

      {/* Core spark */}
      <circle cx="24" cy="24" r="4.5" fill="#ffffff" opacity="0.9" />
      <circle cx="24" cy="24" r="2" fill="#fdf4ff" />
    </svg>
  );
}

/** Wordmark: logo + "Nodea" text lockup */
export function AppWordmark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <AppLogo size={size} />
      <div className="leading-none">
        <div className="font-semibold tracking-tight text-white" style={{ fontSize: size * 0.42 }}>
          Nodea
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">
          Identity Card
        </div>
      </div>
    </div>
  );
}
