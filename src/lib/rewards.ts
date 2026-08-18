/**
 * rewards.ts — Vana Cup reward config + identity helpers.
 *
 * Follows the Patina-style reward/referral gamification layer.
 * Pure constants + pure functions — safe for client & server.
 */

export const REWARD_CONFIG = {
  /** Number of paid places on the leaderboard. */
  places: 50,
  championPrize: 5000,
  runnerUpPrize: 500,
  cupClosesAt: "18 August 2026",
  paidBy: "31 August 2026",
  /** Current pool (read from /api/prize when possible). */
  pool: 7012.63,
  championPayout: 5012.63,
} as const;

export interface LeaderboardEntry {
  rank: number;
  name: string;
  icon?: string | null;
  url?: string | null;
  points: number;
  goals: number;
  assists: number;
  users: number;
  reads: number;
  delta: number;
  disqualified: boolean;
  app?: string | null;
}

export interface PrizeInfo {
  txCount: number;
  basePool: number;
  baseChampion: number;
  runnerUp: number;
  txPerStep: number;
  vanaPerStep: number;
  growth: number;
  pool: number;
  championPayout: number;
}

/**
 * Client-identity helpers. The tag is persisted in localStorage under this key.
 */
export const IDENTITY_KEY = "nodea:identity";

export interface NodeaIdentity {
  id: string; // stable device id (crypto.randomUUID fallback)
  username: string | null;
  createdAt: number;
}

export function makeIdentity(): NodeaIdentity {
  const id =
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`) as string;
  return { id, username: null, createdAt: Date.now() };
}

export function loadIdentity(): NodeaIdentity | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NodeaIdentity;
    if (!parsed || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIdentity(id: NodeaIdentity): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
  } catch {
    /* ignore quota */
  }
}
