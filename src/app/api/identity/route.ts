import { NextRequest, NextResponse } from "next/server";
import { buildIdentityPrompt, getPalette, type IdentityData } from "@/lib/vana-sources";

/**
 * Identity Analysis — Routing Mode
 * 
 * Modes (via env or request body):
 * - 'auto' (default): Try LLM → fallback to mock on ANY failure
 * - 'llm-only': Fail hard if LLM unavailable (testing)
 * - 'mock-only': Force mock template (demo/dev, zero cost)
 * 
 * Fallback triggers: timeout, network error, 429/5xx, quota exceeded, invalid JSON, parse error
 * Response always includes: isMock (bool), fallbackReason (string|null), mode (string)
 */

type AnalysisMode = "auto" | "llm-only" | "mock-only";
type FallbackReason =
  | "no_api_key"
  | "timeout"
  | "network_error"
  | "rate_limited"
  | "quota_exceeded"
  | "server_error"
  | "invalid_json"
  | "parse_error"
  | "validation_error"
  | "mock_only_mode"
  | "unknown_error"
  | null;

/** In-memory rate limiter (per instance) */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function mockResponse(
  sources: IdentityData[],
  fallbackReason: FallbackReason = "no_api_key",
  mode: AnalysisMode = "auto"
): NextResponse {
  return NextResponse.json({
    ...getMockAnalysis(sources),
    isMock: true,
    fallbackReason,
    mode,
  });
}

function llmResponse(
  result: Record<string, unknown>,
  mode: AnalysisMode
): NextResponse {
  return NextResponse.json({
    ...result,
    isMock: false,
    fallbackReason: null,
    mode,
  });
}

/** Categorize error for fallbackReason */
function categorizeError(error: unknown, status?: number): FallbackReason {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "network_error";
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "timeout";
  }
  if (status === 429) return "rate_limited";
  if (status === 402 || status === 403) return "quota_exceeded";
  if (status && status >= 500) return "server_error";
  return "unknown_error";
}

/** Fetch with timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limit
    if (rateLimited(clientIp(request))) {
      return NextResponse.json(
        { error: "Too many requests — please wait a moment and try again.", isMock: false },
        { status: 429 }
      );
    }

    // Parse & validate
    let body: { prompt?: string; sources?: IdentityData[]; mode?: AnalysisMode };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", isMock: false },
        { status: 400 }
      );
    }

    const { prompt, sources, mode = "auto" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length > 12_000) {
      return mockResponse([], "validation_error", mode);
    }
    if (!Array.isArray(sources) || sources.length > 12) {
      return mockResponse([], "validation_error", mode);
    }

    // Mode: mock-only → skip LLM entirely
    if (mode === "mock-only") {
      return mockResponse(sources, "mock_only_mode", mode);
    }

    // Resolve API key
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (mode === "llm-only") {
        return NextResponse.json(
          { error: "LLM API key not configured", isMock: false, fallbackReason: "no_api_key", mode },
          { status: 502 }
        );
      }
      return mockResponse(sources, "no_api_key", mode);
    }

    const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
    const endpoint = useOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.anthropic.com/v1/messages";

    const TIMEOUT_MS = 25_000; // 25s — leave headroom for Vercel 30s limit
    const MAX_RETRIES = 1; // one retry on transient failure

    // Build request
    const buildRequest = (): RequestInit => {
      if (useOpenRouter) {
        return {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://nodea-app.vercel.app",
            "X-Title": "Nodea",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-20250514",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
          }),
        };
      }
      return {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          max_tokens: 2000,
          temperature: 0.7,
          system:
            "You are an AI that analyzes human digital identity across multiple social platforms. You must respond with ONLY valid JSON matching the exact schema requested. No markdown, no explanation.",
          messages: [{ role: "user", content: prompt }],
        }),
      };
    };

    // Execute with retry
    let lastError: unknown;
    let lastStatus: number | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetchWithTimeout(endpoint, buildRequest(), TIMEOUT_MS);

        if (!response.ok) {
          lastStatus = response.status;
          const reason = categorizeError(new Error("HTTP " + response.status), response.status);
          if (attempt < MAX_RETRIES && (reason === "rate_limited" || reason === "server_error")) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }
          // llm-only mode: return error instead of mock
          if (mode === "llm-only") {
            return NextResponse.json(
              {
                error: `LLM API error: ${response.status}`,
                isMock: false,
                fallbackReason: reason,
                mode,
              },
              { status: 502 }
            );
          }
          return mockResponse(sources, reason, mode);
        }

        const data = await response.json();

        // Extract content
        let content = "";
        if (useOpenRouter) {
          content = data.choices?.[0]?.message?.content || "";
        } else {
          content = data.content?.[0]?.text || "";
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          if (mode === "llm-only") {
            return NextResponse.json(
              { error: "LLM returned non-JSON", isMock: false, fallbackReason: "invalid_json", mode },
              { status: 502 }
            );
          }
          return mockResponse(sources, "invalid_json", mode);
        }

        try {
          const result = JSON.parse(jsonMatch[0]);
          return llmResponse(result, mode);
        } catch {
          if (mode === "llm-only") {
            return NextResponse.json(
              { error: "LLM returned invalid JSON", isMock: false, fallbackReason: "parse_error", mode },
              { status: 502 }
            );
          }
          return mockResponse(sources, "parse_error", mode);
        }
      } catch (err) {
        lastError = err;
        const reason = categorizeError(err);
        if (attempt < MAX_RETRIES && (reason === "network_error" || reason === "timeout")) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        if (mode === "llm-only") {
          return NextResponse.json(
            {
              error: `LLM request failed: ${err instanceof Error ? err.message : "unknown"}`,
              isMock: false,
              fallbackReason: reason,
              mode,
            },
            { status: 502 }
          );
        }
        return mockResponse(sources, reason, mode);
      }
    }

    // Exhausted retries
    return mockResponse(sources, categorizeError(lastError, lastStatus), mode);
  } catch (error) {
    console.error("Identity API error:", error);
    return mockResponse([], "unknown_error", "auto");
  }
}

/** GET /api/identity — health check */
export async function GET() {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const provider = hasOpenRouter ? "openrouter" : hasAnthropic ? "anthropic" : "none";

  return NextResponse.json({
    status: "ok",
    provider,
    hasApiKey: hasOpenRouter || hasAnthropic,
    modes: ["auto", "llm-only", "mock-only"],
    defaults: { mode: "auto", timeoutMs: 25000, maxRetries: 1 },
  });
}

