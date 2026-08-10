// Hybrid recommendation engine.
// Flow: analyzeSource (rules, pure) → buildFallback (templates) → narrator (optional LLM).
// If narrator fails or is not configured, finalNarrative = fallbackNarrative.

import type { Insight, Recommendation, SourceData, FactItem } from "./types";
import { analyzeSource, signatureFor } from "./rules";
import { buildFallback } from "./templates";
import { narrate, narratorConfigured } from "./narrator";

export interface EngineOptions {
  /** force skip LLM (e.g. for tests or free tier) */
  noLlm?: boolean;
  /** true when caller wants a fresh LLM attempt even if cached */
  refresh?: boolean;
}

const cache = new Map<string, Recommendation>();

export async function getRecommendations(
  data: SourceData,
  opts: EngineOptions = {},
): Promise<Recommendation> {
  const sig = signatureFor(data);
  if (!opts.refresh && cache.has(sig)) return cache.get(sig)!;

  const insights = analyzeSource(data);
  const fallbackNarrative = buildFallback(data, insights);

  const rec: Recommendation = {
    sourceId: data.sourceId,
    insights,
    fallbackNarrative,
    finalNarrative: fallbackNarrative,
    enhanced: false,
    signature: sig,
  };

  const canLlm = !opts.noLlm && narratorConfigured();
  if (canLlm) {
    try {
      const narrated = await narrate(data.sourceId, insights);
      rec.finalNarrative = narrated;
      rec.enhanced = true;
    } catch (e) {
      // silence — fallback already set
      console.warn(`[recommendations] narrator skipped for ${data.sourceId}:`, (e as Error).message, (e as Error).stack?.split("\n")[1]);
    }
  }

  cache.set(sig, rec);
  return rec;
}

/** Sync path (no LLM) — safe for client components & SSR. */
export function getRecommendationsSync(data: SourceData): Recommendation {
  const insights = analyzeSource(data);
  const fallback = buildFallback(data, insights);
  return {
    sourceId: data.sourceId,
    insights,
    fallbackNarrative: fallback,
    finalNarrative: fallback,
    enhanced: false,
    signature: signatureFor(data),
  };
}

export function summarizeInsights(insights: Insight[]): string {
  return insights.map((i) => `${i.title} (${i.strength}/5)`).join(", ") || "Belum ada insight";
}

/**
 * Build a Pathfit-style identity card from all insights across all sources.
 * Picks the strongest insight as "primary archetype", next two as alternatives.
 * Returns a structured card — NOT a copy of Pathfit, adapted for multi-source Nodea.
 */
export interface IdentityCard {
  primaryArchetype: {
    title: string;
    emoji: string;
    tagline: string;
    fitRationale: string;
    source: string;
  };
  alternatives: {
    title: string;
    emoji: string;
    source: string;
  }[];
  allFacts: FactItem[];
}

