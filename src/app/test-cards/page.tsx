"use client";

import { useEffect, useState } from "react";
import InsightsPanel from "@/components/insights-panel";
import type { RecommendationResult } from "@/lib/recommendations";

/**
 * TEMP TEST PAGE — visual verification of per-source identity cards.
 * Calls /api/recommendations with no data → mock data fallback → devMode.
 */

interface Ident {
  source: string;
  data: Record<string, unknown>;
}

export default function TestCardsPage() {
  const [identities] = useState<Ident[]>([
    { source: "github", data: {} },
    { source: "instagram", data: {} },
    { source: "spotify", data: {} },
    { source: "linkedin", data: {} },
  ]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Identity Card Visual Test</h1>
        <p className="text-white/50 text-sm mb-8">
          Mock data mode — shows how each source card looks with the Pathfit-style format.
        </p>
        <InsightsPanel identities={identities} mode="rules-only" />
      </div>
    </div>
  );
}
