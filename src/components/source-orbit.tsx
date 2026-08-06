import React from "react";
import { BrandIcon, type BrandId } from "@/components/brand-icons";
import { AppLogo } from "@/components/app-logo";

/**
 * Nodea — "Your Data. Your Proof."
 * Visualizes the idea that all your data sources
 * orbit a single, unified identity: you.
 */

type OrbitSource = {
  id: BrandId;
  radius: number; // fraction of container
  size: number;
  duration: number;
  startAngle: number;
  counter?: boolean;
};

const ORBIT_SOURCES: OrbitSource[] = [
  { id: "github", radius: 0.4, size: 40, duration: 16, startAngle: 0 },
  { id: "spotify", radius: 0.3, size: 34, duration: 12, startAngle: 60 },
  { id: "instagram", radius: 0.43, size: 32, duration: 20, startAngle: 120, counter: true },
  { id: "youtube", radius: 0.35, size: 32, duration: 14, startAngle: 180 },
  { id: "chatgpt", radius: 0.27, size: 30, duration: 11, startAngle: 240, counter: true },
  { id: "steam", radius: 0.37, size: 32, duration: 17, startAngle: 300 },
];

export function SourceOrbit({ size = 264 }: { size?: number }) {
  const core = size * 0.3;
  const ringSizes = [0.62, 0.46, 0.82];

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto select-none pointer-events-none"
      style={{ width: size, height: size }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,0.16) 0%, rgba(79,140,255,0.07) 45%, transparent 70%)",
          filter: "blur(6px)",
        }}
      />

      {/* Soft rings (slow CSS rotation) */}
      {ringSizes.map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full border orbit-ring"
          style={{
            width: size * r,
            height: size * r,
            left: (size - size * r) / 2,
            top: (size - size * r) / 2,
            animation: `orbit-spin ${36 + i * 16}s linear infinite`,
          }}
        >
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/70"
            style={{
              left: i % 2 === 0 ? "-2px" : "50%",
              top: i % 2 === 0 ? "50%" : "-2px",
              boxShadow: "0 0 8px rgba(0,212,255,0.8)",
            }}
          />
        </div>
      ))}

      {/* Orbiting sources — each arm rotates via CSS; icon sits at radius */}
      {ORBIT_SOURCES.map((s) => {
        const delay = -((s.startAngle / 360) * s.duration); // negative delay = start angle
        return (
          <div
            key={s.id}
            className="absolute"
            style={{
              width: size,
              height: size,
              left: 0,
              top: 0,
              transformOrigin: `${size / 2}px ${size / 2}px`,
              transform: `rotate(${s.startAngle}deg)`,
              animation: `${s.counter ? "orbit-spin-rev" : "orbit-spin"} ${s.duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: s.size,
                height: s.size,
                left: size / 2 - s.size / 2,
                top: size / 2 - s.size / 2,
                transform: `translateY(${-s.radius * size}px)`,
              }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(15,23,42,0.92)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "0 6px 20px -8px rgba(0,0,0,0.7)",
                }}
              >
                <BrandIcon
                  id={s.id}
                  size={Math.round(s.size * 0.58)}
                  className={s.id === "github" ? "orbit-github-icon" : undefined}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Static connecting lines to core */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id="orbit-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        {ORBIT_SOURCES.map((s) => {
          const a = (s.startAngle * Math.PI) / 180;
          const r = s.radius * size;
          return (
            <line
              key={s.id}
              x1={size / 2 + Math.cos(a) * r}
              y1={size / 2 + Math.sin(a) * r}
              x2={size / 2}
              y2={size / 2}
              stroke="url(#orbit-line)"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
          );
        })}
      </svg>

      {/* Core node — the "one point" */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          width: core,
          height: core,
          left: size / 2 - core / 2,
          top: size / 2 - core / 2,
        }}
      >
        {/* pulse ring (CSS) */}
        <div
          className="absolute rounded-full"
          style={{
            width: core,
            height: core,
            border: "1px solid rgba(0,212,255,0.4)",
            animation: "orbit-pulse 2s ease-out infinite",
          }}
        />
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: core,
            height: core,
            background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
            boxShadow: "0 0 36px 3px rgba(79,140,255,0.55), 0 14px 34px -12px rgba(0,212,255,0.65)",
            animation: "orbit-breathe 2.4s ease-in-out infinite",
          }}
        >
          <AppLogo size={core * 0.56} />
        </div>
      </div>
    </div>
  );
}