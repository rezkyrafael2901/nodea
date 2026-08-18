"use client";

/**
 * IdentityResult — the clean, editorial "result" output (Pathfit-style).
 *
 * Design intent: follows Pathfit's calm, plain, editorial result page —
 * kicker → archetype → serif tagline → plain rationale → "Also worth
 * considering" list — but keep Nodea's dark brand identity (no grayscale
 * reskin, no emoji clutter, no strength bars, no gradients in the result body).
 *
 * Data flow: fetch per-source recommendations from /api/recommendations
 * (same contract as InsightsPanel), then build a single cross-source
 * identity card via buildIdentityCard(). Renders nothing until at least
 * one insight resolves.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import type { RecommendationResult } from "@/lib/recommendations";
import { buildIdentityCard } from "@/lib/recommendations/engine";
import type { Insight } from "@/lib/recommendations/types";

interface IdentityResultProps {
  identities: { source: string; data: Record<string, unknown> }[];
  mode?: "auto" | "llm-only" | "rules-only";
}

const SOURCE_LABEL: Record<string, string> = {
  github: "GitHub",
  instagram: "Instagram",
  spotify: "Spotify",
  youtube: "YouTube",
  steam: "Steam",
  chatgpt: "ChatGPT",
  linkedin: "LinkedIn",
};

export default function IdentityResult({ identities, mode = "auto" }: IdentityResultProps) {
  const [results, setResults] = useState<Record<string, RecommendationResult>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
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
    fetchedRef.current = ""; // allow refetch
    await fetchAll(identities, mode);
    setRefreshing(false);
  }

  // Build the cross-source identity card from all resolved insights.
  const allInsights: { source: string; insights: Insight[] }[] = [];
  for (const [src, r] of Object.entries(results)) {
    if (r.recommendations.length > 0) {
      allInsights.push({
        source: src,
        insights: r.recommendations.map((rec) => ({
          id: rec.insight.id,
          title: rec.insight.title,
          emoji: rec.insight.emoji,
          narrative: rec.narrative,
          strength: rec.insight.strength,
          evidence: rec.insight.evidence,
          facts: r.facts
            .filter((f) => rec.insight.evidence.includes(f.label))
            .map((f) => ({ label: f.label, value: f.value })),
        })),
      });
    }
  }
  const card = buildIdentityCard(allInsights);

  if (identities.length === 0) return null;

  // Loading (nothing resolved yet)
  if (loading && !card) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex items-center justify-center gap-3 text-sm text-white/40">
        <Loader2 className="w-4 h-4 animate-spin" />
        Reading your data…
      </div>
    );
  }

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="mb-4 p-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.07] text-amber-300/80 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="py-16 text-center text-sm text-white/35">
          No result to show yet. Connect a source to get your reading.
        </div>
      </div>
    );
  }

  const { primaryArchetype, alternatives } = card;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Result surface — calm, editorial, single column */}
      <article className="relative rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-transparent px-7 py-10 md:px-12 md:py-14">
        {/* Kicker */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/30">
            Your result
          </span>
          <button
            onClick={refresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/70 transition-colors disabled:opacity-40"
            aria-label="Refresh result"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Archetype — the headline role */}
        <h2 className="font-display text-2xl md:text-4xl font-semibold tracking-tight text-white leading-[1.1]">
          {primaryArchetype.title}
        </h2>

        {/* Tagline — serif, editorial, the personality line */}
        <p className="font-serif italic text-lg md:text-2xl text-white/70 mt-4 leading-snug">
          {primaryArchetype.tagline}
        </p>

        {/* Rationale — plain, honest, "matched from …" */}
        <p className="text-[15px] md:text-base leading-relaxed text-white/55 mt-6 max-w-prose">
          {primaryArchetype.fitRationale}
        </p>

        {/* Source attribution */}
        <div className="mt-6 text-[11px] uppercase tracking-[0.15em] text-white/25">
          Read from {SOURCE_LABEL[primaryArchetype.source] ?? primaryArchetype.source}
        </div>

        {/* Alternatives — clean list, no emoji, no bars */}
        {alternatives.length > 0 && (
          <div className="mt-10 pt-7 border-t border-white/[0.06]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/30 mb-4">
              Also worth considering
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {alternatives.map((alt) => (
                <li
                  key={`${alt.source}-${alt.title}`}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-[15px] text-white/70">{alt.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                    {SOURCE_LABEL[alt.source] ?? alt.source}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {error && (
        <div className="mt-4 p-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.07] text-amber-300/80 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
