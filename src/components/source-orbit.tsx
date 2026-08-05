import React, { useEffect, useState } from "react";
import { BrandIcon, type BrandId } from "@/components/brand-icons";
import { AppLogo } from "@/components/app-logo";

/**
 * SourceOrbit — hero animation for Nodea.
 * Visualizes "Every source. One point.": brand source icons orbit a
 * central Nodea node via a rotating arm (pure CSS keyframes, GPU
 * compositor — no JS animation loop), with dashed connecting lines and
 * a pulsing core. Respects prefers-reduced-motion and is client-only.
 *
 * CSS keyframes are defined in globals.css (orbit-spin / orbit-spin-rev
 * / orbit-pulse). Negative animation-delay sets the start angle.
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
  { id: "github", radius: 0.46, size: 40, duration: 16, startAngle: 0 },
  { id: "spotify", radius: 0.36, size: 34, duration: 12, startAngle: 72 },
  { id: "instagram", radius: 0.5, size: 32, duration: 20, startAngle: 144, counter: true },
  { id: "youtube", radius: 0.4, size: 32, duration: 14, startAngle: 216 },
  { id: "chatgpt", radius: 0.31, size: 30, duration: 11, startAngle: 288, counter: true },
];

export function SourceOrbit({ size = 264 }: { size?: number }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
          className="absolute rounded-full border border-white/[0.07]"
          style={{
            width: size * r,
            height: size * r,
            left: (size - size * r) / 2,
            top: (size - size * r) / 2,
            animation: reduced
              ? undefined
              : `orbit-spin ${36 + i * 16}s linear infinite`,
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
              animation: reduced
                ? undefined
                : `${s.counter ? "orbit-spin-rev" : "orbit-spin"} ${s.duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: s.size,
                height: s.size,
                left: size / 2 - s.size / 2,
                top: -s.size / 2,
                transform: `translateY(${s.radius * size}px)`,
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
                <BrandIcon id={s.id} size={Math.round(s.size * 0.58)} />
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
            <stop offset="0%" stopColor="#4F8CFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.15" />
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
            animation: reduced ? undefined : "orbit-pulse 2s ease-out infinite",
          }}
        />
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: core,
            height: core,
            background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
            boxShadow: "0 0 36px 3px rgba(79,140,255,0.55), 0 14px 34px -12px rgba(0,212,255,0.65)",
            animation: reduced ? undefined : "orbit-breathe 2.4s ease-in-out infinite",
          }}
        >
          <AppLogo size={core * 0.56} />
        </div>
      </div>
    </div>
  );
}
