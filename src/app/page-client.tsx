"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { DATA_SOURCES, type DataSource, type IdentityData, buildIdentityPrompt, getPalette } from "@/lib/vana-sources";
import { computeSoulScore } from "@/lib/soul-score";
import { DataSoulCard } from "@/components/data-soul-card";
import { SoulScoreCard } from "@/components/soul-score-card";
import { BrandIconTile, BrandIcon, type BrandId } from "@/components/brand-icons";
import { AppLogo, AppWordmark } from "@/components/app-logo";

type ConnectState = "idle" | "requesting" | "awaiting_approval" | "checking" | "reading" | "done" | "error";

export default function PageClient() {
  const [onboardedSources, setOnboardedSources] = useState<Set<string>>(new Set());
  const [identities, setIdentities] = useState<IdentityData[]>([]);
  const [identityResult, setIdentityResult] = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Per-source connect state
  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [activeSource, setActiveSource] = useState<DataSource | null>(null);
  const [activeMode, setActiveMode] = useState<"web" | "full">("web");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const popupRef = useRef<Window | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Device detection — desktop = fine pointer (mouse/trackpad). Mobile = coarse.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist pending connect across refresh (Patina-style)
  const PENDING_KEY = "vana-soul:connect-pending";
  const savePending = (requestId: string, sourceId: string, mode: "web" | "full") => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ requestId, sourceId, mode, at: Date.now() }));
    } catch {}
  };
  const clearPending = () => {
    try { localStorage.removeItem(PENDING_KEY); } catch {}
  };

  // Listen for postMessage from the return tab
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "vana-connect-approved") {
        setActiveRequestId(event.data.requestId);
        setConnectState("checking");
        setStatusMessage("Verifying approval...");

        // Start polling the status
        pollStatus(event.data.requestId, event.data.sourceId, event.data.mode || "web");
      }
      // Return tab came back — if we have a pending request, poll it now
      if (event.data?.type === "vana-connect-returned") {
        try {
          const raw = localStorage.getItem(PENDING_KEY);
          if (raw) {
            const pending = JSON.parse(raw);
            if (pending?.requestId && pending?.sourceId) {
              setConnectState("checking");
              setStatusMessage("Checking approval status...");
              pollStatus(pending.requestId, pending.sourceId, pending.mode || "web");
            }
          }
        } catch {}
      }
    };
    window.addEventListener("message", handler);

    // Restore pending connect after refresh
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending?.requestId && pending?.sourceId && Date.now() - pending.at < 10 * 60 * 1000) {
          const src = DATA_SOURCES.find((s) => s.id === pending.sourceId);
          if (src) {
            setActiveSource(src);
            setActiveMode(pending.mode || "web");
            setActiveRequestId(pending.requestId);
            setConnectState("checking");
            setStatusMessage("Resuming approval check...");
            pollStatus(pending.requestId, pending.sourceId, pending.mode || "web", { short: true });
          }
        } else {
          clearPending();
        }
      }
    } catch {}

    // Restore from ?connect=return&source=...&requestId=... (no-opener redirect)
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connect") === "return" && params.get("source")) {
        const sourceId = params.get("source")!;
        const requestId = params.get("requestId") || undefined;
        const mode = (params.get("mode") as "web" | "full") || "web";
        const src = DATA_SOURCES.find((s) => s.id === sourceId);
        if (src) {
          setActiveSource(src);
          setActiveMode(mode);
          setConnectState("checking");
          setStatusMessage("Checking approval status...");
          // If no requestId in URL, fall back to localStorage pending
          const rid = requestId || (() => {
            try {
              const p = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
              return p?.requestId || null;
            } catch { return null; }
          })();
          if (rid) pollStatus(rid, sourceId, mode, { short: true });
        }
        // Clean URL without full reload
        window.history.replaceState({}, "", "/");
      }
    } catch {}

    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollStatus = (requestId: string, sourceId: string, mode: "web" | "full" = "web", opts?: { short?: boolean }) => {
    // Clear any existing polling
    if (pollingRef.current) clearInterval(pollingRef.current);

    // Fresh connect: Patina-style 1.5s interval, up to 6 minutes (240 attempts).
    // Restored/short poll (after refresh or return): only 8 attempts (~12s).
    // If the user already approved we'll catch it; otherwise we reset to idle
    // so the buttons don't stay locked forever.
    const maxAttempts = opts?.short ? 8 : 240;
    let attempts = 0;

    const finish = (state: ConnectState, msg: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setConnectState(state);
      setStatusMessage(msg);
    };

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        // Never approved — unlock the UI, drop the stale pending marker.
        clearPending();
        setActiveSource(null);
        setActiveRequestId(null);
        finish("idle", "");
        return;
      }

      try {
        const res = await fetch(
          `/api/vana/status?requestId=${encodeURIComponent(requestId)}&sourceId=${sourceId}&mode=${mode}`
        );
        const data = await res.json();

        if (data.error) {
          // Dev mode: if SDK not configured, mock is approved immediately
          if (data.devMode) {
            clearInterval(pollingRef.current!);
            setConnectState("reading");
            setStatusMessage("Dev mode: reading data...");
            readData(requestId, sourceId, mode);
            return;
          }
          // Non-dev-mode error — keep polling (might be transient)
          return;
        }

        if (data.status === "approved") {
          clearInterval(pollingRef.current!);
          setConnectState("reading");
          setStatusMessage("Approved! Fetching your data...");
          readData(requestId, sourceId, mode);
        }
        // Otherwise keep polling
      } catch {
        // Transient error — keep polling
      }
    }, 1500);
  };

  const readData = async (requestId: string, sourceId: string, mode: "web" | "full" = "web") => {
    try {
      const res = await fetch(
        `/api/vana/data?requestId=${encodeURIComponent(requestId)}&sourceId=${sourceId}&mode=${mode}`
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
      setStatusMessage(`✅ Connected ${sourceId}${mode === "full" ? " (deep data)" : ""}!`);
      setError("");
      clearPending();

      // Reset connect state after a moment
      setTimeout(() => {
        setConnectState("idle");
        setActiveSource(null);
        setActiveMode("web");
        setActiveRequestId(null);
        setStatusMessage("");
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
      // Escrow / payment errors need a human-readable hint
      if (/payment|escrow|insufficient|balance|402/i.test(msg)) {
        setError(
          "Approval succeeded, but the app escrow needs funding to read data. " +
          "Contact the operator to fund USDC.e escrow on Vana mainnet."
        );
      } else {
        setError(msg);
      }
      setConnectState("error");
      setStatusMessage(msg);
      clearPending();
    }
  };

  const handleConnect = async (source: DataSource, mode: "web" | "full" = "web") => {
    if (connectState !== "idle") return;

    // Desktop-only sources are disabled on mobile
    if (source.platform === "desktop" && !isDesktop) return;

    setActiveSource(source);
    setActiveMode(mode);
    setConnectState("requesting");
    setStatusMessage(`Connecting to ${source.name}...`);
    setError("");

    try {
      const res = await fetch("/api/vana/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id, mode }),
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
            setActiveMode("web");
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
      savePending(data.requestId, source.id, mode);

      // Open Vana approval URL in a popup
      const popup = window.open(
        data.approvalUrl,
        "vana-connect",
        "width=600,height=700,scrollbars=yes"
      );

      if (!popup || popup.closed) {
        // Popup blocked — show direct link (no re-fetch needed)
        popupRef.current = null;
        setStatusMessage(`Popup was blocked. Use the link below to approve in a new tab.`);
        return;
      }

      popupRef.current = popup;

      // Start polling for status immediately (the return tab will also trigger via postMessage)
      pollStatus(data.requestId, source.id, mode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setConnectState("error");
      setStatusMessage(msg);
    }
  };

  const openApprovalManually = () => {
    // Open the already-created approval URL if we have it
    if (activeRequestId && activeSource) {
      const url = `${window.location.origin}/api/vana/request`;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: activeSource.id, mode: activeMode }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.approvalUrl) {
            window.open(data.approvalUrl, "vana-connect", "width=600,height=700");
            popupRef.current = null; // re-open allowed
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

  // Soul Score — recomputed every time identities change (each connect bumps it live)
  const soulScore = useMemo(() => computeSoulScore(identities), [identities]);

  // Referral challenge — ?ref=<grade/score> from a shared card
  const [refFrom, setRefFrom] = useState<string | null>(null);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) setRefFrom(ref.substring(0, 30));
    } catch {}
  }, []);

  // Build OG image params from current state
  const buildOgParams = useCallback(() => {
    const p = new URLSearchParams();
    const r = identityResult as Record<string, any> | null;
    if (r) {
      if (r.core_identity) p.set("identity", String(r.core_identity));
      if (r.aesthetic) p.set("aesthetic", String(r.aesthetic));
      if (r.soul_tagline) p.set("tagline", String(r.soul_tagline));
      if (r.mood) p.set("mood", String(r.mood));
      const scores = r.personality_scores || {};
      if (scores.creative_analytical != null) p.set("creative_analytical", String(scores.creative_analytical));
      if (scores.social_solitary != null) p.set("social_solitary", String(scores.social_solitary));
      if (scores.consumer_creator != null) p.set("consumer_creator", String(scores.consumer_creator));
    }
    if (identities.length > 0) {
      p.set("sources", identities.map((i) => i.source).join(","));
    }
    p.set("score", String(soulScore.total));
    p.set("grade", soulScore.grade);
    return p.toString();
  }, [identityResult, identities, soulScore]);

  const cardLink = useCallback(() => {
    return `${window.location.origin}/?ref=${soulScore.grade}${soulScore.total}`;
  }, [soulScore]);

  const shareCard = async () => {
    const url = cardLink();
    const text = `My Vana Soul Score: Grade ${soulScore.grade} · ${soulScore.total}/100 — ${soulScore.verdict}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Vana Soul", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatusMessage("✅ Link copied — share it anywhere!");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setStatusMessage("✅ Link copied — share it anywhere!");
      } catch {
        setStatusMessage(`📋 Copy this link: ${url}`);
      }
    }
  };

  const copyCardLink = async () => {
    const url = cardLink();
    try {
      await navigator.clipboard.writeText(url);
      setStatusMessage("✅ Link copied — share it anywhere!");
    } catch {
      setStatusMessage(`📋 Copy this link: ${url}`);
    }
  };

  const downloadCardPng = async () => {
    try {
      setStatusMessage("Rendering card image...");
      const res = await fetch(`/api/og?${buildOgParams()}`);
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 630;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setStatusMessage("Could not render card on this device.");
          URL.revokeObjectURL(url);
          return;
        }
        ctx.drawImage(img, 0, 0, 1200, 630);
        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(url);
          if (!pngBlob) {
            setStatusMessage("Could not render card on this device.");
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(pngBlob);
          a.download = `vana-soul-card-${soulScore.grade}${soulScore.total}.png`;
          a.click();
          setStatusMessage("✅ Card downloaded!");
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setStatusMessage("Could not render card on this device.");
      };
      img.src = url;
    } catch {
      setStatusMessage("Could not render card — try the Share button instead.");
    }
  };

  const cancelConnect = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    clearPending();
    setActiveSource(null);
    setActiveRequestId(null);
    setActiveMode("web");
    setConnectState("idle");
    setStatusMessage("");
    setError("");
  };

  const renderConnectButton = (source: DataSource, mode: "web" | "full" = "web") => {
    const isConnected = onboardedSources.has(source.id);
    const isProcessing = activeSource?.id === source.id && !isConnected;
    const isAwaiting = isProcessing && connectState === "awaiting_approval";

    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
          Connected
        </span>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex items-center gap-1.5">
          <button
            onClick={cancelConnect}
            className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 rounded-lg transition-colors"
            title="Cancel this connection"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleConnect(source, mode)}
        disabled={connectState !== "idle" || generating}
        className="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
      >
        {isAwaiting ? "Pending…" : isProcessing ? "Connecting…" : "Connect"}
      </button>
    );
  };

  // Group sources by availability
  const webSources = DATA_SOURCES.filter((s) => s.platform !== "desktop");
  const desktopSources = DATA_SOURCES.filter((s) => s.platform === "desktop");
  const hybridSources = DATA_SOURCES.filter((s) => s.platform === "hybrid");

  const sourceBadge = (source: DataSource) => {
    if (source.platform === "desktop") {
      return (
        <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-500/10 text-orange-400">
          Desktop only
        </span>
      );
    }
    if (source.platform === "hybrid") {
      return (
        <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium bg-yellow-500/10 text-yellow-400">
          Mobile + Desktop
        </span>
      );
    }
    return (
      <span className={`hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${
        source.maturity === "stable" ? "bg-emerald-500/10 text-emerald-400" :
        source.maturity === "beta" ? "bg-yellow-500/10 text-yellow-400" :
        "bg-orange-500/10 text-orange-400"
      }`}>
        {source.maturity}
      </span>
    );
  };

  const renderSourceCard = (source: DataSource) => {
    const isConnected = onboardedSources.has(source.id);
    const isDesktopOnly = source.platform === "desktop";
    const isHybrid = source.platform === "hybrid";
    const disabledOnMobile = isDesktopOnly && !isDesktop;

    return (
      <div
        key={source.id}
        className={`group p-4 rounded-xl border transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/[0.07] ${
          isConnected
            ? "bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40"
            : disabledOnMobile
            ? "bg-white/[0.01] border-white/[0.05] opacity-60"
            : "bg-white/[0.02] border-white/[0.07] hover:border-violet-400/30 hover:bg-white/[0.05]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3">
              <BrandIconTile id={source.icon} size={46} />
            </div>
            <div className="min-w-0">
              <div className="font-medium transition-colors duration-300 group-hover:text-white">{source.name}</div>
              <div className="text-xs text-white/45 truncate transition-colors duration-300 group-hover:text-white/60">{source.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sourceBadge(source)}
            {disabledOnMobile ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/30" title="Requires Vana Desktop on a computer">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                Desktop
              </span>
            ) : isHybrid && isDesktop && !isConnected ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleConnect(source, "web")}
                  disabled={connectState !== "idle" || generating}
                  className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors"
                  title="Profile only — works anywhere"
                >
                  Profile
                </button>
                <button
                  onClick={() => handleConnect(source, "full")}
                  disabled={connectState !== "idle" || generating}
                  className="px-3 py-1.5 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 hover:border-violet-500/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-violet-200 transition-colors"
                  title="Watch history, likes, subscriptions — needs Vana Desktop"
                >
                  Deep
                </button>
              </div>
            ) : (
              renderConnectButton(source, isDesktopOnly ? "full" : "web")
            )}
          </div>
        </div>
        {disabledOnMobile && (
          <div className="mt-3 text-[11px] text-white/35 leading-relaxed">
            {source.findIt?.join(" ")}
          </div>
        )}
        {isHybrid && isDesktop && !isConnected && (
          <div className="mt-3 text-[11px] text-white/35 leading-relaxed">
            <span className="text-yellow-400/70 font-medium">Profile</span> works anywhere.{" "}
            <span className="text-violet-300/70 font-medium">Deep</span> pulls watch history, likes &amp; subscriptions — connect it in Vana Desktop first for full data.
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-fuchsia-600/5 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/[0.06] backdrop-blur-sm bg-[#0a0a0a]/70 sticky top-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <AppWordmark size={34} />
            <div className="flex items-center gap-3">
              <div className="text-sm text-white/50">
                <span className="font-medium text-white">{connectedCount}</span>
                <span className="mx-1.5 text-white/20">/</span>
                {totalSources} sources
              </div>
              <div className="h-1.5 w-28 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700"
                  style={{ width: `${(connectedCount / totalSources) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          {/* Hero */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Powered by Vana Data Portability
            </div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-5 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
              One card. Your whole digital self.
            </h2>
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              Connect your accounts across Vana and get a unified identity card —
              built from your real activity, not a questionnaire.
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
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm">
              <div className="text-yellow-400 font-medium mb-2">
                Popup was blocked — approve in a new tab instead
              </div>
              <p className="text-white/60 mb-3">
                Click the link below, log in to Vana, and approve the request.{" "}
                <strong>Keep both tabs open</strong> until this page says connected.
              </p>
              <a
                href={`https://app.vana.org/data-connection-requests/${activeRequestId}?mode=page`}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg font-medium"
              >
                Open Vana approval ↗
              </a>
            </div>
          )}

          {/* Awaiting approval guidance (popup open) */}
          {connectState === "awaiting_approval" && popupRef.current && (
            <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl text-sm">
              <div className="text-violet-300 font-medium mb-1">
                Waiting for approval…
              </div>
              <p className="text-white/60">
                Approve access in the Vana window.{" "}
                <strong>Keep both tabs open</strong> until it says connected.
              </p>
            </div>
          )}

          {/* Generating indicator */}
          {generating && (
            <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-400 text-sm animate-pulse">
              Generating your Soul Card...
            </div>
          )}

          {/* Referral challenge banner */}
          {refFrom && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-sm">
              🏆 You came from a Soul Card <span className="font-semibold">Grade {refFrom}</span> — connect your data and try to beat their score!
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Data Sources */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300 flex items-center justify-center text-xs font-semibold">1</span>
                <h3 className="text-lg font-semibold tracking-tight">Connect data sources</h3>
              </div>

              <div className="space-y-6">
                {/* Web sources — work everywhere */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">Instant connect</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Mobile OK</span>
                  </div>
                  <div className="space-y-3">
                    {webSources.map((source) => renderSourceCard(source))}
                  </div>
                </div>

                {/* Desktop sources — deep data, needs Vana Desktop */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">Deep data</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">Vana Desktop</span>
                    {!isDesktop && (
                      <span className="text-[10px] text-white/30 font-normal">— install on a computer for these</span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {desktopSources.map((source) => renderSourceCard(source))}
                    {!isDesktop && (
                      <div className="p-3 rounded-xl border border-dashed border-white/[0.08] text-[11px] text-white/35 leading-relaxed">
                        💻 <span className="text-white/50 font-medium">Vana Desktop</span> unlocks deep history:{" "}
                        Steam games &amp; playtime, YouTube watch history, ChatGPT conversations.{" "}
                        <span className="text-white/40">Install it on your PC at vana.org/desktop, connect your accounts there, then come back and hit Connect.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || identities.length === 0 || connectState !== "idle"}
                className="w-full mt-8 py-4 rounded-xl text-lg font-semibold tracking-tight transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {generating
                  ? "Generating…"
                  : identities.length > 0
                  ? `Generate Soul Card${identities.length > 1 ? ` (${identities.length} sources)` : ""}`
                  : "Connect at least one source"}
              </button>
            </div>

            {/* Right: Score + Result Preview */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/25 text-fuchsia-300 flex items-center justify-center text-xs font-semibold">2</span>
                <h3 className="text-lg font-semibold tracking-tight">Your identity</h3>
              </div>

              {/* Soul Score — live, updates on every connect */}
              <div className="mb-6">
                <SoulScoreCard score={soulScore} connectedCount={connectedCount} />
              </div>

              {identityResult ? (
                <>
                  <DataSoulCard data={identityResult as Record<string, unknown>} />
                  {/* Share actions */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={shareCard}
                      disabled={generating || connectState !== "idle"}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                      </svg>
                      Share
                    </button>
                    <button
                      onClick={copyCardLink}
                      disabled={generating || connectState !== "idle"}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                      </svg>
                      Copy link
                    </button>
                    <button
                      onClick={downloadCardPng}
                      disabled={generating || connectState !== "idle"}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed col-span-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download card image
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
                  <AppLogo size={56} className="opacity-30 mb-4" />
                  <div className="text-white/30 text-sm">Your soul card will appear here</div>
                  <div className="text-white/20 text-xs mt-1">Connect sources → Generate</div>
                </div>
              )}
            </div>
          </div>

          {/* Connected Sources Summary */}
          {identities.length > 0 && (
            <div className="mt-12 p-5 bg-white/[0.02] border border-white/[0.07] rounded-2xl">
              <h4 className="text-sm font-semibold mb-3 text-white/70">Connected sources</h4>
              <div className="flex flex-wrap gap-2.5">
                {identities.map((id) => {
                  const src = DATA_SOURCES.find((s) => s.id === id.source);
                  return (
                    <span
                      key={id.source}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70"
                    >
                      {src && <BrandIcon id={src.icon} size={14} />}
                      {id.source}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-white/35">
              <AppLogo size={20} />
              <span>Vana Soul</span>
            </div>
            <div className="text-xs text-white/25">
              Data stays yours. Read with permission via Vana Data Portability.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
