// Hybrid recommendation engine.
// Flow: analyzeSource (rules, pure) → buildFallback (templates) → narrator (optional LLM).
// If narrator fails or is not configured, finalNarrative = fallbackNarrative.

import type { Insight, Recommendation, SourceData } from "./types";
import { analyzeSource, signatureFor } from "./rules";
import { buildFallback } from "./templates";
import { narrate, narratorConfigured } from "./narrator";

export interface EngineOptions {
  /** force skip LLM (e.g. for tests or free tier) */
  noLlm?: boolean;
  /** true when caller wants a fresh LLM attempt even if cached */
  refresh?: boolean;
}

const cache = new Map<string, Recommendation>();

export async function getRecommendations(
  data: SourceData,
  opts: EngineOptions = {},
): Promise<Recommendation> {
  const sig = signatureFor(data);
  if (!opts.refresh && cache.has(sig)) return cache.get(sig)!;

  const insights = analyzeSource(data);
  const fallbackNarrative = buildFallback(data, insights);

  const rec: Recommendation = {
    sourceId: data.sourceId,
    insights,
    fallbackNarrative,
    finalNarrative: fallbackNarrative,
    enhanced: false,
    signature: sig,
  };

  const canLlm = !opts.noLlm && narratorConfigured();
  if (canLlm) {
    try {
      const narrated = await narrate(data.sourceId, insights);
      rec.finalNarrative = narrated;
      rec.enhanced = true;
    } catch (e) {
      // silence — fallback already set
      console.warn(`[recommendations] narrator skipped for ${data.sourceId}:`, (e as Error).message, (e as Error).stack?.split("\n")[1]);
    }
  }

  cache.set(sig, rec);
  return rec;
}

/** Sync path (no LLM) — safe for client components & SSR. */
export function getRecommendationsSync(data: SourceData): Recommendation {
  const insights = analyzeSource(data);
  const fallback = buildFallback(data, insights);
  return {
    sourceId: data.sourceId,
    insights,
    fallbackNarrative: fallback,
    finalNarrative: fallback,
    enhanced: false,
    signature: signatureFor(data),
  };
}

export function summarizeInsights(insights: Insight[]): string {
  return insights.map((i) => `${i.title} (${i.strength}/5)`).join(", ") || "Belum ada insight";
}