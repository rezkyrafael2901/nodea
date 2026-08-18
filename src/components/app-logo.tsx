import React from "react";

/**
 * Nodea — app logo (v4 human-in-N mark).
 * Stylized "N" with a negative-space human profile facing left inside the
 * letterform; right stroke dissolves into a digital/data-stream texture.
 * Supplied as an asset (public/nodea-logo.png) with a transparent background.
 */

export function AppLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/nodea-logo.png"
      alt="Nodea"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
      draggable={false}
    />
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
