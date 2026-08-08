"use client";

/**
 * InsightsPanel — renders the hybrid recommendation output for connected sources.
 *
 * Uses server-side /api/recommendations (rules → optional LLM narrator →
 * template fallback). Shows per-source insight cards with strength bars,
 * a "Powered by AI" / "Instant" badge, and a retry state when loading.
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import type { RecommendationResult, Fact } from "@/lib/recommendations";

interface InsightsPanelProps {
  identities: { source: string; data: Record<string, unknown> }[];
  mode?: "auto" | "llm-only" | "rules-only";
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  instagram: "Instagram",
  spotify: "Spotify",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export default function InsightsPanel({ identities, mode = "auto" }: InsightsPanelProps) {
  const [results, setResults] = useState<Record<string, RecommendationResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    if (identities.length === 0) {
      setResults({});
      setError("");
      return;
    }
    const key = identities.map((i) => i.source).join(",") + "|" + mode;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    void fetchAll(identities, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identities, mode]);

  async function fetchAll(
    list: { source: string; data: Record<string, unknown> }[],
    m: string
  ) {
    setLoading(true);
    setError("");
    const out: Record<string, RecommendationResult> = {};
    // Fetch per-source sequentially to be gentle with the LLM narrator
    for (const id of list) {
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceId: id.source, data: id.data, mode: m }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (json?.error) setError((e) => (e ? `${e} ${json.error}` : json.error));
          continue;
        }
        if (json && !json.error) out[id.source] = json as RecommendationResult;
      } catch (e) {
        setError((prev) => (prev ? `${prev} ${String(e)}` : String(e)));
      }
    }
    setResults(out);
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    await fetchAll(identities, mode);
    setRefreshing(false);
  }

  const sourceIds = Object.keys(results);

  if (identities.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-500/15">
            <Sparkles className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <div className="font-medium text-white">Insights &amp; Recommendations</div>
            <div className="tracking-ui text-[10px] text-white/35">
              Data-driven reads from your connected sources
            </div>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white/[0.05] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40"
          aria-label="Refresh insights"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && sourceIds.length === 0 && (
        <div className="p-6 rounded-2xl glass glass-border flex items-center gap-3 text-sm text-white/50">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          Analyzing your data…
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-300/90 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {sourceIds.length === 0 && !loading ? (
        <div className="p-6 rounded-2xl glass glass-border text-sm text-white/40">
          No insights to show yet. Connect at least one data source to get started.
        </div>
      ) : (
        <div className="space-y-5">
          {sourceIds.map((src) => {
            const r = results[src];
            if (!r || r.recommendations.length === 0) return null;
            const llmUsed = r.engine === "llm";
            return (
              <div key={src} className="p-5 rounded-2xl glass glass-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-white/80">
                      {SOURCE_LABEL[src] ?? src}
                    </span>
                    {r.devMode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300/80 border border-amber-400/20">
                        demo
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${
                      llmUsed
                        ? "bg-blue-500/15 text-blue-300 border-blue-400/20"
                        : "bg-white/[0.04] text-white/40 border-white/10"
                    }`}
                  >
                    {llmUsed ? (
                      <>
                        <Sparkles className="w-2.5 h-2.5" /> AI Narrated
                      </>
                    ) : (
                      <>
                        <Zap className="w-2.5 h-2.5" /> Instant
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-4">
                  {r.recommendations.map((rec) => (
                    <div key={rec.insight.id} className="border-t border-white/[0.05] pt-4 first:border-t-0 first:pt-0">
                      <div className="flex items-start gap-3">
                        <div className="text-xl leading-none mt-0.5">{rec.insight.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-white/85 tracking-tight">
                              {rec.insight.title}
                            </h4>
                            <span className="shrink-0 text-[10px] font-medium tabular-nums text-white/35">
                              {rec.insight.strength}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                              style={{ width: `${Math.max(4, Math.min(100, rec.insight.strength))}%` }}
                            />
                          </div>
                          <p className="text-[13px] leading-relaxed text-white/60">
                            {rec.narrative}
                          </p>
                          <FactChips facts={r.facts} insightEvidence={rec.insight.evidence} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FactChips({
  facts,
  insightEvidence,
}: {
  facts: Fact[];
  insightEvidence: string[];
}) {
  if (facts.length === 0) return null;
  const relevant = facts.filter((f) => insightEvidence.includes(f.label));
  const chips = (relevant.length > 0 ? relevant : facts).slice(0, 3);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {chips.map((f) => (
        <span
          key={f.label}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/45"
        >
          {f.label}: <span className="font-medium text-white/65">{f.value}</span>
        </span>
      ))}
    </div>
  );
}