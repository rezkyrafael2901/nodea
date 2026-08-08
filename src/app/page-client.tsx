"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  DATA_SOURCES,
  type DataSource,
  type IdentityData,
  buildIdentityPrompt,
  getPalette,
} from "@/lib/vana-sources";
import { computeSoulScore, type SoulScoreResult, type ScoreComponent } from "@/lib/soul-score";
import { getTraits, getTopTrait, type Trait } from "@/lib/traits";
import { type LeaderboardEntry } from "@/lib/rewards";
import { DataSoulCard } from "@/components/data-soul-card";
import { BrandIconTile, BrandIcon, type BrandId } from "@/components/brand-icons";
import { AppLogo, AppWordmark } from "@/components/app-logo";
import { SourceOrbit } from "@/components/source-orbit";
import {
  Plus,
  Check,
  X,
  Loader2,
  Sparkles,
  Share2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  ChevronRight,
  ChevronLeft,
  Layers,
  Zap,
  Crown,
  Target,
  Heart,
  Brain,
  Users,
  Menu,
  Monitor,
  Globe,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Info,
  RotateCcw,
  Settings,
  Palette,
  Image as LucideImage,
  Link2,
  Trophy,
  Star,
  Sun,
  Moon,
  Home,
  Newspaper,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  BarChart2,
  Shield,
  Clock,
  Link,
  ArrowRight,
  BookOpen,
} from "lucide-react";

type ConnectState =
  | "idle"
  | "requesting"
  | "awaiting_approval"
  | "checking"
  | "reading"
  | "done"
  | "error";

const GRADE_COLORS: Record<string, string> = {
  S: "#fbbf24",
  A: "#4F8CFF",
  B: "#00D4FF",
  C: "#34d399",
  D: "#64748B",
};

const GRADE_LABELS: Record<string, string> = {
  S: "Legendary",
  A: "Elite",
  B: "Pro",
  C: "Rising",
  D: "Newcomer",
};

const THEME_OPTIONS = [
  {
    id: "midnight",
    label: "Midnight",
    swatch: "bg-gradient-to-br from-[#0a0a0a] to-[#16213e]",
  },
  {
    id: "neon",
    label: "Neon",
    swatch: "bg-gradient-to-br from-[#0f0c29] via-[#24243e] to-[#4F8CFF]/60",
  },
  {
    id: "glass",
    label: "Glass",
    swatch: "bg-gradient-to-br from-[#101418] to-[#1c2530] border border-white/25",
  },
];

// ── Easing helpers ──
const easeOut = [0.16, 1, 0.3, 1] as const;
const easeSpring = [0.34, 1.56, 0.64, 1] as const;

// ── Motion Variants ──
const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const sectionVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const cardVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.5, ease: easeSpring },
  }),
  hover: { y: -8, scale: 1.02, transition: { duration: 0.3, ease: easeOut } },
  tap: { scale: 0.98 },
};

const statVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.1, duration: 0.6, ease: easeOut },
  }),
};