export function buildIdentityCard(allInsights: { source: string; insights: Insight[] }[]): IdentityCard | null {
  // Flatten all insights with their source, sort by strength desc
  const flat = allInsights
    .flatMap(({ source, insights }) => insights.map((i) => ({ ...i, source })))
    .sort((a, b) => b.strength - a.strength);

  if (flat.length === 0) return null;

  const top = flat[0];
  const alts = flat.slice(1, 3);

  // Generate crafted tagline + rationale (Pathfit-style)
  const tagline = generateTagline(top);
  const fitRationale = generateFitRationale(top, top.source);

  // Collect all facts from all insights
  const allFacts = flat.flatMap((i) => i.facts);

  return {
    primaryArchetype: {
      title: top.title,
      emoji: top.emoji,
      tagline,
      fitRationale,
      source: top.source,
    },
    alternatives: alts.map((a) => ({
      title: a.title,
      emoji: a.emoji,
      source: a.source,
    })),
    allFacts,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PERSONALITY TABLE — crafted taglines + rationales per insight title.
// Mirrors Pathfit's editorial quality: personality statements, not data points.
// ────────────────────────────────────────────────────────────────────────────

const PERSONALITY: Record<string, { tagline: string; rationale: string }> = {
  // ── GitHub ──
  "Active open-source contributor": {
    tagline: "Ships code where everyone can see it.",
    rationale: "Consistent, visible, and unafraid — the kind of person who builds in the open because that's simply how they work.",
  },
  "Building in public": {
    tagline: "Learning out loud, one repo at a time.",
    rationale: "Getting comfortable with visibility — someone who's choosing to let the world watch them grow.",
  },
  "Getting Started": {
    tagline: "Early chapters, big potential.",
    rationale: "Just beginning but already showing up — the consistency hasn't formed yet, but the instinct is right.",
  },
  "New on GitHub": {
    tagline: "Fresh start, blank slate.",
    rationale: "No public work yet — this is ground zero, and the first move is always the hardest.",
  },
  "Loved by the community": {
    tagline: "Makes things people actually use.",
    rationale: "Stars aren't vanity — they mean real people depend on your code. That's trust earned, not claimed.",
  },
  "Gaining traction": {
    tagline: "Starting to get noticed.",
    rationale: "The work is reaching people — small numbers now, but the slope is the right direction.",
  },
  "Community builder": {
    tagline: "People follow you for what's next.",
    rationale: "A following means expectations — you're someone whose next move matters to others.",
  },
  "Consistent contributor": {
    tagline: "Code is a daily habit, not a phase.",
    rationale: "Thousands of contributions means showing up is automatic — this is discipline, not motivation.",
  },
  "Regular contributor": {
    tagline: "Steady progress, no drama.",
    rationale: "Not chasing streaks or spikes — just reliable, dependable output that compounds over time.",
  },
  "On a roll": {
    tagline: "Momentum is real right now.",
    rationale: "A long streak means you're in flow — the hardest part isn't starting, it's not stopping.",
  },
  "Polyglot developer": {
    tagline: "Speaks more than one language fluently.",
    rationale: "Multiple languages means adaptability — you choose the right tool, not just the familiar one.",
  },
  // ── Instagram ──
  "Micro-influencer": {
    tagline: "Brands are watching, and you know it.",
    rationale: "Five digits of followers means real influence — the question is what you do with the attention.",
  },
  "Growing audience": {
    tagline: "A solid base that's still climbing.",
    rationale: "Not viral, not invisible — the steady middle where real communities form.",
  },
  "Building presence": {
    tagline: "Early days, but showing up.",
    rationale: "Small numbers don't mean small potential — consistency is the only variable that matters now.",
  },
  "Verified presence": {
    tagline: "The checkmark says it all.",
    rationale: "Verified means credibility — not just anyone gets the badge, and you earned it.",
  },
  "Consistent creator": {
    tagline: "Posts like clockwork.",
    rationale: "Two hundred plus posts means you've outlasted the inspiration phase — this is a habit now.",
  },
  "Committed poster": {
    tagline: "Finding a rhythm that works.",
    rationale: "Showing up regularly — not every day, but enough that the pattern is readable.",
  },
  "Engaging content": {
    tagline: "People respond when you post.",
    rationale: "High engagement means your audience isn't just following — they're listening.",
  },
  "Niche curator": {
    tagline: "A clear aesthetic, not a random feed.",
    rationale: "Consistent themes mean intentionality — you know what your brand is, even if you'd never call it that.",
  },
  // ── Spotify ──
  "Deep listener": {
    tagline: "Music isn't background — it's a need.",
    rationale: "Hundreds of hours means music is woven into your daily architecture, not just something that plays.",
  },
  "Committed listener": {
    tagline: "Music is always there for you.",
    rationale: "Consistent listening — not obsessive, but dependable. Soundtracks your life without commanding it.",
  },
  "Genre explorer": {
    tagline: "A clear taste, not a random shuffle.",
    rationale: "Dominant genres mean you know what you like — the algorithm isn't guessing, and neither are you.",
  },
  "Eclectic taste": {
    tagline: "Range that surprises people.",
    rationale: "High diversity means you follow your ear wherever it goes — no genre gatekeeping, just curiosity.",
  },
  "Wide palette": {
    tagline: "Follows the ear, not the trend.",
    rationale: "Many top artists means broad taste — you're not loyal to one sound, you're loyal to good music.",
  },
  "Curated library": {
    tagline: "A personal archive of moods.",
    rationale: "Hundreds of saved tracks means you treat music like a collection — organized, intentional, and yours.",
  },
  // ── YouTube ──
  "Binge watcher": {
    tagline: "YouTube is your main screen.",
    rationale: "Thousands of hours means YouTube isn't supplementary — it's where you actually spend your attention.",
  },
  "Active viewer": {
    tagline: "Knows the way around the platform.",
    rationale: "Hundreds of hours means you're not a casual clicker — you have patterns and preferences.",
  },
  "Knowledge seeker": {
    tagline: "Learns here, not just watches.",
    rationale: "Educational content in your top categories means you use YouTube as a classroom, not just entertainment.",
  },
  "Diverse consumer": {
    tagline: "A broad content diet.",
    rationale: "A hundred plus subscriptions means you cast a wide net — variety is the point, not a side effect.",
  },
  "Content creator": {
    tagline: "Creates, not just consumes.",
    rationale: "Publishing videos means you're on the other side of the screen — that takes courage the audience never sees.",
  },
  "Channel starter": {
    tagline: "Just getting started as a creator.",
    rationale: "A few videos in — the hardest part. Most people quit here; the ones who don't, build something.",
  },
  "Curious mind": {
    tagline: "Wide-ranging interests, no single lane.",
    rationale: "Following many topics means you're not specializing — and that's a strength, not a flaw.",
  },
  // ── Steam ──
  "Dedicated gamer": {
    tagline: "Gaming is a core part of your life.",
    rationale: "Two thousand plus hours means this isn't a hobby — it's part of your identity and routine.",
  },
  "Serious player": {
    tagline: "Real time, real investment.",
    rationale: "Hundreds of hours means you finish what you start — you don't just try games, you commit to them.",
  },
  "Extensive library": {
    tagline: "A collector's mindset.",
    rationale: "A hundred plus games means you buy for possibility, not just intention — your library is a mood board.",
  },
  "Diverse library": {
    tagline: "Explores genres, not just titles.",
    rationale: "Variety means you're not locked into one type of experience — you play broadly and curiously.",
  },
  "Well-rounded player": {
    tagline: "Variety is your style.",
    rationale: "Multiple genres explored means you're comfortable everywhere — no single lane defines you.",
  },
  "Genre specialist": {
    tagline: "A clear favorite, played deep.",
    rationale: "Leaning hard into one genre means you value mastery over variety — and that's how expertise forms.",
  },
  "Social gamer": {
    tagline: "Gaming is your social hub.",
    rationale: "Fifty plus friends means you play with people, not just alone — games are your shared language.",
  },
  "Signature game": {
    tagline: "One game, deeply invested.",
    rationale: "A clear most-played means you found your game — the one you return to when nothing else hits the same.",
  },
  // ── ChatGPT ──
  "Power user": {
    tagline: "AI is part of your daily workflow.",
    rationale: "Five hundred plus conversations means you've moved past experimentation — AI is a tool you actually depend on.",
  },
  "Regular user": {
    tagline: "Knows how to prompt well.",
    rationale: "A hundred plus conversations means you've found your rhythm with AI — not a power user, but no longer a beginner.",
  },
  "Getting started with AI": {
    tagline: "Exploring what AI can do.",
    rationale: "Small numbers mean curiosity, not commitment — you're testing whether this tool earns a place in your life.",
  },
  "AI-native thinker": {
    tagline: "AI is your default thinking partner.",
    rationale: "Daily usage means you don't reach for AI — you start there. It's the first tool, not the fallback.",
  },
  "Versatile user": {
    tagline: "From one topic to another, fluidly.",
    rationale: "Many topics means you use AI as a general-purpose thinking tool — not specialized, but adaptable.",
  },
  "Early adopter": {
    tagline: "Ahead of the curve.",
    rationale: "Starting early means you were curious when others weren't — that instinct is its own kind of intelligence.",
  },
  "Customized experience": {
    tagline: "Personalized, not generic.",
    rationale: "Saving memories means you've shaped the tool to fit you — not the other way around.",
  },
  // ── LinkedIn ──
  "Well-connected": {
    tagline: "A strong professional network.",
    rationale: "Five hundred plus connections means you've invested in relationships — your network isn't big, it's solid.",
  },
  "Building network": {
    tagline: "Growing steadily.",
    rationale: "A hundred plus connections means you're past the initial push — now it's about depth, not just numbers.",
  },
  "Seasoned professional": {
    tagline: "A rich career journey.",
    rationale: "Five plus roles means you've been around — not just time served, but different contexts that shaped you.",
  },
  "Experienced professional": {
    tagline: "Solid career progression.",
    rationale: "Multiple roles means steady growth — not job-hopping, but intentional movement forward.",
  },
  "Skill builder": {
    tagline: "A versatile toolkit with clear strengths.",
    rationale: "Seven plus skills means you've invested in range — but the top ones show where you're actually sharp.",
  },
  "Multi-skilled": {
    tagline: "A versatile toolkit.",
    rationale: "Multiple skills means flexibility — you can contribute in more than one way, which is its own form of value.",
  },
  "Emerging leader": {
    tagline: "People listen when you speak.",
    rationale: "A hundred plus followers means your voice carries — not because of a title, but because of what you say.",
  },
};

// Per-source data description for the "matched from" suffix.
// Mirrors Pathfit's "matched from the accounting and financial-reporting language already in your headline and about section."
const SOURCE_DATA_DESC: Record<string, string> = {
  github: "your public repositories, stars, and contribution activity",
  instagram: "your followers, posts, and engagement rate",
  spotify: "your listening hours, top genres, and saved tracks",
  youtube: "your watch history, subscriptions, and channel activity",
  steam: "your playtime, game library, and genre breakdown",
  chatgpt: "your conversation count, topics, and usage frequency",
  linkedin: "your connections, experience entries, and listed skills",
};

/** Generate a crafted personality tagline from the insight title. */
function generateTagline(insight: Insight): string {
  const p = PERSONALITY[insight.title];
  if (p) return p.tagline;
  // Fallback: use narrative first clause, lowercased
  const narrative = insight.narrative;
  const dashIdx = narrative.indexOf("—");
  const periodIdx = narrative.indexOf(".");
  let cutAt = narrative.length;
  if (dashIdx > 0 && dashIdx < cutAt) cutAt = dashIdx;
  if (periodIdx > 0 && periodIdx < cutAt) cutAt = periodIdx;
  const essence = narrative.slice(0, cutAt).trim();
  return essence.charAt(0).toLowerCase() + essence.slice(1);
}

/** Build a Pathfit-style rationale: personality description + "matched from {data} already in your connected data." */
function generateFitRationale(insight: Insight, source?: string): string {
  const p = PERSONALITY[insight.title];
  const desc = source ? (SOURCE_DATA_DESC[source] ?? "your activity patterns") : "your activity patterns";
  if (p) {
    return `${p.rationale} — matched from ${desc} already in your connected data.`;
  }
  // Fallback: use narrative as rationale
  return `${insight.narrative} — matched from ${desc} already in your connected data.`;
}

/**
 * Build a per-source identity card from a single source's insights.
 * Same Pathfit-style format: primary archetype + tagline + fit rationale + alternatives.
 * Alternatives are the remaining insights from this source (not from other sources).
 */
export function buildSourceIdentityCard(source: string, insights: Insight[]): IdentityCard | null {
  if (insights.length === 0) return null;

  // Sort by strength desc
  const sorted = [...insights].sort((a, b) => b.strength - a.strength);
  const top = sorted[0];
  const alts = sorted.slice(1, 3); // next 2 as alternatives

  const tagline = generateTagline(top);
  const fitRationale = generateFitRationale(top, source);
  const allFacts = sorted.flatMap((i) => i.facts);

  return {
    primaryArchetype: {
      title: top.title,
      emoji: top.emoji,
      tagline,
      fitRationale,
      source,
    },
    alternatives: alts.map((a) => ({
      title: a.title,
      emoji: a.emoji,
      source,
    })),
    allFacts,
  };
}