function getMockAnalysis(sources: IdentityData[]): Record<string, unknown> {
  const sourceNames = sources.map((s) => s.source);
  const hasCode = sourceNames.includes("github");
  const hasSocial = sourceNames.includes("instagram") || sourceNames.includes("youtube");

  const palettes: string[][] = [
    ["#0a0a0a", "#16213e", "#e2e2e2"],
    ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    ["#2C3E50", "#3498DB", "#ECF0F1"],
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];

  const cores = [
    "A multi-disciplinary creator who bridges technical depth with creative expression. Your digital footprint reveals someone who builds as much as you consume.",
    "An analytical mind with an artistic soul. You approach problems methodically but express yourself freely through creative channels.",
    "A curious explorer at the intersection of technology and human experience. You connect dots others miss.",
    "A digital-native polymath — equal parts builder, consumer, and creator across your connected platforms.",
  ];

  return {
    core_identity: cores[Math.floor(Math.random() * cores.length)],
    personality_scores: {
      creative_analytical: hasCode ? Math.floor(Math.random() * 30 + 50) : 45,
      social_solitary: hasSocial ? Math.floor(Math.random() * 40 + 40) : 35,
      consumer_creator: 62,
      risk_taker_caution: 48,
      optimistic_realistic: 55,
    },
    hidden_patterns: [
      `Your ${sourceNames.join(" + ") || "connected"} profile reveals consistent creative problem-solving across all platforms`,
      hasCode
        ? "Technical curiosity drives both your code and your content consumption"
        : "Deep engagement patterns suggest systematic thinking",
      `Cross-platform consistency in ${sourceNames.slice(0, 2).join(" and ") || "your sources"} interests shows authentic self-expression`,
    ],
    aesthetic: "Digital Minimalist with creative undertones",
    fun_facts: [
      "Your combined data shows more unique activity patterns than 80% of users",
      "You spend more time building/creating than 70% of your peer group",
      "Your data spans 4+ distinct interest domains — rare cross-pollination",
    ],
    soul_tagline: "Builder with an artist's eye and a researcher's curiosity",
    mood: "analytical",
    dominant_colors: palette,
  };
}