const glowVariants = {
  animate: {
    opacity: [0.3, 0.6, 0.3],
    scale: [1, 1.05, 1],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function PageClient() {
  // ── State ──
  const [onboardedSources, setOnboardedSources] = useState<Set<string>>(new Set());
  const [identities, setIdentities] = useState<IdentityData[]>([]);
  const [identityResult, setIdentityResult] = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [isDesktop, setIsDesktop] = useState(true);
  const [cardTheme, setCardTheme] = useState("midnight");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Connect flow
  const [connectState, setConnectState] = useState<ConnectState>("idle");
  const [activeSource, setActiveSource] = useState<DataSource | null>(null);
  const [activeMode, setActiveMode] = useState<"web" | "full">("web");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const popupRef = useRef<Window | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-flight profile-link check modal
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkSource, setCheckSource] = useState<DataSource | null>(null);
  const [checkMode, setCheckMode] = useState<"web" | "full">("web");
  const [checkInput, setCheckInput] = useState("");
  const [checkState, setCheckState] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [checkResult, setCheckResult] = useState<Record<string, unknown> | null>(null);
  const [checkHint, setCheckHint] = useState("");
  const checkInputRef = useRef<HTMLInputElement>(null);

  // Animated values
  const [displayScore, setDisplayScore] = useState(0);
  const [displayGrade, setDisplayGrade] = useState("D");

  // Derived values (needed for effects below)
  const soulScore = useMemo(() => computeSoulScore(identities), [identities]);
  const connectedCount = onboardedSources.size;
  const totalSources = DATA_SOURCES.length;

  const [refFrom, setRefFrom] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  // ── Theme (dark/light) ──
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("nodea-theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { window.localStorage.setItem("nodea-theme", theme); } catch {}
  }, [theme]);

  // ── Tab-based navigation (Patina-style bottom nav) ──
  type ViewKey = "home" | "article" | "connect" | "card" | "standings";
  const [view, setView] = useState<ViewKey>("home");

  const goView = useCallback((v: ViewKey, anchor?: string) => {
    setNavOpen(false);
    setView(v);
    setTimeout(() => {
      if (anchor) {
        const el = document.getElementById(anchor);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 80);
  }, []);

  const [scrolled, setScrolled] = useState(false);

  // scroll-shadow under the nav (Framer-style)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Leaderboard (real Vana Cup standings) ──
  const [standings, setStandings] = useState<LeaderboardEntry[] | null>(null);
  const [poolInfo, setPoolInfo] = useState<{ pool: number; championPayout: number; runnerUp: number; places: number; cupClosesAt: string; paidBy: string } | null>(null);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState("");

  // Fetch real Vana Cup leaderboard once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        if (data.ok) {
          setStandings(data.standings ?? []);
          setPoolInfo({
            pool: data.pool,
            championPayout: data.championPayout,
            runnerUp: data.runnerUp,
            places: data.places,
            cupClosesAt: data.cupClosesAt,
            paidBy: data.paidBy,
          });
        } else {
          setLbError(data.error ?? "Could not load leaderboard.");
        }
      } catch {
        setLbError("Could not load leaderboard.");
      } finally {
        setLbLoading(false);
      }
    })();
  }, []);

  // ── Effects ──
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) setRefFrom(ref.substring(0, 30));
    } catch {}
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Animate score/grade changes
  useEffect(() => {
    const score = soulScore.total;
    const grade = soulScore.grade;
    if (displayScore !== score) {
      const duration = 800;
      const start = displayScore;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(start + (score - start) * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    }
    if (displayGrade !== grade) setDisplayGrade(grade);
  }, [soulScore.total, soulScore.grade, displayScore, displayGrade]);

  // Persist pending connect
  const PENDING_KEY = "nodea:connect-pending";
  const savePending = (requestId: string, sourceId: string, mode: "web" | "full") => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ requestId, sourceId, mode, at: Date.now() }));
    } catch {}
  };
  const clearPending = () => {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {}
  };

  // ── Connect Flow ──
  const pollStatus = useCallback(
    (requestId: string, sourceId: string, mode: "web" | "full" = "web", opts?: { short?: boolean }) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      const maxAttempts = opts?.short ? 8 : 240;
      let attempts = 0;

      // Patina-style staged loading copy
      const getStagedMessage = (attempt: number): string => {
        const seconds = attempt * 1.5;
        if (seconds < 3) return "Opening the Vana approval tab…";
        if (seconds < 8) return "Waiting for you to approve in the Vana tab…";
        if (seconds < 18) return "Reading your history…";
        if (seconds < 35) return "This is the slow part. Your history is being collected for the first time…";
        return `Still going. First reads usually take up to ${Math.ceil((maxAttempts - attempt) * 1.5 / 60)} min…`;
      };

      const finish = (state: ConnectState, msg: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setConnectState(state);
        setStatusMessage(msg);
      };

      // Set initial staged message
      setStatusMessage(getStagedMessage(0));

      pollingRef.current = setInterval(async () => {
        attempts++;
        if (attempts >= maxAttempts) {
          clearPending();
          setActiveSource(null);
          setActiveRequestId(null);
          finish("idle", "");
          return;
        }
        // Update staged message every few seconds
        if (attempts % 2 === 0) {
          setStatusMessage(getStagedMessage(attempts));
        }
        try {
          const res = await fetch(
            `/api/vana/status?requestId=${encodeURIComponent(requestId)}&sourceId=${sourceId}&mode=${mode}`
          );
          const data = await res.json();
          if (data.error) {
            if (data.devMode) {
              clearInterval(pollingRef.current!);
              setConnectState("reading");
              setStatusMessage("Dev mode: reading data...");
              readData(requestId, sourceId, mode);
              return;
            }
            return;
          }
          if (
            data.status === "approved" ||
            data.status === "ready_for_read" ||
            data.status === "completed"
          ) {
            clearInterval(pollingRef.current!);
            setConnectState("reading");
            setStatusMessage("Approved! Fetching your data...");
            readData(requestId, sourceId, mode);
            return;
          }
          if (data.status === "denied" || data.status === "expired") {
            clearInterval(pollingRef.current!);
            clearPending();
            setActiveSource(null);
            setActiveRequestId(null);
            finish(
              "error",
              data.status === "denied"
                ? "Access was denied."
                : "Request expired. Please try again."
            );
            return;
          }
        } catch {}
      }, 1500);
    },
    []
  );

  const readData = async (requestId: string, sourceId: string, mode: "web" | "full" = "web") => {
    try {
      const res = await fetch(
        `/api/vana/data?requestId=${encodeURIComponent(requestId)}&sourceId=${sourceId}&mode=${mode}`
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      const identityData: IdentityData = {
        source: sourceId,
        data: result.data || result,
        raw: [result],
      };

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

      setTimeout(() => {
        setConnectState("idle");
        setActiveSource(null);
        setActiveMode("web");
        setActiveRequestId(null);
        setStatusMessage("");
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
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

  // Fast-path: the Vana return popup posts back when the user approves.
  // Trigger an immediate poll so we don't wait up to 1.5s for the next tick.
  const modeRef = useRef<"web" | "full">("web");
  useEffect(() => {
    modeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = (e.data || {}) as {
        type?: string;
        sourceId?: string;
        requestId?: string;
      };
      if (!d || d.type !== "vana-connect-approved" || !d.sourceId || !d.requestId) return;
      if (pollingRef.current) clearInterval(pollingRef.current);
      setConnectState("reading");
      setStatusMessage("Approved! Fetching your data...");
      readData(d.requestId, d.sourceId, modeRef.current);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-flight profile link check ──
  // Vana's ODL page asks the user to paste their profile link and its resolver
  // returns "profile not found" when the format is wrong. We validate the link
  // BEFORE opening the Vana tab so users arrive with the exact canonical URL.
  const needsLinkCheck = (source: DataSource, mode: "web" | "full"): boolean =>
    mode === "web" && (!!source.handle || !!source.findIt);

  const openLinkCheck = (source: DataSource, mode: "web" | "full" = "web") => {
    if (connectState !== "idle") return;
    if (!needsLinkCheck(source, mode)) {
      handleConnect(source, mode);
      return;
    }
    setCheckSource(source);
    setCheckMode(mode);
    setCheckInput("");
    setCheckState("idle");
    setCheckResult(null);
    setCheckHint(source.handle?.hint || source.findIt?.join(" ") || "");
    setCheckOpen(true);
    setTimeout(() => checkInputRef.current?.focus(), 150);
  };

  const runLinkCheck = async () => {
    if (!checkSource || !checkInput.trim() || checkState === "checking") return;
    setCheckState("checking");
    setCheckResult(null);
    try {
      const res = await fetch("/api/vana/check-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: checkSource.id, url: checkInput.trim() }),
      });
      const data = await res.json();
      setCheckResult(data);
      setCheckState(data.ok ? "ok" : "fail");
      setCheckHint(data.hint || "");
    } catch (err) {
      setCheckResult({ ok: false, error: err instanceof Error ? err.message : "Check failed" });
      setCheckState("fail");
      setCheckHint("");
    }
  };

  const copyCanonical = async () => {
    const url = (checkResult as Record<string, unknown> | null)?.canonicalUrl as string | undefined;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setStatusMessage("✅ Canonical profile link copied — paste it on the Vana page!");
    } catch {
      setStatusMessage(`📋 Copy this: ${url}`);
    }
  };

  const proceedToVana = () => {
    const src = checkSource;
    const mode = checkMode;
    setCheckOpen(false);
    if (src) handleConnect(src, mode);
  };

  const handleConnect = async (source: DataSource, mode: "web" | "full" = "web") => {
    if (connectState !== "idle") return;
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
        if (data.devMode) {
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

      setConnectState("awaiting_approval");
      setActiveRequestId(data.requestId);
      setStatusMessage("Approve access in the new window...");
      savePending(data.requestId, source.id, mode);

      const popup = window.open(data.approvalUrl, "vana-connect", "width=600,height=700,scrollbars=yes");
      if (!popup || popup.closed) {
        popupRef.current = null;
        setStatusMessage("Popup was blocked. Use the link below to approve in a new tab.");
        return;
      }
      popupRef.current = popup;
      pollStatus(data.requestId, source.id, mode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setConnectState("error");
      setStatusMessage(msg);
    }
  };

  const openApprovalManually = () => {
    if (activeRequestId && activeSource) {
      fetch(`${window.location.origin}/api/vana/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: activeSource.id, mode: activeMode }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.approvalUrl) {
            window.open(data.approvalUrl, "vana-connect", "width=600,height=700");
            popupRef.current = null;
          }
        })
        .catch(() => {});
    }
  };

  const cancelConnect = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    try { popupRef.current?.close(); } catch {}
    popupRef.current = null;
    clearPending();
    setActiveSource(null);
    setActiveRequestId(null);
    setActiveMode("web");
    setConnectState("idle");
    setStatusMessage("");
    setError("");
  };

  // ── Generate Card ──
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
        body: JSON.stringify({ prompt, sources: identities, mode: "auto" }),
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

  // ── Share / Download ──
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
    p.set("theme", cardTheme);
    const topTrait = getTopTrait(identities.map((i) => i.source));
    if (topTrait) p.set("trait", topTrait.id);
    p.set("score", String(soulScore.total));
    p.set("grade", soulScore.grade);
    return p.toString();
  }, [identityResult, identities, soulScore, cardTheme]);

  const cardLink = useCallback(() => `${window.location.origin}/?ref=${soulScore.grade}${soulScore.total}`, [soulScore]);

  const shareCard = async () => {
    const url = cardLink();
    const topTrait = getTopTrait(identities.map((i) => i.source));
    const traitText = topTrait ? ` · ${topTrait.emoji} ${topTrait.name}` : "";
    const text = `My Nodea Score: Grade ${soulScore.grade} · ${soulScore.total}/100 — ${soulScore.verdict}${traitText}. Try to beat it!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Nodea", text, url });
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
      const img = document.createElement("img");
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
          a.download = `nodea-card-${soulScore.grade}${soulScore.total}.png`;
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

  // ── Render Helpers ──
  const webSources = DATA_SOURCES.filter((s) => s.platform !== "desktop");
  const desktopSources = DATA_SOURCES.filter((s) => s.platform === "desktop");
  const hybridSources = DATA_SOURCES.filter((s) => s.platform === "hybrid");

  const renderSourceCard = (source: DataSource, index: number) => {
    const isConnected = onboardedSources.has(source.id);
    const isDesktopOnly = source.platform === "desktop";
    const isHybrid = source.platform === "hybrid";
    const disabledOnMobile = isDesktopOnly && !isDesktop;

    return (
      <motion.div
        key={source.id}
        variants={cardVariants}
        custom={index}
        initial="initial"
        animate="animate"
        whileHover={reducedMotion ? {} : "hover"}
        whileTap={reducedMotion ? {} : "tap"}
        className={`group relative flex h-full flex-col rounded-2xl border p-5 transition-all duration-300 ease-out ${
          isConnected
            ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40"
            : disabledOnMobile
            ? "bg-white/[0.01] border-white/[0.04] opacity-50"
            : "glass glass-border-hover hover:bg-white/[0.03]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <motion.div
              whileHover={reducedMotion ? {} : { scale: 1.1, rotate: -3 }}
              className="shrink-0 transition-transform duration-300 ease-out"
            >
              <BrandIconTile id={source.icon} size={48} />
            </motion.div>
            <div className="min-w-0">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-medium text-white group-hover:text-white transition-colors duration-300 truncate"
              >
                {source.name}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-white/45 truncate transition-colors duration-300 group-hover:text-white/60 mt-0.5"
              >
                {source.description}
              </motion.p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {disabledOnMobile ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] text-white/30 bg-white/[0.02] border border-white/[0.04]"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop only</span>
              </motion.div>
            ) : isHybrid && isDesktop && !isConnected ? (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5">
                <motion.button
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                  onClick={() => openLinkCheck(source, "web")}
                  disabled={connectState !== "idle" || generating}
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors"
                  title="Profile only — works anywhere"
                >
                  Profile
                </motion.button>
                <motion.button
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                  onClick={() => openLinkCheck(source, "full")}
                  disabled={connectState !== "idle" || generating}
                  className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 hover:border-blue-500/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-blue-200 transition-colors"
                  title="Watch history, likes, subscriptions — needs Vana Desktop"
                >
                  Deep
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                whileTap={reducedMotion ? {} : { scale: 0.98 }}
                onClick={() => openLinkCheck(source, isDesktopOnly ? "full" : "web")}
                disabled={connectState !== "idle" || generating || isConnected}
                className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isConnected
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default"
                    : "bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {isConnected ? (
                  <>
                    <Check className="w-4 h-4" />
                    Connected
                  </>
                ) : activeSource?.id === source.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {connectState === "awaiting_approval" ? "Pending…" : "Connecting…"}
                  </>
                ) : (
                  "Connect"
                )}
              </motion.button>
            )}
          </div>
        </div>

        {disabledOnMobile && source.findIt && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 text-[11px] text-white/35 leading-relaxed line-clamp-2"
          >
            {source.findIt.join(" ")}
          </motion.p>
        )}

        {isHybrid && isDesktop && !isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-[11px] text-white/35 leading-relaxed"
          >
            <span className="text-yellow-400/70 font-medium">Profile</span> works anywhere.{" "}
            <span className="text-blue-300/70 font-medium">Deep</span> pulls watch history, likes &
            subscriptions — connect it in Vana Desktop first for full data.
          </motion.div>
        )}

        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-emerald-500/10 flex items-center gap-2 text-xs text-emerald-400"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Contributing to your Soul Score</span>
          </motion.div>
        )}
      </motion.div>
    );
  };

  // ── ScoreBreakdown (Patina-style component bars) ──
  const ScoreBreakdown = ({ components }: { components: ScoreComponent[] }) => {
    const componentIcons = {
      age: Clock,
      corroboration: Shield,
      depth: BarChart2,
      standing: Users,
      breadth: Globe,
    };
    const componentColors = {
      age: "from-[#4F8CFF] to-[#00D4FF]",
      corroboration: "from-emerald-500 to-cyan-500",
      depth: "from-amber-500 to-orange-500",
      standing: "from-cyan-500 to-blue-500",
      breadth: "from-[#4F8CFF] to-[#00D4FF]",
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: easeOut }}
        className="space-y-4"
      >
        {components.map((comp, i) => {
          const Icon = componentIcons[comp.key as keyof typeof componentIcons] || BarChart2;
          const gradient = componentColors[comp.key as keyof typeof componentColors] || "from-white to-white";
          const pct = Math.round((comp.points / comp.max) * 100);

          return (
            <motion.div
              key={comp.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-r ${gradient}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-1">
                      {comp.label}
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.06, type: "spring", stiffness: 300 }}
                        className="font-mono text-lg"
                      >
                        {comp.points}/{comp.max}
                      </motion.span>
                    </div>
                    <div className="text-[11px] text-white/45">{comp.detail}</div>
                  </div>
                </div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="shrink-0 font-mono text-sm text-white/40"
                >
                  {pct}%
                </motion.span>
              </div>
              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.8, ease: easeSpring }}
                  className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-[0_0_10px_-2px_rgba(79,140,255,0.5)]`}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  const gradeColor = GRADE_COLORS[displayGrade] || GRADE_COLORS.D;
  const gradeLabel = GRADE_LABELS[displayGrade] || GRADE_LABELS.D;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageVariants}
      className="min-h-dvh bg-[var(--color-bg)] text-white relative overflow-x-hidden"
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
    >
      {/* ── Animated Background ── */}
      <motion.div
        className="pointer-events-none fixed inset-0 -z-10"
        animate={glowVariants}
        style={{ willChange: "transform, opacity" }}
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/8 blur-[150px]" />
        <div className="absolute top-1/3 -left-60 w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full bg-cyan-600/5 blur-[150px]" />
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(79,140,255,0.08) 0%, transparent 60%)",
          }}
        />
      </motion.div>

      {/* ── Floating Particles ── */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-blue-500/30"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `${5 + Math.random() * 90}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, ease: "linear", delay: Math.random() * 5 }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* ── Header (Framer-style nav) ── */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className={`sticky top-0 z-50 transition-all duration-300 ${
            scrolled
              ? "border-b border-white/[0.06] bg-(--color-bg)/85 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]"
              : "border-b border-transparent bg-transparent"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-[72px]">
              {/* Logo */}
              <button onClick={() => goView("home")} className="flex items-center gap-2.5 shrink-0 min-h-[44px]" aria-label="Nodea home">
                <AppLogo size={34} />
                <span className="font-display text-lg font-semibold tracking-tight text-white">Nodea</span>
              </button>

              {/* Center nav (desktop) */}
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { v: "connect", label: "Connect" },
                  { v: "home", label: "How it works", anchor: "how" },
                  { v: "article", label: "Article" },
                  { v: "standings", label: "Standings" },
                  { v: "card", label: "Your card" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => goView(item.v as ViewKey, item.anchor)}
                    className="px-3.5 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors font-medium min-h-[44px] inline-flex items-center"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                  <span className="text-emerald-400 font-mono text-sm font-semibold">{connectedCount}</span>
                  <span className="text-white/20">/</span>
                  <span className="text-white/50 font-mono text-sm">{totalSources}</span>
                  <span className="text-[9px] uppercase tracking-wider text-white/35 ml-0.5">connected</span>
                </div>
                <motion.button
                  whileHover={reducedMotion ? {} : { scale: 1.03, y: -1 }}
                  whileTap={reducedMotion ? {} : { scale: 0.97 }}
                  onClick={() => goView("connect")}
                  className="hidden sm:inline-flex items-center justify-center min-h-[44px] gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-shadow duration-300"
                  style={{
                    background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
                    boxShadow: "0 0 24px -6px rgba(79,140,255,0.55)",
                  }}
                >
                  Connect your data
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                {/* Theme toggle */}
                <button
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors"
                  aria-label="Toggle light / dark theme"
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                {/* Mobile hamburger */}
                <button
                  onClick={() => setNavOpen((v) => !v)}
                  className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                  aria-label="Menu"
                >
                  {navOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
                </button>
              </div>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
              {navOpen && (
                <motion.nav
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  className="md:hidden overflow-hidden"
                >
                  <div className="py-3 space-y-1 border-t border-white/[0.06]">
                    {[
                      { v: "connect", label: "Connect" },
                      { v: "home", label: "How it works", anchor: "how" },
                      { v: "article", label: "Article" },
                      { v: "standings", label: "Standings" },
                      { v: "card", label: "Your card" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => goView(item.v as ViewKey, item.anchor)}
                        className="w-full text-left px-3 py-3 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors font-medium"
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      onClick={() => goView("connect")}
                      className="w-full mt-2 px-3 py-3 rounded-lg text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)" }}
                    >
                      Connect your data
                    </button>
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        <main className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${view === "article" ? "py-0" : "py-12 md:py-20 lg:py-28"}`}>
          {view === "home" && (
            <>
          {/* ── Hero (Framer-style) ── */}
          <motion.section
            id="hero"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            className="relative text-center mb-20 md:mb-28 pt-6 md:pt-10"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: easeOut }}
              className="font-display-hero text-5xl md:text-7xl lg:text-[5.2rem] font-semibold tracking-tighter leading-[1.02] mb-6"
            >
              <span className="gradient-white">Meet yourself</span>
              <br />
              <span className="gradient-brand">in your data.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: easeOut }}
              className="tracking-ui text-lg md:text-xl lg:text-2xl text-white/50 max-w-3xl mx-auto leading-relaxed text-balance"
            >
              Nodea connects the accounts you already own across Vana into a single
              digital identity — built from your <span className="text-white/85">real activity</span>, not a questionnaire.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: easeOut }}
              className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <motion.button
                whileHover={reducedMotion ? {} : { scale: 1.04, y: -2 }}
                whileTap={reducedMotion ? {} : { scale: 0.97 }}
                onClick={() => goView("connect")}
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-base font-semibold text-white transition-shadow duration-300"
                style={{
                  background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
                  boxShadow: "0 10px 40px -10px rgba(79,140,255,0.6)",
                }}
              >
                Connect your accounts
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
              <motion.button
                whileHover={reducedMotion ? {} : { scale: 1.03, y: -1 }}
                whileTap={reducedMotion ? {} : { scale: 0.97 }}
                onClick={() => goView("standings")}
                className="inline-flex items-center justify-center min-h-[44px] gap-2.5 px-7 py-3.5 rounded-2xl text-base font-semibold text-white/80 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <Trophy className="w-5 h-5 text-amber-300" />
                View leaderboard
              </motion.button>
            </motion.div>

            {/* Trust row */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-6 text-xs md:text-sm text-white/35 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            >
              <span className="inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> We only read what you approve</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> No wallet needed</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Revoke anytime</span>
            </motion.p>

            {/* Source orbit — "Meet yourself in your data." visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.9, ease: easeOut }}
              className="mt-12 md:mt-14"
            >
              <SourceOrbit size={264} />
            </motion.div>

            {/* Live Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7, ease: easeOut }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-8"
            >
              <motion.div variants={statVariants} className="flex items-center gap-3 px-5 py-3 rounded-2xl glass glass-border">
                <div className="p-2 rounded-xl bg-blue-500/15">
                  <Target className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="font-mono font-semibold text-2xl md:text-3xl gradient-brand">{displayScore}</div>
                  <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">Soul Score</div>
                </div>
              </motion.div>
              <motion.div variants={statVariants} className="flex items-center gap-3 px-5 py-3 rounded-2xl glass glass-border">
                <div className="p-2 rounded-xl" style={{ background: `${gradeColor}20` }}>
                  <Crown className="w-5 h-5" style={{ color: gradeColor }} />
                </div>
                <div>
                  <div className="font-mono font-semibold text-2xl md:text-3xl" style={{ color: gradeColor }}>
                    Grade {displayGrade}
                  </div>
                  <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">{gradeLabel}</div>
                </div>
              </motion.div>
              <motion.div variants={statVariants} className="flex items-center gap-3 px-5 py-3 rounded-2xl glass glass-border">
                <div className="p-2 rounded-xl bg-cyan-500/15">
                  <TrendingUp className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <div className="font-mono font-semibold text-2xl md:text-3xl gradient-cyan-pink">{connectedCount}</div>
                  <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">Connected</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Product window (Framer-style desktop mockup) */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: easeOut }}
              className="hidden lg:block mt-16 relative max-w-4xl mx-auto"
            >
              <div className="rounded-2xl border border-white/[0.08] bg-(--color-bg-elevated)/90 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
                {/* window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <span className="w-3 h-3 rounded-full bg-red-500/70" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <span className="w-3 h-3 rounded-full bg-green-500/70" />
                  <div className="ml-4 flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs">
                    <Lock className="w-3 h-3" /> nodea.app
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 p-5">
                  {DATA_SOURCES.map((src, i) => (
                    <motion.div
                      key={src.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.08, duration: 0.5 }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                        onboardedSources.has(src.id)
                          ? "bg-emerald-500/[0.06] border-emerald-500/25"
                          : "bg-white/[0.02] border-white/[0.06]"
                      }`}
                    >
                      <BrandIcon id={src.icon} size={26} />
                      <span className="text-[11px] text-white/60">{src.name}</span>
                      {onboardedSources.has(src.id) ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] text-white/30">+ Connect</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
              {/* glow under window */}
              <div className="absolute -inset-x-10 -bottom-10 h-24 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-blue-500/20 blur-3xl -z-10" />
            </motion.div>
          </motion.section>

          {/* ── Intro — What is Nodea (project introduction) ── */}
          <motion.section
            id="intro"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative mt-20 md:mt-28 scroll-mt-24"
          >
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/40 mb-5">
                <AppLogo size={14} /> The Project
              </div>
              <h2 className="font-display-hero text-3xl md:text-5xl font-semibold tracking-tighter text-white">
                What is <span className="gradient-brand">Nodea?</span>
              </h2>
              <p className="mt-5 text-white/50 text-base md:text-lg leading-relaxed">
                Nodea is a project that turns your real digital footprint into
                a single, portable identity card. Connect GitHub, Instagram, Spotify, YouTube,
                Steam and ChatGPT — we read your actual activity with your permission, score it,
                and build a card that represents who you really are online. No questionnaires,
                no self-reported hype. <span className="text-white/80 font-medium">Meet yourself in your data.</span>
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Layers, title: "Multi-source", desc: "Six real platforms, one unified score built from live activity." },
                { icon: Lock, title: "Private by design", desc: "You approve exactly what we read, and you can revoke anytime." },
                { icon: Share2, title: "Portable", desc: "One card you can share, compare and keep across every device." },
              ].map((f) => (
                <div key={f.title} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] mb-4">
                    <f.icon className="w-6 h-6 text-cyan-300" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>
            </>
          )}

          {view === "connect" && (
            <>
          {/* ── Status / Error / Referral ── */}
          <AnimatePresence mode="wait">
            {statusMessage && (
              <motion.div
                key={connectState}
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                transition={{ duration: 0.3, ease: easeOut }}
                className={`mb-8 p-4 rounded-2xl text-sm border flex items-start gap-3 ${
                  connectState === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : connectState === "done"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                }`}
              >
                {connectState === "error" && <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                {connectState === "done" && <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                {connectState !== "error" && connectState !== "done" && <Loader2 className="w-5 h-5 mt-0.5 flex-shrink-0 animate-spin text-blue-400" />}
                <span className="flex-1">{statusMessage}</span>
                {(connectState === "awaiting_approval" || connectState === "requesting") && (
                  <button
                    onClick={cancelConnect}
                    className="inline-flex items-center justify-center min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors flex-shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </motion.div>
            )}

            {error && !statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {connectState === "awaiting_approval" && !popupRef.current && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-sm"
              >
                <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                  <AlertCircle className="w-5 h-5" />
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
                  className="inline-flex items-center justify-center min-h-[44px] gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-xl font-medium transition-colors"
                >
                  Open Vana approval
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={cancelConnect}
                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors ml-3"
                >
                  Cancel
                </button>
              </motion.div>
            )}

            {connectState === "awaiting_approval" && popupRef.current && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-sm"
              >
                <div className="flex items-center gap-2 text-blue-300 font-medium mb-1">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Waiting for approval…
                </div>
                <p className="text-white/60">
                  Approve access in the Vana window.{" "}
                  <strong>Keep both tabs open</strong> until it says connected.
                </p>
                <button
                  onClick={cancelConnect}
                  className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors mt-3"
                >
                  Cancel
                </button>
              </motion.div>
            )}

            {generating && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 text-sm flex items-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating your Nodea card…</span>
              </motion.div>
            )}

            {refFrom && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, height: "auto", scale: 1 }}
                className="mb-8 p-4 rounded-2xl text-sm flex items-center gap-3 border bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-200"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="p-2 rounded-xl bg-amber-500/20"
                >
                  <Trophy className="w-5 h-5" />
                </motion.div>
                <div>
                  <p className="font-medium">
                    🏆 You came from a Nodea Card{" "}
                    <span className="font-semibold gradient-brand">Grade {refFrom}</span> —
                    connect your data and try to beat their score!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main Grid ── */}
          <motion.div
            id="connect"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            className="scroll-mt-24 grid grid-cols-1 gap-8 lg:gap-10 items-start max-w-5xl mx-auto w-full"
          >
            {/* Left: Data Sources */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="font-display w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-sm font-semibold text-blue-300">
                  1
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight leading-tight">Connect data sources</h2>
                  <p className="tracking-ui text-xs text-white/40 mt-0.5">Pick any accounts — your card gets deeper with each one</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-auto flex items-center gap-1.5 text-xs text-white/40 shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="font-semibold text-white/80">{connectedCount}</span>
                  <span className="text-white/20">/</span>
                  <span>{totalSources}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400/70" />
                </motion.div>
              </motion.div>

              <motion.div
                variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
                initial="initial"
                animate="animate"
                className="space-y-8"
              >
                {/* Web Sources */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Instant Connect</span>
                    <span className="ml-auto text-[11px] text-white/25">
                      {webSources.filter((s) => onboardedSources.has(s.id)).length}/{webSources.length}
                    </span>
                  </div>
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                  >
                    {webSources.map((source, i) => (
                      <motion.div key={source.id} variants={cardVariants} custom={i}>
                        {renderSourceCard(source, i)}
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>

                {/* Desktop Sources */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      className="w-2.5 h-2.5 rounded-full bg-orange-400"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Deep Data</span>
                    <span className="ml-auto text-[11px] text-white/25">
                      {desktopSources.filter((s) => onboardedSources.has(s.id)).length}/{desktopSources.length}
                    </span>
                    {!isDesktop && (
                      <span className="text-[10px] text-white/30 font-normal hidden sm:inline flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        Install on computer
                      </span>
                    )}
                  </div>
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                  >
                    {desktopSources.map((source, i) => (
                      <motion.div key={source.id} variants={cardVariants} custom={i}>
                        {renderSourceCard(source, i)}
                      </motion.div>
                    ))}
                    {!isDesktop && (
                      <motion.div
                        variants={cardVariants}
                        className="md:col-span-2 p-5 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-orange-500/15 shrink-0">
                            <Monitor className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white/80 mb-1">Unlock Deep Data with Vana Desktop</p>
                            <p className="text-white/40 text-sm leading-relaxed">
                              Steam games & playtime, YouTube watch history, ChatGPT conversations, Spotify listening history.
                              <br />
                              <span className="text-white/30 mt-2 inline-block">
                                Install Vana Desktop at vana.org/desktop → connect accounts → come back and hit Connect.
                              </span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.section>
              </motion.div>

              {/* Left panel close */}
            </motion.div>
            {/* Grid close */}
          </motion.div>
          </>
        )}

          {view === "home" && (
            <>
              {/* How it Works (Patina-style 3-step) */}
              <motion.section
                id="how"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-12 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="font-display w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-sm font-semibold text-cyan-300">
                    3
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight leading-tight">How it works</h2>
                    <p className="tracking-ui text-xs text-white/40 mt-0.5">Three steps to your Nodea card</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      num: "01",
                      icon: Link,
                      title: "Connect an account",
                      desc: "No wallet, no download, no seed phrase. Start with the account you've had the longest, and your score appears straight away. Add more to raise it.",
                    },
                    {
                      num: "02",
                      icon: Shield,
                      title: "You approve what we read",
                      desc: "Your accounts stay in your own store, not ours. You approve exactly what we read, we read it once, and you can revoke access whenever you want. We never see a password.",
                    },
                    {
                      num: "03",
                      icon: ArrowRight,
                      title: "Save it, and it travels",
                      desc: "Persist your Nodea card to mainnet. Other apps can verify your identity and score without repeating setup.",
                    },
                  ].map((step, i) => (
                    <motion.div
                      key={step.num}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                      className="p-5 rounded-2xl glass glass-border relative"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <step.icon className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div className="flex-1">
                          <div className="font-mono text-lg font-semibold text-cyan-300 mb-1">{step.num}</div>
                          <div className="font-medium text-white mb-1">{step.title}</div>
                          <div className="text-sm text-white/50">{step.desc}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </>
          )}

          {view === "standings" && (
            <>
              {/* Nodea Tag + Reward + Leaderboard (Patina-style gamification) */}
              <motion.section
                id="standings"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="mt-12 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="font-display w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-sm font-semibold text-amber-300">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight leading-tight">Standings & rewards</h2>
                    <p className="tracking-ui text-xs text-white/40 mt-0.5">
                      {poolInfo
                        ? `${poolInfo.places} places · pool ${poolInfo.pool.toFixed(2)} VANA · closes ${poolInfo.cupClosesAt}`
                        : "Vana Cup live standings"}
                    </p>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="p-5 rounded-2xl glass glass-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white/70 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-amber-400" />
                      Vana Cup leaderboard
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/30">Live</span>
                  </div>
                  {lbLoading && (
                    <div className="flex items-center justify-center py-6 text-sm text-white/40 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      Loading standings…
                    </div>
                  )}
                  {!lbLoading && lbError && (
                    <p className="text-sm text-white/40 py-3">{lbError}</p>
                  )}
                  {!lbLoading && !lbError && standings && (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {standings.map((entry) => (
                        <div
                          key={entry.app ?? entry.name}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                            entry.name.toLowerCase() === "nodea"
                              ? "bg-amber-500/10 border border-amber-500/25"
                              : entry.rank <= 3
                              ? "bg-white/[0.04] border border-white/[0.06]"
                              : "bg-white/[0.02] border border-transparent"
                          }`}
                        >
                          <div className="w-6 text-center font-mono text-xs text-white/40">{entry.rank}</div>
                          <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/[0.05] flex items-center justify-center">
                            {entry.icon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.icon} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-white/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-white/85">{entry.name}</div>
                            <div className="text-[10px] text-white/30">
                              {entry.goals} goals · {entry.assists} assists
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold text-white/90">{entry.points}</div>
                            {entry.delta > 0 && <div className="text-[10px] text-emerald-400">▲{entry.delta}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!lbLoading && !lbError && standings && poolInfo && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div className="font-display font-semibold text-xl gradient-brand">{poolInfo.pool.toFixed(2)}</div>
                        <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">Pool (VANA)</div>
                      </div>
                      <div>
                        <div className="font-display font-semibold text-xl gradient-cyan-pink">{poolInfo.championPayout.toFixed(2)}</div>
                        <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">Champion payout</div>
                      </div>
                      <div>
                        <div className="font-display font-semibold text-xl text-white/85">{poolInfo.runnerUp}</div>
                        <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">Runner-up (VANA)</div>
                      </div>
                      <div>
                        <div className="font-display font-semibold text-xl text-white/85">{poolInfo.places}</div>
                        <div className="tracking-ui text-[10px] uppercase tracking-wider text-white/30">Paid places</div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>
            </>
          )}

          {view === "card" && (
            <>
              {/* Instruction Copy (Patina-style) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]"
              >
                <p className="text-sm text-white/60 leading-relaxed">
                  Each source is approved separately, because Vana asks for one at a time. Approving opens a Vana tab — enter your profile there, approve, and keep both tabs open until it says connected. That tab hands the data over; this one collects it. We never see a password, and you can revoke access from your Vana account whenever you want.
                </p>
              </motion.div>

              {/* Generate Button */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: easeOut }}
                className="mt-10"
              >
                <motion.button
                  whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                  whileTap={reducedMotion ? {} : { scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={generating || identities.length === 0 || connectState !== "idle"}
                  className="w-full py-5 rounded-2xl text-lg font-semibold tracking-tight flex items-center justify-center gap-3 transition-all duration-300 ease-out group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:y-0"
                  style={{
                    background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
                    boxShadow: "0 0 40px -10px rgba(79,140,255,0.4)",
                  }}
                >
                  <motion.svg
                    animate={{ rotate: generating ? 360 : 0 }}
                    transition={{ duration: 1, repeat: generating ? Infinity : 0, ease: "linear" }}
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    <path d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                  </motion.svg>
                  <span>
                    {generating
                      ? "Generating…"
                      : identities.length > 0
                      ? `Generate Nodea Card${identities.length > 1 ? ` (${identities.length} sources)` : ""}`
                      : "Connect at least one source"}
                  </span>
                </motion.button>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-[11px] text-white/25 mt-3"
                >
                  Your card is generated from real connected data — no questionnaire.
                </motion.p>
              </motion.div>

              {/* Connected Sources Summary */}
              {identities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mt-10 p-5 rounded-2xl glass glass-border"
                >
                  <h3 className="text-sm font-semibold mb-4 text-white/70 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Connected sources
                  </h3>
                  <motion.div
                    className="flex flex-wrap gap-2"
                    variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
                  >
                    {identities.map((id) => {
                      const src = DATA_SOURCES.find((s) => s.id === id.source);
                      return (
                        <motion.span
                          key={id.source}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={reducedMotion ? {} : { scale: 1.05 }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/70 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                        >
                          {src && <BrandIcon id={src.icon} size={14} />}
                          {id.source}
                        </motion.span>
                      );
                    })}
                  </motion.div>
                </motion.div>
              )}

            {/* Right: Score + Result Preview */}
            <motion.div
              id="identity"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: easeOut }}
              className="lg:sticky lg:top-28 scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="font-display w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-sm font-semibold text-cyan-300">
                  2
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight leading-tight">Your Identity</h2>
                  <p className="tracking-ui text-xs text-white/40 mt-0.5">Your digital identity from connected data</p>
                </div>
              </div>

              {/* Score Breakdown (Patina-style) */}
              {soulScore && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="mb-6 p-5 rounded-2xl glass glass-border"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-xl bg-blue-500/15">
                      <BarChart2 className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <div className="font-medium text-white">Score Breakdown</div>
                      <div className="tracking-ui text-[10px] text-white/35">How your Soul Score adds up</div>
                    </div>
                  </div>
                  <ScoreBreakdown components={soulScore.components} />
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {identityResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: easeOut }}
                    className="space-y-5"
                  >
                    {/* Demo/Fallback badge — shows why AI analysis used mock */}
                    {(identityResult as Record<string, any>).isMock ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-300/90"
                      >
                        <span className="text-xs font-medium">⚠️ Demo Mode</span>
                        <span className="text-[10px] text-amber-200/60">
                          {(() => {
                            const r = identityResult as Record<string, any>;
                            const reason = r.fallbackReason;
                            const mode = r.mode;
                            if (reason === "no_api_key") return "API key belum diset — pakai template demo.";
                            if (reason === "mock_only_mode") return "Mode demo dipaksa (mock-only).";
                            if (reason === "quota_exceeded") return "Kuota LLM habis — otomatis pakai template.";
                            if (reason === "rate_limited") return "Terlalu banyak request — pakai template.";
                            if (reason === "timeout") return "LLM timeout — fallback ke template.";
                            if (reason === "network_error") return "Jaringan error — fallback ke template.";
                            if (reason === "server_error") return "Server LLM error — fallback ke template.";
                            if (reason === "invalid_json" || reason === "parse_error")
                              return "Respons LLM tidak valid — fallback ke template.";
                            return `Fallback: ${reason || "unknown"} — pakai template.`;
                          })()}
                        </span>
                      </motion.div>
                    ) : null}

                    {/* Theme Picker */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 rounded-2xl glass glass-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                          <Palette className="w-4 h-4" />
                          Card Style
                        </div>
                        <motion.span
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="text-[10px] text-blue-400/70"
                        >
                          Preview
                        </motion.span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {THEME_OPTIONS.map((t) => (
                          <motion.button
                            key={t.id}
                            whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                            whileTap={reducedMotion ? {} : { scale: 0.98 }}
                            onClick={() => setCardTheme(t.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                              cardTheme === t.id
                                ? "border-blue-400/50 bg-blue-500/10 shadow-[0_0_30px_-5px_rgba(79,140,255,0.3)]"
                                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                            }`}
                          >
                            <motion.div
                              animate={{ scale: cardTheme === t.id ? 1.02 : 1 }}
                              transition={{ duration: 0.3 }}
                              className={`w-full h-10 rounded-lg ${t.swatch}`}
                            />
                            <motion.span
                              className={`text-[10px] font-medium ${
                                cardTheme === t.id ? "text-blue-300" : "text-white/40"
                              }`}
                            >
                              {t.label}
                            </motion.span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Card Preview */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="relative"
                    >
                      <DataSoulCard data={identityResult as Record<string, unknown>} />
                    </motion.div>

                    {/* Trait Badges */}
                    {identities.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 rounded-2xl glass glass-border"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          Traits
                        </div>
                        <motion.div
                          className="flex flex-wrap gap-2"
                          variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
                        >
                          {getTraits(identities.map((i) => i.source)).map((t: Trait) => (
                            <motion.span
                              key={t.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                                t.rarity === "epic"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_20px_-5px_rgba(251,191,36,0.2)]"
                                  : t.rarity === "rare"
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300 shadow-[0_0_20px_-5px_rgba(79,140,255,0.2)]"
                                  : "bg-white/[0.03] border-white/10 text-white/50"
                              }`}
                              title={t.desc}
                            >
                              <span>{t.emoji}</span>
                              {t.name}
                              {t.rarity !== "common" && (
                                <span
                                  className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                    t.rarity === "epic"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-blue-500/20 text-blue-400"
                                  }`}
                                >
                                  {t.rarity}
                                </span>
                              )}
                            </motion.span>
                          ))}
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Share Actions */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      <motion.button
                        whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={reducedMotion ? {} : { scale: 0.98 }}
                        onClick={shareCard}
                        disabled={generating || connectState !== "idle"}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all duration-300 group disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
                          boxShadow: "0 0 30px -5px rgba(79,140,255,0.4)",
                        }}
                      >
                        <Share2 className="w-4.5 h-4.5" />
                        <span>Share</span>
                        <motion.span
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                          className="text-[10px]"
                        >
                          ➜
                        </motion.span>
                      </motion.button>

                      <motion.button
                        whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={reducedMotion ? {} : { scale: 0.98 }}
                        onClick={copyCardLink}
                        disabled={generating || connectState !== "idle"}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Copy className="w-4.5 h-4.5" />
                        Copy Link
                      </motion.button>

                      <motion.button
                        whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                        whileTap={reducedMotion ? {} : { scale: 0.98 }}
                        onClick={downloadCardPng}
                        disabled={generating || connectState !== "idle"}
                        className="col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4.5 h-4.5" />
                        Download Card Image
                        <LucideImage className="w-4.5 h-4.5" />
                      </motion.button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-[420px] flex flex-col items-center justify-center border border-dashed border-white/[0.06] rounded-2xl bg-white/[0.01]"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="mb-5 opacity-30"
                    >
                      <AppLogo size={64} />
                    </motion.div>
                    <div className="text-white/30 text-sm text-center px-6">Your Nodea card will appear here</div>
                    <div className="text-white/20 text-xs mt-1">Connect sources → Generate</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
        </main>

        {view === "home" && (
          <>
        {/* ── Features grid (Framer-style) ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16 md:mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/40 mb-4">
              Why Nodea
            </div>
            <h2 className="font-display-hero text-3xl md:text-5xl font-semibold tracking-tighter text-white">
              Built different. <span className="gradient-brand">Proven by data.</span>
            </h2>
            <p className="mt-4 text-white/45 max-w-2xl mx-auto text-sm md:text-base">
              No fake quizzes. No self-reported hype. Every score comes from accounts
              you actually use — verified through Vana.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Shield,
                title: "Verified, not self-reported",
                desc: "Your data is read with your permission via Vana Data Portability — not typed into a form.",
                accent: "from-emerald-400/20 to-emerald-400/0 text-emerald-300",
              },
              {
                icon: Lock,
                title: "Private by design",
                desc: "No wallet, no seed phrase, no password. You approve exactly what we read, and revoke anytime.",
                accent: "from-blue-400/20 to-blue-400/0 text-blue-300",
              },
              {
                icon: Zap,
                title: "Instant score",
                desc: "The moment you link your first source, your Nodea score appears. Add more sources to deepen it.",
                accent: "from-cyan-400/20 to-cyan-400/0 text-cyan-300",
              },
              {
                icon: Share2,
                title: "Meet yourself anywhere",
                desc: "A single portable card that proves your digital footprint — shareable anywhere.",
                accent: "from-cyan-400/20 to-cyan-400/0 text-cyan-300",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={reducedMotion ? {} : { y: -6 }}
                className="group relative rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="inline-flex p-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] mb-4">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
          </>
        )}

        {view === "article" && (
          <>
        {/* ── Article — Why your data matters to you ── */}
        <section id="article" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-8 md:mt-12 lg:mt-14 scroll-mt-24">
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-6 md:p-10 overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-600/10 blur-[100px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/40 mb-5">
                <Brain className="w-3.5 h-3.5 text-cyan-300" /> Article
              </div>
              <h2 className="font-display-hero text-3xl md:text-4xl font-semibold tracking-tighter text-white leading-tight">
                Why your data matters to you
              </h2>
              <p className="mt-3 text-sm text-cyan-300/80 font-medium">
                A short read on data, identity, and why ownership matters more than ever.
              </p>

              <div className="mt-6 space-y-5 text-white/55 leading-relaxed text-[15px]">
                <p>
                  Every day, you leave a trail — the songs you replay, the code you push,
                  the photos you post, the games you finish, the videos you binge. On their
                  own, each trace looks small. Together, they form something remarkable:{" "}
                  <strong className="text-white font-semibold">an honest mirror of who you really are</strong>.
                  More honest than any resume. More honest than any bio. More honest than the
                  version of yourself you carefully craft for the world.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
                  {[
                    { n: "6+", t: "sources of truth — every platform you use adds a line to your story" },
                    { n: "100%", t: "of that story is written by you — your clicks, your posts, your playlists" },
                    { n: "0", t: "questionnaires can replace real behavioral signals" },
                  ].map((s) => (
                    <div key={s.t} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="font-mono text-2xl font-semibold gradient-brand">{s.n}</div>
                      <p className="mt-1 text-xs text-white/40 leading-snug">{s.t}</p>
                    </div>
                  ))}
                </div>

                <p>
                  Here&apos;s the catch: this story of you is scattered, locked inside walled
                  gardens, and — too often — used without you ever seeing it, let alone getting
                  anything back. You wrote it. You should be able to read it. That&apos;s the gap
                  Nodea is built for.
                </p>

                <blockquote className="border-l-2 border-cyan-400/60 pl-4 py-1 text-white/60 italic">
                  &quot;The most honest story about you isn&apos;t the one you tell — it&apos;s the
                  one your data tells.&quot;
                </blockquote>

                <p>
                  By connecting your real accounts, you&apos;re not just building a scorecard —
                  you&apos;re seeing yourself clearly for the first time. Your activity becomes a
                  verified, portable identity: one card that reflects who you are across every
                  platform. Yours to keep. Yours to share. Yours to own — and yes, the same data
                  that powers every modern technology belongs to you first.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => goView("connect")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-shadow duration-300"
                  style={{ background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)", boxShadow: "0 8px 30px -8px rgba(79,140,255,0.5)" }}
                >
                  Meet yourself — connect a source
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/35">~3 min read · Nodea Editorial</span>
              </div>
            </div>
          </motion.article>

          {/* ── More reads (mini-articles) ── */}
          <div className="mt-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.02] text-[11px] uppercase tracking-widest text-white/40 mb-5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-300" /> More reads
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mini article 1 */}
              <motion.article
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-6 overflow-hidden"
              >
                <h3 className="font-display-hero text-xl md:text-2xl font-semibold tracking-tighter text-white leading-tight">
                  Your playlists know you better than your bio
                </h3>
                <p className="mt-3 text-[15px] text-white/55 leading-relaxed">
                  The songs you replay at 2am, the code you refactor, the games you actually
                  finish — they&apos;re your real fingerprints. A bio is what you want people to
                  think. Your data is what you actually do. Nodea reads the second one.
                </p>
                <blockquote className="border-l-2 border-cyan-400/60 pl-4 py-1 text-white/60 italic text-sm mt-4">
                  &quot;You are the sum of what you do — not what you claim.&quot;
                </blockquote>
              </motion.article>

              {/* Mini article 2 */}
              <motion.article
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-6 overflow-hidden"
              >
                <h3 className="font-display-hero text-xl md:text-2xl font-semibold tracking-tighter text-white leading-tight">
                  You wrote your story. Somebody else is reading it.
                </h3>
                <p className="mt-3 text-[15px] text-white/55 leading-relaxed">
                  Every like, scroll and purchase gets analyzed — by platforms, ad networks,
                  researchers. They often know your habits better than your closest friends.
                  The only one missing from that conversation is you. Nodea puts the mirror
                  back in your hands.
                </p>
                <blockquote className="border-l-2 border-cyan-400/50 pl-3 my-1 text-white/60 italic text-sm mt-4">
                  &quot;Your data tells your story. You should be the one reading it.&quot;
                </blockquote>
              </motion.article>
            </div>
          </div>
        </section>
          </>
        )}

        {view === "home" && (
          <>
        {/* ── Final CTA (Framer-style) ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28 mb-20 md:mb-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-(--color-bg-elevated) to-(--color-bg) px-6 py-16 md:py-24 text-center"
          >
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/15 blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[200px] rounded-full bg-cyan-600/10 blur-[100px]" />
            <div className="relative">
              <motion.div
                whileHover={reducedMotion ? {} : { rotate: -6, scale: 1.1 }}
                className="inline-block mb-6"
              >
                <AppLogo size={56} />
              </motion.div>
              <h2 className="font-display-hero text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tighter text-white leading-tight">
                Your data has a story.
                <br />
                <span className="gradient-brand">Start your card.</span>
              </h2>
              <p className="mt-5 text-white/50 text-base md:text-lg max-w-xl mx-auto">
                Connect one account and see your Nodea identity come to life — it takes less than a minute.
              </p>
              <motion.button
                whileHover={reducedMotion ? {} : { scale: 1.04, y: -2 }}
                whileTap={reducedMotion ? {} : { scale: 0.97 }}
                onClick={() => goView("connect")}
                className="mt-9 inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold text-white transition-shadow duration-300"
                style={{
                  background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
                  boxShadow: "0 12px 48px -12px rgba(79,140,255,0.7)",
                }}
              >
                Connect your accounts
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <p className="mt-5 text-xs text-white/30">
                Free during Vana Cup 2026 · No wallet needed
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── Footer (Framer-style multi-column) ── */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="border-t border-white/[0.05] bg-(--color-bg)"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8">
              <div className="col-span-2 md:col-span-4 lg:col-span-1">
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 mb-4 min-h-[44px]" aria-label="Back to top">
                  <AppLogo size={28} />
                  <span className="font-display text-lg font-semibold tracking-tight text-white">Nodea</span>
                </button>
                <p className="text-sm text-white/35 max-w-xs leading-relaxed">
                  Meet yourself in your data. Your digital identity, built from real activity — not a questionnaire.
                </p>
                <div className="flex items-center gap-2 mt-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/45">
                    Vana Cup 2026
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/45 mb-4">Product</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Connect", v: "connect" },
                    { label: "How it works", v: "home", anchor: "how" },
                    { label: "Leaderboard", v: "standings" },
                    { label: "Your card", v: "card" },
                  ].map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => goView(l.v as ViewKey, l.anchor)}
                        className="inline-flex items-center min-h-[44px] text-sm text-white/50 hover:text-white transition-colors"
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/45 mb-4">Data sources</h4>
                <ul className="space-y-2.5">
                  {DATA_SOURCES.slice(0, 7).map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => goView("connect")}
                        className="inline-flex items-center min-w-[44px] min-h-[44px] text-sm text-white/50 hover:text-white transition-colors"
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/45 mb-4">Powered by</h4>
                <ul className="space-y-2.5">
                  <li><a href="https://www.vana.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-sm text-white/50 hover:text-white transition-colors">Vana Data Portability</a></li>
                  <li><a href="https://www.vana.org/cup" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-sm text-white/50 hover:text-white transition-colors">Vana Cup 2026</a></li>
                  <li><a href="https://github.com/rezkyrafael2901/nodea" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-sm text-white/50 hover:text-white transition-colors">Open source</a></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-white/25">
                © 2026 Nodea. Built for Vana Cup 2026.
              </div>
              <div className="text-xs text-white/25 text-center sm:text-right">
                Data stays yours. Read with permission via Vana Data Portability.
              </div>
            </div>
          </div>
        </motion.footer>
          </>
        )}

        {/* ── Pre-flight Profile Link Check Modal ── */}
        <AnimatePresence>
          {checkOpen && checkSource && (
            <motion.div
              key="linkcheck"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={() => setCheckOpen(false)}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: easeOut }}
                className="relative w-full max-w-md glass rounded-3xl border border-white/10 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BrandIconTile id={checkSource.icon} size={40} />
                    <div>
                      <h3 className="font-semibold text-white">Connect {checkSource.name}</h3>
                      <p className="text-[11px] text-white/45">Verify your profile link first</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCheckOpen(false)}
                    className="text-white/40 hover:text-white transition-colors p-1"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {checkState === "ok" && checkResult ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-emerald-300 font-medium">Link valid ✓</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          Your profile resolves. Use this exact link on the Vana page:
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-white/80 break-all">
                      <span className="flex-1 min-w-0">
                        {(checkResult as Record<string, unknown>).canonicalUrl as string}
                      </span>
                      <button
                        onClick={copyCanonical}
                        className="shrink-0 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
                        aria-label="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <ol className="text-xs text-white/45 space-y-1.5 list-decimal list-inside">
                      <li>Tap Copy above (or long-press the link).</li>
                      <li>Continue to the Vana tab.</li>
                      <li>Paste that link where Vana asks — it will resolve now.</li>
                    </ol>
                    <button
                      onClick={proceedToVana}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{
                        background: "linear-gradient(135deg, #4F8CFF 0%, #00D4FF 100%)",
                        boxShadow: "0 0 30px -5px rgba(79,140,255,0.4)",
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Continue to Vana
                    </button>
                  </div>
                ) : checkState === "fail" && checkResult ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3.5">
                      <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-rose-300 font-medium">
                          {(checkResult as Record<string, unknown>).error as string}
                        </p>
                        {checkHint && (
                          <p className="text-xs text-white/50 mt-1 leading-relaxed">{checkHint}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={checkInputRef}
                        value={checkInput}
                        onChange={(e) => setCheckInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runLinkCheck()}
                        placeholder={
                          checkSource.handle?.placeholder ||
                          "Paste your profile link or handle"
                        }
                        className="flex-1 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.07] transition-colors"
                      />
                      <button
                        onClick={runLinkCheck}
                        disabled={!checkInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 disabled:opacity-40 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                ) : checkState === "checking" ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-sm text-white/50 mt-4">Checking your profile link…</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-white/55 leading-relaxed">
                      Vana will ask for your <span className="text-white/80">{checkSource.name}</span>{" "}
                      profile link on the next page. Enter it here so we can verify it resolves
                      before you continue — that prevents the “profile not found” error.
                    </p>
                    {checkHint && (
                      <p className="text-xs text-white/40 italic leading-relaxed">{checkHint}</p>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={checkInputRef}
                        value={checkInput}
                        onChange={(e) => setCheckInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runLinkCheck()}
                        placeholder={
                          checkSource.handle?.placeholder ||
                          "Paste your profile link or @handle"
                        }
                        className="flex-1 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.07] transition-colors"
                      />
                      <button
                        onClick={runLinkCheck}
                        disabled={!checkInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 disabled:opacity-40 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                    <button
                      onClick={proceedToVana}
                      className="w-full py-2.5 rounded-xl text-sm text-white/45 hover:text-white/70 border border-white/[0.06] transition-colors"
                    >
                      Skip — proceed without checking
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom Nav (Patina-style tab bar) ── */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-(--color-bg)/90 backdrop-blur-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Primary"
        >
          <div className="mx-auto max-w-lg grid grid-cols-5">
            {[
              { v: "home", label: "Home", icon: Home },
              { v: "article", label: "Article", icon: Newspaper },
              { v: "connect", label: "Connect", icon: Plus },
              { v: "card", label: "Card", icon: CreditCard },
              { v: "standings", label: "Standings", icon: Trophy },
            ].map((t) => {
              const active = view === t.v;
              return (
                <button
                  key={t.v}
                  onClick={() => goView(t.v as ViewKey)}
                  className={`flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 transition-colors ${
                    active ? "text-cyan-400" : "text-white/45 hover:text-white/70"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <t.icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
                  <span className={`h-1 w-1 rounded-full transition-colors ${active ? "bg-cyan-400" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </motion.div>
  );
}