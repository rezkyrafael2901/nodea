/**
 * GET /api/leaderboard
 *
 * Returns the real Vana Cup standings (proxied from builders.vana.org)
 * merged with the prize pool. Server-side fetched, remotly cached in
 * globalThis for a few minutes to avoid hammering the Cup API.
 *
 * Response:
 * {
 *   ok: true,
 *   prize: PrizeInfo,
 *   standings: LeaderboardEntry[],   // top N
 *   total: number,
 *   pool: number,
 *   championPayout: number,
 *   runnerUp: number,
 *   places: number,
 *   cupClosesAt: string,
 *   paidBy: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  type LeaderboardEntry,
  type PrizeInfo,
  REWARD_CONFIG,
} from "@/lib/rewards";

const LEADERBOARD_URL = "https://builders.vana.org/api/leaderboard";
const PRIZE_URL = "https://builders.vana.org/api/prize";
const TOP_N = 20;

// Route segment cache avoids re-fetching between consecutive clients.
// globalThis key survives only as long as the serverless instance is warm;
// that is exactly what we want for a leaderboard.
const CACHE_MS = 5 * 60 * 1000;
const _g = globalThis as Record<string, unknown>;
const cached: { at: number; data: unknown } | undefined = _g.__nodea_lb_cache as never;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "nodea-app (+vanacup)" },
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  let body: unknown = cached && now - cached.at < CACHE_MS ? cached.data : null;
  let fromCache = body !== null;

  if (!body) {
    const [lb, prize] = await Promise.all([fetchJson(LEADERBOARD_URL), fetchJson(PRIZE_URL)]);
    body = { lb, prize };
    _g.__nodea_lb_cache = { at: now, data: body };
    fromCache = false;
  }

  const { lb, prize } = body as { lb: unknown; prize: unknown };

  const builders = (lb as { builders?: unknown[] })?.builders ?? [];
  let standings: LeaderboardEntry[] = [];
  let total = 0;
  if (Array.isArray(builders)) {
    standings = (builders as LeaderboardEntry[]).slice(0, TOP_N);
    total = builders.length;
  }

  const prizeInfo: PrizeInfo | null =
    prize && typeof prize === "object" && "pool" in (prize as object)
      ? (prize as PrizeInfo)
      : null;

  const pool = prizeInfo?.pool ?? REWARD_CONFIG.pool;
  const championPayout = prizeInfo?.championPayout ?? REWARD_CONFIG.championPayout;

  return NextResponse.json({
    ok: true,
    source: "builders.vana.org",
    fromCache,
    cachedAt: fromCache ? (cached as { at: number }).at : now,
    prize: prizeInfo,
    standings,
    total,
    pool,
    championPayout,
    runnerUp: REWARD_CONFIG.runnerUpPrize,
    places: REWARD_CONFIG.places,
    cupClosesAt: REWARD_CONFIG.cupClosesAt,
    paidBy: REWARD_CONFIG.paidBy,
  });
}