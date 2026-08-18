/**
 * POST /api/recommendations
 *
 * Hybrid recommendation engine: rules → optional LLM narrator → templates.
 *
 * Body: {
 *   sourceId: "github" | "instagram" | "spotify" | "youtube" | "linkedin",
 *   data?: Record<string, unknown>,   // optional — falls back to mock data
 *   mode?: "auto" | "llm-only" | "rules-only"
 * }
 *
 * Response: RecommendationResult shape
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecommendations, isSupportedSource } from "@/lib/recommendations";
import type { NarratorMode, RecommendationResult, SourceData } from "@/lib/recommendations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      sourceId?: string;
      data?: Record<string, unknown>;
      mode?: NarratorMode;
    };

    const sourceId = body.sourceId;
    if (!sourceId || !isSupportedSource(sourceId)) {
      return NextResponse.json(
        { error: "Missing or unsupported sourceId. Supported: github, instagram, spotify, youtube, linkedin, steam, chatgpt" },
        { status: 400 }
      );
    }

    let data = body.data;
    let devMode = false;

    if (!data || Object.keys(data).length === 0) {
      // Dev-mode fallback: use mock data (follows /api/vana/data behavior)
      const { default: mockData } = await import("../vana/data/mock-data");
      const mock = mockData(sourceId);
      if (mock && !("error" in mock)) {
        data = mock as Record<string, unknown>;
        devMode = true;
      }
    }

    if (!data) {
      return NextResponse.json({ error: "No data provided and no mock available" }, { status: 400 });
    }

    const mode: NarratorMode = body.mode === "llm-only" || body.mode === "rules-only" ? body.mode : "auto";
    const sourceData: SourceData = { sourceId, ...data };

    const rec = await getRecommendations(sourceData, {
      noLlm: mode === "rules-only",
      refresh: mode === "llm-only",
    });

    // Flatten unique facts for the UI chips
    const seen = new Set<string>();
    const facts = rec.insights.flatMap((i) => i.facts).filter((f) => (seen.has(f.label) ? false : (seen.add(f.label), true)));

    const result: RecommendationResult = {
      sourceId: rec.sourceId,
      engine: rec.enhanced ? "llm" : "rules",
      fallbackReason: rec.enhanced ? null : "LLM narrator not configured or failed — template fallback used",
      facts,
      recommendations: rec.insights.map((i) => ({
        insight: { id: i.id, emoji: i.emoji, title: i.title, strength: i.strength, evidence: i.evidence },
        narrative: i.narrative,
      })),
      narrative: rec.finalNarrative,
      devMode,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendations error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate recommendations";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
