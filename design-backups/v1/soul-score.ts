/**
 * Soul Score Engine — Patina-aligned (Age 40 / Corroboration 20 / Depth 20 / Standing 10 / Breadth 10 = 100)
 *
 * Quantifies a user's digital identity from connected Vana data.
 * Mirrors Patina's score system: Age, Corroboration, Depth, Standing, Breadth.
 * But adapted for Nodea's "whole digital self" concept with AI personality layer.
 *
 * Total = 100
 *   age            (max 40) — oldest account age across sources (capped at 10+ years)
 *   corroboration  (max 20) — multiple platforms with matching age signals
 *   depth          (max 20) — volume of content created/collected (log scale)
 *   standing       (max 10) — social proof: followers, stars, playtime, engagement (log scale)
 *   breadth        (max 10) — number of distinct platforms connected (1→3, 2→6, 3→9, 4+→10)
 */

import type { IdentityData } from "@/lib/vana-sources";

export interface ScoreComponent {
  key: "age" | "corroboration" | "depth" | "standing" | "breadth";
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface SoulScoreResult {
  total: number;
  grade: string;
  verdict: string;
  components: ScoreComponent[];
  tips: string[];
}

// ---------- helpers ----------

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function firstDefined(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function dig(obj: unknown, paths: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const p of paths) {
    let cur: unknown = obj;
    let found = true;
    for (const seg of p.split(".")) {
      if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        found = false;
        break;
      }
    }
    if (found && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

function yearsSince(dateStr: unknown): number {
  if (!dateStr) return 0;
  const t = Date.parse(String(dateStr));
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ---------- per-source extractors ----------

interface SourceProfile {
  ageYears: number;        // account age
  depth: number;           // content volume
  standing: number;        // social proof metric
  detail: string;
}

function extractGithub(data: Record<string, unknown>): SourceProfile {
  const profile = (data.profile || data) as Record<string, unknown>;
  const repos = num(dig(profile, ["repositories.totalCount", "repositories.total"]));
  const followers = num(dig(profile, ["followers.totalCount", "followers.total"]));
  const created = dig(profile, ["createdAt", "created_at", "joinedAt"]);
  const contributions = num(dig(data, ["contributions.totalContributions", "contributions.thisYear"]));
  return {
    ageYears: yearsSince(created),
    depth: repos + contributions / 50,
    standing: followers,
    detail: `${Math.round(repos)} repos · ${Math.round(followers)} followers`,
  };
}

function extractInstagram(data: Record<string, unknown>): SourceProfile {
  const profile = (data.profile || data) as Record<string, unknown>;
  const media = num(firstDefined(profile, ["mediaCount", "media.count", "posts.count"]));
  const followers = num(firstDefined(profile, ["followerCount", "followers.totalCount", "followers"]));
  return {
    ageYears: 0,
    depth: media,
    standing: followers,
    detail: `${Math.round(media)} posts · ${Math.round(followers)} followers`,
  };
}

function extractSpotify(data: Record<string, unknown>): SourceProfile {
  const profile = (data.profile || data) as Record<string, unknown>;
  const saved = num(dig(data, ["savedTracks.total", "savedTracks.totalCount", "library.total"]));
  const playlists = num(firstDefined(profile, ["publicPlaylists", "playlists.total", "playlists.totalCount"]));
  const followers = num(dig(profile, ["followers.total", "followers"]));
  return {
    ageYears: 0,
    depth: saved + playlists * 2,
    standing: followers,
    detail: `${Math.round(saved)} saved · ${Math.round(playlists)} playlists`,
  };
}

function extractYoutube(data: Record<string, unknown>): SourceProfile {
  const channel = (data.channel || data) as Record<string, unknown>;
  const subs = num(firstDefined(channel, ["subscriberCount", "subscribers.totalCount", "subscribers"]));
  const videos = num(firstDefined(channel, ["videoCount", "videos.totalCount", "videos"]));
  const historyHours = num(dig(data, ["watchHistory.totalHours", "history.totalHours"]));
  return {
    ageYears: 0,
    depth: videos + historyHours / 5,
    standing: subs,
    detail: `${Math.round(videos)} videos · ${Math.round(historyHours)}h watched`,
  };
}

function extractSteam(data: Record<string, unknown>): SourceProfile {
  const games = (data.games || data) as Record<string, unknown>;
  const total = num(firstDefined(games, ["total", "totalCount", "count"]));
  const hours = num(firstDefined(games, ["totalHours", "playtimeForever"]));
  const level = num(dig(data, ["profile.level"]));
  return {
    ageYears: 0,
    depth: total + hours / 20,
    standing: hours / 10 + level * 0.5,
    detail: `${Math.round(total)} games · ${Math.round(hours)}h played`,
  };
}

function extractChatgpt(data: Record<string, unknown>): SourceProfile {
  const conv = (data.conversations || data) as Record<string, unknown>;
  const total = num(firstDefined(conv, ["total", "totalCount", "count"]));
  const first = dig(conv, ["firstConversation", "firstMessageAt", "createdAt"]);
  return {
    ageYears: yearsSince(first && String(first).length <= 7 ? `${first}-01` : first),
    depth: total,
    standing: 0,
    detail: `${Math.round(total)} conversations`,
  };
}

const EXTRACTORS: Record<string, (d: Record<string, unknown>) => SourceProfile> = {
  github: extractGithub,
  instagram: extractInstagram,
  spotify: extractSpotify,
  youtube: extractYoutube,
  steam: extractSteam,
  chatgpt: extractChatgpt,
};

function extract(sourceId: string, data: Record<string, unknown>): SourceProfile {
  const fn = EXTRACTORS[sourceId];
  if (fn) {
    try {
      return fn(data);
    } catch {
      // fall through to generic
    }
  }
  // Generic fallback — try common keys
  const followers = num(firstDefined(data, ["followers", "followers.totalCount", "subscriberCount"]));
  const items = num(firstDefined(data, ["items", "count", "total", "totalCount", "repositories.totalCount"]));
  return {
    ageYears: 0,
    depth: items,
    standing: followers,
    detail: "",
  };
}

// ---------- grade helpers ----------

function gradeFor(total: number): string {
  if (total >= 85) return "S";
  if (total >= 70) return "A";
  if (total >= 55) return "B";
  if (total >= 40) return "C";
  return "D";
}

function verdictFor(total: number, count: number): string {
  if (count === 0) return "Not much to go on yet";
  if (total >= 85) return "A digital legend — this soul is rich, deep and unmistakable";
  if (total >= 70) return "A well-rounded digital self — real substance across platforms";
  if (total >= 55) return "A solid footprint forming — connect more to go deeper";
  if (total >= 40) return "Early days — a few more sources will unlock the full picture";
  return "Just getting started — every connection adds to your soul";
}

function tipsFor(result: { components: ScoreComponent[]; count: number; connected: string[] }): string[] {
  const tips: string[] = [];
  const byKey = Object.fromEntries(result.components.map((c) => [c.key, c]));

  if (result.count === 0) {
    return ["Connect GitHub or YouTube first — both carry the date your account was opened."];
  }
  if (!result.connected.includes("youtube") && !result.connected.includes("github")) {
    tips.push("Connect GitHub or YouTube — they add account age, the biggest score component.");
  }
  if (byKey.corroboration && byKey.corroboration.points < byKey.corroboration.max * 0.5 && result.count >= 2) {
    tips.push("Multiple platforms with matching dates boost Corroboration — add GitHub + YouTube together.");
  }
  if (byKey.depth && byKey.depth.points < byKey.depth.max * 0.5) {
    tips.push("More content = more soul. Spotify saved tracks or Steam games boost depth fast.");
  }
  if (byKey.breadth && result.count < 4) {
    tips.push(`Connect ${4 - result.count} more platform${result.count < 3 ? "s" : ""} for a breadth bonus.`);
  }
  if (byKey.standing && byKey.standing.points < byKey.standing.max * 0.5 && result.count >= 2) {
    tips.push("Social proof (followers/subscribers) is the last unlock — share your mirror to grow it.");
  }
  if (tips.length === 0) {
    tips.push("Your soul is well-connected. Generate your Soul Card and share it!");
  }
  return tips.slice(0, 3);
}

// ---------- main ----------

export function computeSoulScore(identities: IdentityData[]): SoulScoreResult {
  const profiles = identities.map((id) => ({
    source: id.source,
    ...extract(id.source, id.data as Record<string, unknown>),
  }));

  const count = profiles.length;

  // Age — max 40. Best single account age, capped at 10+ years.
  const maxAge = profiles.reduce((m, p) => Math.max(m, p.ageYears), 0);
  const agePoints = Math.round(clamp(maxAge / 10, 0, 1) * 40);
  const ageDetail =
    maxAge > 0
      ? `${maxAge.toFixed(1)} yr old account${profiles.length > 1 ? " (oldest)" : ""}`
      : "Nothing connected yet that carries a date.";

  // Corroboration — max 20. Multiple platforms with age signals that agree.
  // Count sources with ageYears > 0. If ≥2 have similar age (within 2 years), bonus.
  const sourcesWithAge = profiles.filter((p) => p.ageYears > 0);
  let corroborationPoints = 0;
  let corroborationDetail = "Connect GitHub or YouTube: both carry the date the account was opened.";
  if (sourcesWithAge.length >= 2) {
    const ages = sourcesWithAge.map((p) => p.ageYears).sort((a, b) => a - b);
    const medianAge = ages[Math.floor(ages.length / 2)];
    const spread = ages[ages.length - 1] - ages[0];
    if (spread <= 2) {
      corroborationPoints = Math.min(20, sourcesWithAge.length * 7);
      corroborationDetail = `${sourcesWithAge.length} platforms corroborate ~${medianAge.toFixed(0)} yr history.`;
    } else {
      corroborationPoints = Math.min(12, sourcesWithAge.length * 4);
      corroborationDetail = `${sourcesWithAge.length} platforms have dates but differ by ${spread.toFixed(1)} yr.`;
    }
  } else if (sourcesWithAge.length === 1) {
    corroborationPoints = 5;
    corroborationDetail = `One platform (${sourcesWithAge[0].source}) carries an account-opening date.`;
  }

  // Depth — max 20. Log scale: 10 items → ~8pts, 100 → ~15, 1000+ → 20.
  const totalDepth = profiles.reduce((s, p) => s + p.depth, 0);
  const depthPoints = Math.round(clamp(Math.log10(totalDepth + 1) / 3.5, 0, 1) * 20);
  const depthDetail =
    totalDepth > 0
      ? `${Math.round(totalDepth)} items across ${count} source${count > 1 ? "s" : ""}`
      : "Counts the posts, videos, repositories and tracks you have made.";

  // Standing — max 10. Log scale on max social proof metric.
  const maxStanding = profiles.reduce((m, p) => Math.max(m, p.standing), 0);
  const standingPoints = Math.round(clamp(Math.log10(maxStanding + 1) / 5, 0, 1) * 10);
  const standingDetail =
    maxStanding > 0
      ? `Best social proof: ${Math.round(maxStanding)} followers/subscribers`
      : "Other people and organisations treating you as real.";

  // Breadth — max 10. 1 src → 3, 2 → 6, 3 → 9, 4+ → 10.
  const breadthPoints = clamp(count * 3, 0, 10);
  const breadthDetail =
    count > 0 ? `${count} platform${count > 1 ? "s" : ""} connected` : "Independent accounts that back each other up.";

  const components: ScoreComponent[] = [
    { key: "age", label: "Age", points: agePoints, max: 40, detail: ageDetail },
    { key: "corroboration", label: "Corroboration", points: corroborationPoints, max: 20, detail: corroborationDetail },
    { key: "depth", label: "Depth", points: depthPoints, max: 20, detail: depthDetail },
    { key: "standing", label: "Standing", points: standingPoints, max: 10, detail: standingDetail },
    { key: "breadth", label: "Breadth", points: breadthPoints, max: 10, detail: breadthDetail },
  ];

  const total = components.reduce((s, c) => s + c.points, 0);

  return {
    total,
    grade: gradeFor(total),
    verdict: verdictFor(total, count),
    components,
    tips: tipsFor({ components, count, connected: profiles.map((p) => p.source) }),
  };
}

/** Short version for OG images / share text */
export function scoreSummary(result: SoulScoreResult): string {
  return `${result.grade} · ${result.total}/100 — ${result.verdict}`;
}
