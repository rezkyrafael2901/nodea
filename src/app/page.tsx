"use client";

import { useState } from "react";
import { DATA_SOURCES, type DataSource, type IdentityData, buildIdentityPrompt, getPalette } from "@/lib/vana-sources";
import { DataSoulCard } from "@/components/data-soul-card";

export default function Home() {
  const [onboardedSources, setOnboardedSources] = useState<Set<string>>(new Set());
  const [currentSource, setCurrentSource] = useState<DataSource | null>(null);
  const [identities, setIdentities] = useState<IdentityData[]>([]);
  const [identityResult, setIdentityResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async (source: DataSource) => {
    // In production: use @opendatalabs/vana-sdk to trigger Vana connect modal
    // For now: simulate data fetch + call AI
    setLoading(true);
    setError("");

    try {
      // STEP 1: Trigger Vana data request
      // In production: 
      //   const controller = createDirectDataController({ network: "mainnet" });
      //   const approvedData = await controller.requestData({
      //     source: source.id,
      //     scopes: source.scopes,
      //   });
      // 
      // For now, simulate with server API call
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, scopes: source.scopes }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Connection failed" }));
        throw new Error(err.error || "Connection failed");
      }

      const result = await response.json();

      // Update state
      const newOnboarded = new Set(onboardedSources);
      newOnboarded.add(source.id);
      setOnboardedSources(newOnboarded);
      setIdentities((prev) => [...prev, result]);

      // If all sources onboarded or user wants result, generate identity
      const newIdentities = [...identities, result];
      setCurrentSource(source);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (identities.length === 0) {
      setError("Connect at least one data source first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const prompt = buildIdentityPrompt(identities);
      const response = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sources: identities }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "AI generation failed" }));
        throw new Error(err.error || "AI generation failed");
      }

      const result = await response.json();
      setIdentityResult(result);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const connectedCount = onboardedSources.size;
  const totalSources = DATA_SOURCES.length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl">
              👁️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Vana Soul</h1>
              <p className="text-xs text-white/50">Multi-Source Identity Card</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-white/60">
              {connectedCount}/{totalSources} connected
            </div>
            <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${(connectedCount / totalSources) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            See Who You Really Are
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Connect your social accounts across Vana. Get a unified identity card —
            your digital soul, visualized.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-400 text-sm animate-pulse">
            Processing...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Data Sources */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs">1</span>
              Connect Data Sources
            </h3>

            <div className="space-y-3">
              {DATA_SOURCES.map((source) => {
                const isConnected = onboardedSources.has(source.id);
                const isProcessing = currentSource?.id === source.id && !isConnected;

                return (
                  <div
                    key={source.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isConnected
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-white/[0.03] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{source.icon}</span>
                        <div>
                          <div className="font-medium">{source.name}</div>
                          <div className="text-xs text-white/50">{source.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          source.maturity === "stable" ? "bg-emerald-500/20 text-emerald-400" :
                          source.maturity === "beta" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-orange-500/20 text-orange-400"
                        }`}>
                          {source.maturity}
                        </span>
                        {isConnected ? (
                          <span className="text-emerald-400 text-sm">✓</span>
                        ) : (
                          <button
                            onClick={() => handleConnect(source)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white/30">
                      Scopes: {source.scopes.join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || identities.length === 0}
              className="w-full mt-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-lg font-bold transition-all shadow-lg shadow-violet-500/20"
            >
              {identities.length > 0
                ? `Generate Soul Card (${identities.length} source${identities.length > 1 ? "s" : ""})`
                : "Connect at least one source"}
            </button>
          </div>

          {/* Right: Result Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-xs">2</span>
              Your Identity
            </h3>

            {identityResult ? (
              <DataSoulCard data={identityResult as Record<string, unknown>} />
            ) : (
              <div className="h-96 flex items-center justify-center border border-white/10 rounded-xl bg-white/[0.02]">
                <div className="text-center text-white/30">
                  <div className="text-4xl mb-3">👁️</div>
                  <div className="text-sm">Your soul card will appear here</div>
                  <div className="text-xs mt-1">Connect sources → Generate</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connected Sources Summary */}
        {identities.length > 0 && (
          <div className="mt-8 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
            <h4 className="text-sm font-semibold mb-3">Connected Sources</h4>
            <div className="flex flex-wrap gap-2">
              {identities.map((id) => (
                <span
                  key={id.source}
                  className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-lg text-sm"
                >
                  {id.source}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
