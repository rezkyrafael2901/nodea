"use client";

import { useEffect, useState } from "react";
import InsightsPanel from "@/components/insights-panel";
import type { RecommendationResult } from "@/lib/recommendations";

/**
 * TEMP TEST PAGE — visual verification of per-source identity cards.
 * Calls /api/recommendations with no data → mock data fallback → devMode.
 * GATED: Only available in development mode.
 */

// Development-only component
function TestCardsDevPage() {
  const [identities] = useState([
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

// Production gate component
function TestCardsProdPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">🚫 Development Only</h1>
        <p className="text-white/50">This page is only available in development mode.</p>
      </div>
    </div>
  );
}

// Export based on environment - Next.js will tree-shake the unused branch
export default process.env.NODE_ENV === "production" ? TestCardsProdPage : TestCardsDevPage;
