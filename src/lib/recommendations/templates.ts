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

/** Deep-unsafe get — safely traverse nested objects. */
function deepGet(obj: unknown, ...keys: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
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
  "Eclectic taste": [
    "Your diversity is your strength — share eclectic mixes to stand out.",
    "Use your range to discover crossover artists others miss.",
  ],
  "Wide palette": [
    "Follow your ear — try one completely new artist per week to keep expanding.",
    "Your top artists show range — curate a 'discoveries' playlist to share.",
  ],
  "Curated library": [
    "Your saved tracks are a mood archive — organize them into themed playlists.",
    "500+ saved tracks is a goldmine — export your top 50 as a shareable list.",
  ],
  // YouTube
  "Binge watcher": [
    "That's a lot of screen time — try curating a 'watch later' list to be more intentional.",
    "Your watch history is a knowledge base — create playlists to organize it.",
  ],
  "Active viewer": [
    "You know what you like — try subscribing to 2-3 new channels outside your comfort zone.",
    "Turn your watch time into output — summarize what you learn in a note or post.",
  ],
  "Knowledge seeker": [
    "You're learning here — consider documenting key takeaways from each educational video.",
    "Turn passive watching into active learning — try one hands-on project per topic.",
  ],
  "Diverse consumer": [
    "100+ subscriptions means broad interests — curate playlists to organize them.",
    "Your feed is rich — try unfollowing 10 channels you no longer watch to sharpen it.",
  ],
  "Content creator": [
    "You create AND consume — your viewer perspective makes your content better.",
    "Consistency is key — try a posting schedule, even bi-weekly, to build momentum.",
  ],
  "Channel starter": [
    "You've started — the first 10 videos are the hardest. Keep going!",
    "Study your first videos' analytics to understand what resonates with viewers.",
  ],
  "Curious mind": [
    "Your interests are wide — try going deep on one topic for a month.",
    "Cross-pollinate — combine two of your interests into a unique project.",
  ],
  // Steam
  "Dedicated gamer": [
    "Gaming is clearly your thing — try streaming or writing reviews to share your expertise.",
    "2000+ hours means deep knowledge — consider creating guides for your top games.",
  ],
  "Serious player": [
    "You invest real time — try setting a goal outside your comfort zone genre.",
    "Your playtime shows commitment — join a community or clan to level up socially.",
  ],
  "Extensive library": [
    "100+ games is a collection — try a 'backlog challenge' to finish what you own.",
    "A big library means options — but try focusing on one game to completion.",
  ],
  "Diverse library": [
    "You explore genres — try a 'game of the month' to go deep on one pick.",
    "Diversity is fun — but sometimes mastery of one genre is more rewarding.",
  ],
  "Well-rounded player": [
    "You enjoy variety — try a genre you haven't touched yet this year.",
    "A well-rounded gamer has stories to tell — share your experiences in reviews.",
  ],
  "Genre specialist": [
    "You have a clear favorite — try the best-rated game in your genre that you haven't played.",
    "Deep expertise in one genre — consider writing reviews or guides for it.",
  ],
  "Social gamer": [
    "50+ friends means a strong social circle — organize a game night or tournament.",
    "Gaming is your social hub — try co-op games to deepen friendships.",
  ],
  "Signature game": [
    "Your most-played game shows dedication — try mastering it at a competitive level.",
    "Deep investment in one game — share your expertise in a community or guide.",
  ],
  // ChatGPT
  "Power user": [
    "500+ conversations means AI is your co-pilot — try building a custom GPT for your workflow.",
    "You're getting maximum value — try chaining prompts for complex multi-step tasks.",
  ],
  "Regular user": [
    "You're comfortable with AI — try more advanced techniques like few-shot prompting.",
    "Try saving your best prompts as templates to reuse across projects.",
  ],
  "Getting started with AI": [
    "You're exploring — try asking ChatGPT to help with one specific project this week.",
    "Start simple — use AI for brainstorming, then gradually move to more complex tasks.",
  ],
  "AI-native thinker": [
    "Daily AI usage means it's a habit — try using it for creative tasks, not just productivity.",
    "You think with AI — try teaching someone else your prompting approach.",
  ],
  "Versatile user": [
    "You use AI for everything — try going deep on one use case to master it.",
    "Versatility is great — consider creating prompt templates for each topic.",
  ],
  "Early adopter": [
    "You were there early — your experience is valuable, consider sharing it in a blog.",
    "Early adopters shape tools — your feedback to OpenAI could influence features.",
  ],
  "Customized experience": [
    "You've personalized your AI — try adding more memories about your goals.",
    "Customization is key — review your memories quarterly to keep them relevant.",
  ],
  // LinkedIn
  "Well-connected": [
    "500+ connections is a strong network — try reaching out to 5 dormant connections this week.",
    "Your network is your net worth — share an insight post to add value to it.",
  ],
  "Building network": [
    "100+ connections is a good start — try sending 3-5 connection requests weekly.",
    "Engage with your network — comment on 2 posts per day to stay visible.",
  ],
  "Seasoned professional": [
    "5+ roles shows a rich career — try writing a LinkedIn article about your journey.",
    "Your experience is an asset — consider mentoring juniors in your field.",
  ],
  "Experienced professional": [
    "Solid career progression — try updating your 'About' section with your latest achievements.",
    "Your experience tells a story — make sure your headline reflects your current focus.",
  ],
  "Skill builder": [
    "7+ skills listed — try getting endorsements for your top 3 skills this month.",
    "Your skills show range — consider taking a skill assessment to validate them.",
  ],
  "Multi-skilled": [
    "A versatile toolkit — try highlighting your top 3 skills in your headline.",
    "Multiple skills = flexibility — focus on one to become known for it.",
  ],
  "Emerging leader": [
    "100+ followers means people listen — try posting weekly to build thought leadership.",
    "Your voice matters — share one industry insight per week to grow your following.",
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
        const subs = fmt(num(d.subscribers ?? d.subscriber_count ?? deepGet(d, "channel", "subscriberCount")));
        const watchHrs = fmt(num(d.watch_hours ?? d.total_hours ?? deepGet(d, "watchHistory", "totalHours")));
        return `▶️ ${top.title} — ${name === "you" ? "your channel has" : `channel ${name} has`} ${subs} subscribers, ${watchHrs} hours watched.`;
      }
      case "steam": {
        const games = fmt(num(d.games ?? d.games_count ?? deepGet(d, "games", "total")));
        const hours = fmt(num(d.playtime_hours ?? d.playtime ?? deepGet(d, "games", "totalHours")));
        return `🎮 ${top.title} — ${possess(name)} ${games} games, ${hours} hours played.`;
      }
      case "chatgpt": {
        const total = fmt(num(d.conversations_total ?? d.total_conversations ?? deepGet(d, "conversations", "total")));
        return `🤖 ${top.title} — ${name === "you" ? "you have" : `${name} has`} ${total} AI conversations.`;
      }
      case "linkedin": {
        const connections = fmt(num(d.connections ?? d.connection_count ?? deepGet(d, "profile", "connections")));
        const skills = Array.isArray(d.skills) ? d.skills.length : 0;
        return `💼 ${top.title} — ${possess(name)} ${connections} connections${skills ? ` and ${skills} skills` : ""}.`;
      }
      default:
        return `${top.title} — your profile looks interesting.`;
    }
  })();

  const actionPool = ACTIONS[top.title] ?? FALLBACK_ACTIONS;
  const seed = data.sourceId.length * 31 + top.strength * 7 + top.title.length;
  const action = pickStable(actionPool, seed);

  return `${opener}\n${action}`;
}