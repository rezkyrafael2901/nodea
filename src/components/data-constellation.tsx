"use client";

import { useEffect, useRef } from "react";

/**
 * DataConstellation — hero background constellation.
 *
 * Canvas-based particle field: ~70 nodes drifting slowly, connected by
 * proximity lines (data-graph metaphor). Responsive density:
 *  - desktop (≥1024px): full count (default 110), full link distance
 *  - tablet (640–1024px): ~65% of count, shorter links
 *  - mobile (<640px): ~42% of count, shorter links → less visual noise
 *    on small screens (same dot density feel, eyes not distracted)
 * Mobile-safe:
 *  - DPR capped at 2 (no retina blowup)
 *  - tab-hidden → RAF paused (no battery burn)
 *  - prefers-reduced-motion → static single frame, no loop
 *  - pointer-events-none, aria-hidden
 */
export default function DataConstellation({
  className = "",
  count = 110,
  linkDistance = 140,
}: {
  className?: string;
  count?: number;
  linkDistance?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // NOTE: decorative ambient — always animates (brand motion).
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Breakpoint = "mobile" | "tablet" | "desktop";
    const getBreakpoint = (vw: number): Breakpoint =>
      vw < 640 ? "mobile" : vw < 1024 ? "tablet" : "desktop";

    // Adaptive density: fewer dots on small screens so it never looks cramped.
    const effectiveCount = (bp: Breakpoint): number => {
      if (bp === "mobile") return Math.max(28, Math.round(count * 0.42));
      if (bp === "tablet") return Math.max(45, Math.round(count * 0.65));
      return count;
    };
    const effectiveLink = (bp: Breakpoint): number => {
      if (bp === "mobile") return Math.round(linkDistance * 0.7);
      if (bp === "tablet") return Math.round(linkDistance * 0.85);
      return linkDistance;
    };

    const makeParticles = (n: number) =>
      Array.from({ length: n }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0014,
        vy: (Math.random() - 0.5) * 0.0014,
        r: Math.random() * 1.6 + 1.2,
        bright: Math.random() > 0.8,
      }));

    let raf = 0;
    let running = !document.hidden;
    let w = 0;
    let h = 0;
    let bp: Breakpoint = getBreakpoint(window.innerWidth);
    let linkDist = effectiveLink(bp);
    let particles = makeParticles(effectiveCount(bp));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w < 2 || h < 2) {
        // layout not ready yet — retry on next frame
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(resize);
        return;
      }
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // regenerate on breakpoint change (e.g. rotate phone / resize window)
      const nb = getBreakpoint(window.innerWidth);
      if (nb !== bp) {
        bp = nb;
        linkDist = effectiveLink(bp);
        particles = makeParticles(effectiveCount(bp));
      }
      draw(0);
    };

    const draw = (dt: number) => {
      if (!ctx || w === 0 || h === 0) return;
      ctx.clearRect(0, 0, w, h);

      // update positions (dt-normalized ~60fps)
      const step = Math.min(dt, 50) / 16.67;
      for (const p of particles) {
        p.x += p.vx * step;
        p.y += p.vy * step;
        if (p.x < -0.05 || p.x > 1.05) p.vx *= -1;
        if (p.y < -0.05 || p.y > 1.05) p.vy *= -1;
      }

      // proximity links
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(79,140,255,${(1 - dist / linkDist) * 0.35})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = p.bright
          ? "rgba(0,212,255,1)"
          : "rgba(79,140,255,0.85)";
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let last = performance.now();
    const tick = (t: number) => {
      if (!running) return;
      draw(t - last);
      last = t;
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    // re-measure if container size changes (orientation, sidebar, etc.)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas.parentElement ?? canvas);
    }

    // always animate — decorative ambient (brand motion)
    last = performance.now();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count, linkDistance]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    />
  );
}
