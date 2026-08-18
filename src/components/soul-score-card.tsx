"use client";

import type { SoulScoreResult } from "@/lib/soul-score";

interface SoulScoreCardProps {
  score: SoulScoreResult;
  connectedCount: number;
}

const GRADE_COLORS: Record<string, string> = {
  S: "from-amber-300 to-yellow-500 text-amber-300 border-amber-400/40",
  A: "from-[#4F8CFF] to-[#00D4FF] text-blue-300 border-blue-400/40",
  B: "from-sky-400 to-cyan-500 text-sky-300 border-sky-400/40",
  C: "from-emerald-400 to-teal-500 text-emerald-300 border-emerald-400/40",
  D: "from-white/60 to-white/30 text-white/60 border-white/20",
};

const COMPONENT_BAR: Record<string, string> = {
  age: "bg-gradient-to-r from-amber-400 to-orange-500",
  depth: "bg-gradient-to-r from-[#4F8CFF] to-[#00D4FF]",
  breadth: "bg-gradient-to-r from-sky-400 to-cyan-500",
  standing: "bg-gradient-to-r from-emerald-400 to-teal-500",
};

function Ring({ total, grade }: { total: number; grade: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.min(total, 100) / 100;
  const color =
    grade === "S" ? "#fbbf24" :
    grade === "A" ? "#4F8CFF" :
    grade === "B" ? "#38bdf8" :
    grade === "C" ? "#34d399" : "#525252";

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight" style={{ color }}>{total}</span>
        <span className="text-[10px] text-white/40 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export function SoulScoreCard({ score, connectedCount }: SoulScoreCardProps) {
  const gradeColor = GRADE_COLORS[score.grade] ?? GRADE_COLORS.D;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white/80">Nodea Score</div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold bg-gradient-to-b ${gradeColor}`}>
          Grade {score.grade}
        </span>
      </div>

      {/* Ring + verdict */}
      <div className="flex items-center gap-5">
        <Ring total={score.total} grade={score.grade} />
        <div className="min-w-0">
          <div className="text-sm text-white/85 leading-snug mb-2">{score.verdict}</div>
          <div className="text-xs text-white/40">
            {connectedCount} source{connectedCount !== 1 ? "s" : ""} connected
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-5 space-y-3">
        {score.components.map((comp) => (
          <div key={comp.key}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-white/70">{comp.label}</span>
              <span className="text-white/40 tabular-nums">{comp.points}<span className="text-white/25">/{comp.max}</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full ${COMPONENT_BAR[comp.key] ?? "bg-white/30"}`}
                style={{ width: `${(comp.points / comp.max) * 100}%`, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </div>
            <div className="mt-1 text-[10px] text-white/35 leading-relaxed">{comp.detail}</div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {score.tips.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-2">To level up</div>
          <ul className="space-y-1.5">
            {score.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-white/55 leading-relaxed">
                <span className="mt-0.5 text-white/25 shrink-0">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
