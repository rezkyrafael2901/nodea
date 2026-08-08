// Rule engine — pure functions mapping source data → verified insights.
// FACT SOURCE OF TRUTH: insights derived here are never modified by the LLM.

import type { Insight, FactItem, SourceData, SourceId } from "./types";

export const SUPPORTED_SOURCES: SourceId[] = ["github", "instagram", "spotify", "youtube", "steam", "chatgpt", "linkedin"];

export function isSupportedSource(id: string): id is SourceId {
  return (SUPPORTED_SOURCES as string[]).includes(id);
}

/** Numeric helper — safe parse of unknown values from Vana payloads. */
function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function fmt(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function yearsSince(iso?: unknown): number {
  if (typeof iso !== "string") return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

function strengthFrom(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 45) return 3;
  if (score >= 20) return 2;
  return 1;
}

// Emoji per insight kind (kept in sync with traits.ts ids)
const EMOJI: Record<string, string> = {
  github: "💻",
  instagram: "📸",
  spotify: "🎵",
  youtube: "▶️",
  steam: "🎮",
  chatgpt: "🤖",
  linkedin: "💼",
};

function insight(
  id: string,
  title: string,
  narrative: string,
  strength: number,
  facts: FactItem[],
): Insight {
  return {
    id,
    title,
    emoji: EMOJI[id] ?? "✨",
    narrative,
    strength,
    evidence: facts.map((f) => f.label),
    facts,
  };
}

// ------------------------------------------------
// GitHub — github.profile / repositories
// ------------------------------------------------
export function analyzeGitHub(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const repos = num(d.public_repos ?? d.repos);
  const stars = num(d.total_stars ?? d.stars ?? d.stargazers_count);
  const followers = num(d.followers);
  const years = yearsSince(d.created_at ?? d.createdAt);

  const facts: FactItem[] = [
    { label: `${fmt(repos)} public repos`, value: repos },
    { label: `${fmt(stars)} total stars`, value: stars },
    { label: `${fmt(followers)} followers`, value: followers },
  ];
  if (years >= 1) facts.push({ label: `${Math.round(years)} years active`, value: Math.round(years) });

  const insights: Insight[] = [];

  if (repos >= 20) {
    insights.push(
      insight("github", "Active open-source contributor", `${repos} public repos — you consistently ship code in public.`, strengthFrom(repos * 2), facts),
    );
  } else if (repos >= 5) {
    insights.push(insight("github", "Building in public", `${repos} public repos — you're getting used to publishing your work.`, 3, facts));
  } else if (repos > 0) {
    insights.push(insight("github", "Getting Started", `${repos} repos — big potential, just needs consistency.`, 2, facts));
  } else {
    insights.push(insight("github", "New on GitHub", "No public repos yet — this is a great starting point.", 1, facts));
  }

  if (stars >= 100) {
    insights.push(insight("github", "Loved by the community", `${fmt(stars)} total stars — people are actually using your work.`, strengthFrom(stars), facts));
  } else if (stars >= 10) {
    insights.push(insight("github", "Gaining traction", `${fmt(stars)} stars — you're starting to get noticed.`, 2, facts));
  }

  if (followers >= 50) {
    insights.push(insight("github", "Community builder", `${fmt(followers)} people follow you — they're waiting for your next move.`, 3, facts));
  }

  return insights;
}

// ------------------------------------------------
// Instagram — instagram.profile
// ------------------------------------------------
export function analyzeInstagram(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const followers = num(d.followers ?? d.follower_count);
  const posts = num(d.posts ?? d.posts_count ?? d.media_count);
  const verified = d.is_verified === true || d.is_verified === "true";

  const facts: FactItem[] = [
    { label: `${fmt(followers)} followers`, value: followers },
    { label: `${fmt(posts)} posts`, value: posts },
  ];
  if (verified) facts.push({ label: "Verified", value: true });

  const insights: Insight[] = [];

  if (followers >= 10000) {
    insights.push(insight("instagram", "Micro-influencer", `${fmt(followers)} followers — you're on the radar of brands.`, 4, facts));
  } else if (followers >= 1000) {
    insights.push(insight("instagram", "Growing audience", `${fmt(followers)} followers — a solid base.`, 3, facts));
  } else {
    insights.push(insight("instagram", "Building presence", `${fmt(followers)} followers — early days, but consistency is key.`, 2, facts));
  }

  if (posts >= 200) {
    insights.push(insight("instagram", "Consistent creator", `${fmt(posts)} posts — steady output. Try expanding to Reels for wider reach.`, 4, facts));
  } else if (posts >= 50) {
    insights.push(insight("instagram", "Committed poster", `${fmt(posts)} posts — you're building a consistent rhythm.`, 3, facts));
  }

  if (verified) {
    insights.push(insight("instagram", "Verified presence", "Verified account — high credibility.", 5, facts));
  }

  return insights;
}

// ------------------------------------------------
// Spotify — spotify.profile / top artists / genres
// ------------------------------------------------
export function analyzeSpotify(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const topGenres = Array.isArray(d.top_genres) ? (d.top_genres as string[]) : [];
  const topArtists = Array.isArray(d.top_artists) ? (d.top_artists as string[]) : [];
  const hours = num(d.listening_hours ?? d.total_listening_hours);
  const followers = num(d.followers);

  const facts: FactItem[] = [];
  if (topGenres.length) facts.push({ label: `Top genres: ${topGenres.slice(0, 3).join(", ")}`, value: topGenres.slice(0, 3).join(", ") });
  if (topArtists.length) facts.push({ label: `Top artists: ${topArtists.slice(0, 3).join(", ")}`, value: topArtists.slice(0, 3).join(", ") });
  if (hours > 0) facts.push({ label: `${fmt(hours)} hours listening`, value: Math.round(hours) });
  if (followers > 0) facts.push({ label: `${fmt(followers)} followers`, value: followers });

  const insights: Insight[] = [];

  if (hours >= 500) {
    insights.push(insight("spotify", "Deep listener", `${fmt(hours)} hours listening — music isn't background, it's a need.`, hours >= 2000 ? 5 : 4, facts));
  } else if (hours >= 100) {
    insights.push(insight("spotify", "Committed listener", `${fmt(hours)} hours a year — music is always there for you.`, 3, facts));
  }

  if (topGenres.length) {
    const g = topGenres.slice(0, 3).join(", ");
    insights.push(insight("spotify", "Genre explorer", `Dominant in ${g} — you have a clear taste.`, topGenres.length >= 3 ? 4 : 3, facts));
  }

  return insights;
}

// ------------------------------------------------
// Router
// ------------------------------------------------
const ANALYZERS: Record<string, (data: SourceData) => Insight[]> = {
  github: analyzeGitHub,
  instagram: analyzeInstagram,
  spotify: analyzeSpotify,
};

export function analyzeSource(data: SourceData): Insight[] {
  const fn = ANALYZERS[data.sourceId];
  if (!fn) return [];
  try {
    return fn(data);
  } catch {
    return [];
  }
}

/** Signature for memoization/caching — data fingerprint */
export function signatureFor(data: SourceData): string {
  try {
    return `${data.sourceId}:${JSON.stringify(data)}`;
  } catch {
    return `${data.sourceId}:${Date.now()}`;
  }
}