// Trait system — derived from connected source combinations.
// Each trait requires a set of sources; richer combos unlock rarer traits.
// Pure functions, no deps — safe for client + server.

export interface Trait {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** source ids that unlock this trait */
  requires: string[];
  /** rarity for display ordering */
  rarity: "common" | "rare" | "epic";
}

// Base trait pool — one per source (always shown when source connected)
const BASE_TRAITS: Trait[] = [
  { id: "github", name: "Builder", emoji: "💻", desc: "Code-first thinker", requires: ["github"], rarity: "common" },
  { id: "instagram", name: "Visual Storyteller", emoji: "📸", desc: "Lives in the feed", requires: ["instagram"], rarity: "common" },
  { id: "chatgpt", name: "AI Native", emoji: "🤖", desc: "Talks to machines daily", requires: ["chatgpt"], rarity: "common" },
  { id: "spotify", name: "Tastemaker", emoji: "🎵", desc: "Soundtrack to everything", requires: ["spotify"], rarity: "common" },
  { id: "youtube", name: "Binge Curator", emoji: "▶️", desc: "Queue is never empty", requires: ["youtube"], rarity: "common" },
  { id: "steam", name: "Gamer", emoji: "🎮", desc: "XP is a lifestyle", requires: ["steam"], rarity: "common" },
];

// Combo traits — unlocked when ALL sources in `requires` are connected
const COMBO_TRAITS: Trait[] = [
  { id: "full-stacker", name: "Full Stacker", emoji: "⚡", desc: "Code + AI = shipped", requires: ["github", "chatgpt"], rarity: "rare" },
  { id: "culture-vulture", name: "Culture Vulture", emoji: "🦅", desc: "Ears + eyes on everything", requires: ["spotify", "youtube"], rarity: "rare" },
  { id: "creator-core", name: "Creator Core", emoji: "✨", desc: "Makes AND consumes", requires: ["instagram", "youtube"], rarity: "rare" },
  { id: "play-hard", name: "Play Hard", emoji: "🎯", desc: "Grind in-game, grind IRL", requires: ["steam", "github"], rarity: "rare" },
  { id: "digital-native", name: "Digital Native", emoji: "🧬", desc: "Born in the machine", requires: ["chatgpt", "instagram"], rarity: "rare" },
  { id: "aesthetic-machine", name: "Aesthetic Machine", emoji: "🎨", desc: "Vibes on every channel", requires: ["instagram", "spotify"], rarity: "rare" },
  { id: "multiplayer-life", name: "Multiplayer Life", emoji: "👥", desc: "Solo queue? Never", requires: ["steam", "instagram"], rarity: "rare" },
  { id: "polymath", name: "Polymath", emoji: "🧠", desc: "Code, music, play, talk", requires: ["github", "spotify", "steam"], rarity: "epic" },
  { id: "omni-channel", name: "Omni-Channel", emoji: "🌐", desc: "Every platform, one identity", requires: ["github", "instagram", "spotify", "youtube", "steam", "chatgpt"], rarity: "epic" },
];

export function getTraits(sources: string[]): Trait[] {
  const set = new Set(sources);
  const unlocked: Trait[] = [];
  for (const t of BASE_TRAITS) if (set.has(t.id)) unlocked.push(t);
  for (const t of COMBO_TRAITS) if (t.requires.every((r) => set.has(r))) unlocked.push(t);
  // sort: epic → rare → common, then by requires length (richer combos first)
  const order: Record<Trait["rarity"], number> = { epic: 0, rare: 1, common: 2 };
  return unlocked.sort((a, b) => {
    if (order[a.rarity] !== order[b.rarity]) return order[a.rarity] - order[b.rarity];
    return b.requires.length - a.requires.length;
  });
}

/** Top trait to feature on the OG card (epic > rare > common, richest combo first) */
export function getTopTrait(sources: string[]): Trait | null {
  const t = getTraits(sources);
  return t[0] ?? null;
}
