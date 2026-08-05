import React from "react";

/**
 * Nodea — app logo (v3 network-N).
 * Stylized "N" built from connected nodes: electric-blue nodes on the
 * left stroke, cyan nodes on the right stroke, thin matching lines
 * connecting them — a network/connectivity mark (play on "node").
 * Palette matches the Nodea brand: #4F8CFF / #00D4FF on #0F172A.
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
        <linearGradient id="n-left" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6EA8FF" />
          <stop offset="100%" stopColor="#4F8CFF" />
        </linearGradient>
        <linearGradient id="n-right" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#00B8E6" />
        </linearGradient>
        <linearGradient id="n-diag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F8CFF" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
        <radialGradient id="n-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4F8CFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ambient glow */}
      <circle cx="24" cy="24" r="22" fill="url(#n-glow)" />

      {/* Connecting lines (the N skeleton) */}
      {/* left vertical */}
      <line x1="13" y1="10" x2="13" y2="38" stroke="url(#n-left)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {/* right vertical */}
      <line x1="35" y1="10" x2="35" y2="38" stroke="url(#n-right)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {/* diagonal */}
      <line x1="13" y1="10" x2="35" y2="38" stroke="url(#n-diag)" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

      {/* Left stroke nodes (electric blue) */}
      <circle cx="13" cy="10" r="4.2" fill="url(#n-left)" />
      <circle cx="13" cy="24" r="4.2" fill="url(#n-left)" />
      <circle cx="13" cy="38" r="4.2" fill="url(#n-left)" />

      {/* Right stroke nodes (cyan) */}
      <circle cx="35" cy="10" r="4.2" fill="url(#n-right)" />
      <circle cx="35" cy="24" r="4.2" fill="url(#n-right)" />
      <circle cx="35" cy="38" r="4.2" fill="url(#n-right)" />

      {/* Node highlights */}
      <circle cx="11.8" cy="8.8" r="1.3" fill="#ffffff" opacity="0.9" />
      <circle cx="33.8" cy="8.8" r="1.3" fill="#ffffff" opacity="0.9" />
      <circle cx="35" cy="38" r="1.6" fill="#ffffff" opacity="0.7" />

      {/* Center core spark on the diagonal */}
      <circle cx="24" cy="24" r="2.4" fill="#ffffff" opacity="0.95" />
      <circle cx="24" cy="24" r="1" fill="#e6fbff" />
    </svg>
  );
}

/** Wordmark: logo + "Nodea" text lockup */
export function AppWordmark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <AppLogo size={size} />
      <div className="leading-none">
        <div className="font-semibold tracking-tight text-[var(--color-fg)]" style={{ fontSize: size * 0.5 }}>
          Nodea
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)] mt-1">
          Identity Card
        </div>
      </div>
    </div>
  );
}
