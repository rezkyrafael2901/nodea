"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DATA_SOURCES, type DataSource, type IdentityData, buildIdentityPrompt, getPalette } from "@/lib/vana-sources";
import { DataSoulCard } from "@/components/data-soul-card";

type ConnectState = "idle" | "requesting" | "awaiting_approval" | "checking" | "reading" | "done" | "error";

export default function Home() {
  const [onboardedSources, setOnboardedSources] = useState<Set<string>>(new Set());
  const [identities, setIdentities] = useState<IdentityData[]>([]);
  const [identityResult, setIdentityResult] = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Per-source connect state
  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [activeSource, setActiveSource] = useState<DataSource | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const popupRef = useRef<Window | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for postMessage from the return tab
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "vana-connect-approved") {
        setActiveRequestId(event.data.requestId);
        setConnectState("checking");
        setStatusMessage("Verifying approval...");

        // Start polling the status
        pollStatus(event.data.requestId, event.data.sourceId);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollStatus = (requestId: string, sourceId: string) => {
    // Clear any existing polling
    if (pollingRef.current) clearInterval(pollingRef.current);

    const maxAttempts = 30; // 60 seconds total (2s interval)
    let attempts = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setConnectState("error");
        setStatusMessage("Approval timed out. Please try again.");
        return;
      }

      try {
        const res = await fetch(
          `/api/vana/status?requestId=${encodeURIComponent(requestId)}&sourceId=${sourceId}`
        );
        const data = await res.json();

        if (data.error) {
          // Dev mode: if SDK not configured, mock is approved immediately
          if (data.devMode) {
            setConnectState("reading");
            setStatusMessage("Dev mode: reading data...");
            clearInterval(pollingRef.current!);
            readData(requestId, sourceId);
            return;
          }
          // Non-dev-mode error — keep polling (might be transient)
          return;
        }

        if (data.status === "approved") {
          clearInterval(pollingRef.current!);
          setConnectState("reading");
          setStatusMessage("Approved! Fetching your data...");
          readData(requestId, sourceId);
        }
        // Otherwise keep polling
      } catch {
        // Transient error — keep polling
      }
    }, 2000);
  };

  const readData = async (requestId: string, sourceId: string) => {
    try {
      const res = await fetch(
        `/api/vana/data?requestId=${encodeURIComponent(requestId)}&sourceId=${sourceId}`
      );
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Format the data as IdentityData
      const identityData: IdentityData = {
        source: sourceId,
        data: result.data || result,
        raw: [result],
      };

      // Update state
      setOnboardedSources((prev) => {
        const next = new Set(prev);
        next.add(sourceId);
        return next;
      });
      setIdentities((prev) => [...prev, identityData]);
      setConnectState("done");
      setStatusMessage(`✅ Connected ${sourceId}!`);
      setError("");

      // Reset connect state after a moment
      setTimeout(() => {
        setConnectState("idle");
        setActiveSource(null);
        setActiveRequestId(null);
        setStatusMessage("");
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
      setError(msg);
      setConnectState("error");
      setStatusMessage(msg);
    }
  };

  const handleConnect = async (source: DataSource) => {
    if (connectState !== "idle") return;

    setActiveSource(source);
    setConnectState("requesting");
    setStatusMessage(`Connecting to ${source.name}...`);
    setError("");

    try {
      const res = await fetch("/api/vana/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id }),
      });

      const data = await res.json();

      if (data.error) {
        // Dev mode fallback: when no app key configured, simulate approval
        if (data.devMode) {
          // Simulate connection delay
          await new Promise((r) => setTimeout(r, 1500));
          const identityData: IdentityData = {
            source: source.id,
            data: { id: source.id, name: source.name, status: "connected" },
            raw: [{ sourceId: source.id, mock: true }],
          };
          setOnboardedSources((prev) => {
            const next = new Set(prev);
            next.add(source.id);
            return next;
          });
          setIdentities((prev) => [...prev, identityData]);
          setConnectState("done");
          setStatusMessage(`✅ Connected ${source.name} (dev mode)`);
          setError("");
          setTimeout(() => {
            setConnectState("idle");
            setActiveSource(null);
            setStatusMessage("");
          }, 2000);
          return;
        }
        throw new Error(data.error);
      }

      // Open approval popup
      setConnectState("awaiting_approval");
      setActiveRequestId(data.requestId);
      setStatusMessage(`Approve access in the new window...`);

      // Open Vana approval URL in a popup
      const popup = window.open(
        data.approvalUrl,
        "vana-connect",
        "width=600,height=700,scrollbars=yes"
      );

      if (!popup || popup.closed) {
        // Popup blocked — show fallback link
        popupRef.current = null;
        setStatusMessage(`Popup blocked. Click to open approval manually.`);
        return;
      }

      popupRef.current = popup;

      // Start polling for status immediately (the return tab will also trigger via postMessage)
      pollStatus(data.requestId, source.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setConnectState("error");
      setStatusMessage(msg);
    }
  };

  const openApprovalManually = () => {
    if (activeRequestId && activeSource) {
      fetch(`/api/vana/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: activeSource.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.approvalUrl) {
            window.open(data.approvalUrl, "vana-connect", "width=600,height=700");
          }
        })
        .catch(() => {});
    }
  };

  const handleGenerate = async () => {
    if (identities.length === 0) {
      setError("Connect at least one data source first");
      return;
    }

    setGenerating(true);
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
      setGenerating(false);
    }
  };

  const connectedCount = onboardedSources.size;
  const totalSources = DATA_SOURCES.length;

  const renderConnectButton = (source: DataSource) => {
    const isConnected = onboardedSources.has(source.id);
    const isProcessing = activeSource?.id === source.id && !isConnected;
    const isAwaiting = isProcessing && connectState === "awaiting_approval";

    if (isConnected) {
      return <span className="text-emerald-400 text-sm">✓</span>;
    }

    return (
      <button
        onClick={() => handleConnect(source)}
        disabled={connectState !== "idle" || generating}
        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        {isAwaiting ? "Pending..." : isProcessing ? "..." : "Connect"}
      </button>
    );
  };

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

        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-xl text-sm border ${
            connectState === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : connectState === "done"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-violet-500/10 border-violet-500/30 text-violet-400"
          }`}>
            {statusMessage}
          </div>
        )}

        {/* Error */}
        {error && !statusMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Popup blocked fallback */}
        {connectState === "awaiting_approval" && !popupRef.current && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
            Popup was blocked.{" "}
            <button
              onClick={openApprovalManually}
              className="underline hover:text-yellow-300"
            >
              Click here to open approval window
            </button>
          </div>
        )}

        {/* Generating indicator */}
        {generating && (
          <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-400 text-sm animate-pulse">
            Generating your Soul Card...
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
                const isProcessing = activeSource?.id === source.id && !isConnected;

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
                        {renderConnectButton(source)}
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
              disabled={generating || identities.length === 0 || connectState !== "idle"}
              className="w-full mt-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-lg font-bold transition-all shadow-lg shadow-violet-500/20"
            >
              {generating
                ? "Generating..."
                : identities.length > 0
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
