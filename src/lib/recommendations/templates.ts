// Fallback narrative templates — used when LLM narrator is unavailable/offline.
// Deterministic, zero-cost, decent quality. LLM only polishes these.

import type { Insight, SourceData } from "./types";

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

function pickStable<T>(arr: T[], seed: number): T {
  if (!arr.length) throw new Error("empty array");
  return arr[Math.abs(seed) % arr.length];
}

// Actionable follow-up lines per insight label — the "feels helped" part.
const ACTIONS: Record<string, string[]> = {
  "Active open-source contributor": [
    "Consider becoming a maintainer of your flagship project — it's the natural next step.",
    "Start a technical blog from your coding experience; 1 post/month is enough.",
  ],
  "Loved by the community": [
    "Your work is being used by real people — a great time to clean up the docs.",
    "This is a big asset — start speaking at events or teaching your community.",
  ],
  "Building in public": [
    "Keep shipping — one new repo per month makes your pattern easier to read.",
    "Write a storytelling README so hiring managers get hooked.",
  ],
  "Getting Started": [
    "Just stay consistent — 1 commit a day beats one big sprint.",
    "Pick one small project you use daily and open up its source.",
  ],
  "New on GitHub": [
    "This is a great starting point — publish your first small project this month.",
    "Fork an interesting repo and add a small feature; it's the fastest way to learn.",
  ],
  "Gaining traction": [
    "Traction is growing — polish one flagship repo to make it your main portfolio piece.",
    "Share progress on LinkedIn/X — people love seeing the journey, not just the result.",
  ],
  "Community builder": [
    "Your followers are waiting for your work — publish a public roadmap so they can follow along.",
    "Open GitHub Discussions on your flagship repo.",
  ],
  "Growing audience": [
    "Your audience is getting solid — try being more interactive in stories to boost engagement.",
    "Posting 3x/week could double your followers in 6 months.",
  ],
  "Committed poster": [
    "You're building a rhythm — bump frequency gradually, don't overdo it at once.",
    "Try 1 post/week consistently first, then evaluate after a month.",
  ],
  "Building presence": [
    "You're early but consistency is key — don't compare yourself to accounts that have been around longer.",
    "Focus on one niche so the algorithm and your audience understand who you are.",
  ],
  "Verified presence": [
    "Verified account — high credibility. Leverage it for collaborations.",
  ],
  "Micro-influencer": [
    "You're on brand radar now — prep a simple media kit so you can negotiate.",
    "Stay niche: a relevant 10k audience beats a scattered 100k.",
  ],
  "Consistent creator": [
    "Consistency is your weapon — expand to Reels for wider reach.",
    "Use your follower insights to create content that connects more.",
  ],
  "Deep listener": [
    "Your music taste is sharp — try collaborative playlists and share your discoveries.",
    "Your listening hours are high, meaning music is your main mood booster.",
  ],
  "Committed listener": [
    "Music always has your back — consider a monthly themed playlist to document your moods.",
    "Explore new genres little by little to keep your taste rich.",
  ],
  "Genre explorer": [
    "Your taste is clear — this week's tip: explore 1–2 new genres to go even deeper.",
    "Try building a curated themed playlist — it could become your personal brand.",
  ],
};

const FALLBACK_ACTIONS = [
  "Just stay consistent — your pattern is already visible and just needs sharpening.",
  "Next level: pick one focus and go deeper next month.",
  "Your data is starting to show a pattern — keep the rhythm and level up slowly.",
];

export function buildFallback(data: SourceData, insights: Insight[]): string {
  const d = data as unknown as Record<string, unknown>;
  const top = insights[0];
  if (!top) return "Hmm, not enough data yet to read your patterns. Connect another source to complete the picture.";

  const name =
    typeof d.name === "string" && d.name
      ? String(d.name).split(" ")[0]
      : typeof d.login === "string"
        ? String(d.login)
        : "you";

  const possess = (n: string) => (n === "you" ? `${n} have` : `${n} has`);
  const nameGen = (n: string) => (n === "you" ? "your" : `${n}'s`);

  const opener = (() => {
    switch (data.sourceId) {
      case "github": {
        const repos = fmt(num(d.public_repos ?? d.repos));
        const stars = fmt(num(d.total_stars ?? d.stars ?? d.stargazers_count));
        return `🛠️ ${top.title} — ${possess(name)} ${repos} public repos with ${stars} total stars.`;
      }
      case "instagram": {
        const followers = fmt(num(d.followers ?? d.follower_count));
        const posts = fmt(num(d.posts ?? d.posts_count ?? d.media_count));
        return `📸 ${top.title} — ${possess(name)} ${followers} followers across ${posts} posts.`;
      }
      case "spotify": {
        const hours = fmt(num(d.listening_hours ?? d.total_listening_hours));
        const genres = Array.isArray(d.top_genres) ? (d.top_genres as string[]).slice(0, 2).join(", ") : "";
        return `🎵 ${top.title} — ${name} listened to music for ${hours} hours${genres ? `, dominated by ${genres}` : ""}.`;
      }
      case "youtube": {
        const subs = fmt(num(d.subscribers ?? d.subscriber_count));
        return `▶️ ${top.title} — ${name === "you" ? "your channel has" : `channel ${name} has`} ${subs} subscribers.`;
      }
      case "steam": {
        const games = fmt(num(d.games ?? d.games_count));
        const hours = fmt(num(d.playtime_hours ?? d.playtime));
        return `🎮 ${top.title} — ${possess(name)} ${games} games, ${hours} hours played.`;
      }
      case "chatgpt":
        return `🤖 ${top.title} — ${name === "you" ? "you really lean on AI" : `${name} really leans on AI`} to get work done.`;
      case "linkedin":
        return `💼 ${top.title} — ${nameGen(name)} professional profile is solid.`;
      default:
        return `${top.title} — your profile looks interesting.`;
    }
  })();

  const actionPool = ACTIONS[top.title] ?? FALLBACK_ACTIONS;
  const seed = data.sourceId.length * 31 + top.strength * 7 + top.title.length;
  const action = pickStable(actionPool, seed);

  return `${opener}\n${action}`;
}