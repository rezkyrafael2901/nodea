// Rule engine — pure functions mapping source data → verified insights.
// FACT SOURCE OF TRUTH: insights derived here are never modified by the LLM.
// Handles both flat Vana API format AND nested mock-data format.

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

/** Deep-unsafe get — safely traverse nested objects via dot path. */
function deepGet(obj: unknown, ...keys: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
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
// GitHub — github.profile / repositories / contributions
// Handles flat API + nested mock { profile, contributions, starredRepositories }
// ------------------------------------------------
export function analyzeGitHub(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  // flat: d.public_repos / nested: d.profile.repositories.totalCount
  const repos = num(
    d.public_repos ?? d.repos ?? deepGet(d, "profile", "repositories", "totalCount") ?? deepGet(d, "repositories", "totalCount"),
  );
  const stars = num(
    d.total_stars ?? d.stars ?? d.stargazers_count ?? deepGet(d, "starredRepositories", "totalCount") ?? deepGet(d, "starred_repositories"),
  );
  const followers = num(
    d.followers ?? d.followers_count ?? deepGet(d, "profile", "followers", "totalCount") ?? deepGet(d, "profile", "followers"),
  );
  const years = yearsSince(
    d.created_at ?? d.createdAt ?? deepGet(d, "profile", "createdAt") ?? deepGet(d, "profile", "created_at"),
  );
  const contributions = num(
    d.total_contributions ?? deepGet(d, "contributions", "totalContributions"),
  );
  const streak = num(
    d.contribution_streak ?? deepGet(d, "contributions", "contributionStreak", "current"),
  );
  const languages = Array.isArray(d.languages)
    ? (d.languages as { name: string; percentage: number }[])
    : Array.isArray(deepGet(d, "contributions", "languages"))
      ? (deepGet(d, "contributions", "languages") as { name: string; percentage: number }[])
      : [];

  const facts: FactItem[] = [
    { label: `${fmt(repos)} public repos`, value: repos },
    { label: `${fmt(stars)} total stars`, value: stars },
    { label: `${fmt(followers)} followers`, value: followers },
  ];
  if (years >= 1) facts.push({ label: `${Math.round(years)} years active`, value: Math.round(years) });
  if (contributions > 0) facts.push({ label: `${fmt(contributions)} contributions`, value: contributions });
  if (streak > 0) facts.push({ label: `${streak} day streak`, value: streak });
  if (languages.length) facts.push({ label: `Top: ${languages.slice(0, 3).map((l) => l.name).join(", ")}`, value: languages[0]?.name ?? "" });

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

  if (contributions >= 1000) {
    insights.push(insight("github", "Consistent contributor", `${fmt(contributions)} contributions — code is a daily habit.`, strengthFrom(contributions / 20), facts));
  } else if (contributions >= 200) {
    insights.push(insight("github", "Regular contributor", `${fmt(contributions)} contributions — steady progress.`, 3, facts));
  }

  if (streak >= 30) {
    insights.push(insight("github", "On a roll", `${streak}-day contribution streak — momentum is real.`, 4, facts));
  }

  if (languages.length >= 3) {
    const topLang = languages[0]?.name ?? "multiple";
    insights.push(insight("github", "Polyglot developer", `Writes in ${languages.slice(0, 3).map((l) => l.name).join(", ")} — led by ${topLang}.`, 3, facts));
  }

  return insights;
}

// ------------------------------------------------
// Instagram — instagram.profile / media / following
// Handles flat API + nested mock { profile, media, following }
// ------------------------------------------------
export function analyzeInstagram(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const followers = num(
    d.followers ?? d.follower_count ?? deepGet(d, "profile", "followerCount") ?? deepGet(d, "profile", "followers"),
  );
  const posts = num(
    d.posts ?? d.posts_count ?? d.media_count ?? deepGet(d, "profile", "mediaCount") ?? deepGet(d, "media", "count"),
  );
  const verified = d.is_verified === true || d.is_verified === "true" || deepGet(d, "profile", "is_verified") === true;
  const topHashtags = Array.isArray(d.top_hashtags)
    ? (d.top_hashtags as string[])
    : Array.isArray(deepGet(d, "media", "topHashtags"))
      ? (deepGet(d, "media", "topHashtags") as string[])
      : [];
  const avgLikes = num(d.average_likes ?? deepGet(d, "media", "averageLikes"));
  const postingFreq = typeof d.posting_frequency === "string" ? d.posting_frequency : typeof deepGet(d, "media", "postingFrequency") === "string" ? (deepGet(d, "media", "postingFrequency") as string) : "";

  const facts: FactItem[] = [
    { label: `${fmt(followers)} followers`, value: followers },
    { label: `${fmt(posts)} posts`, value: posts },
  ];
  if (verified) facts.push({ label: "Verified", value: true });
  if (avgLikes > 0) facts.push({ label: `${fmt(avgLikes)} avg likes`, value: avgLikes });
  if (topHashtags.length) facts.push({ label: `Top tags: ${topHashtags.slice(0, 3).join(" ")}`, value: topHashtags.slice(0, 3).join(" ") });

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

  if (avgLikes >= 100) {
    insights.push(insight("instagram", "Engaging content", `Averaging ${fmt(avgLikes)} likes per post — your audience is responsive.`, 3, facts));
  }

  if (topHashtags.length >= 3) {
    insights.push(insight("instagram", "Niche curator", `Themes: ${topHashtags.slice(0, 3).join(" ")} — a clear aesthetic identity.`, 2, facts));
  }

  return insights;
}

// ------------------------------------------------
// Spotify — spotify.profile / top artists / genres / listening
// Handles flat API + nested mock { profile, topArtists, listeningStats }
// ------------------------------------------------
export function analyzeSpotify(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const topGenres = Array.isArray(d.top_genres)
    ? (d.top_genres as string[])
    : Array.isArray(deepGet(d, "listeningStats", "topGenres"))
      ? (deepGet(d, "listeningStats", "topGenres") as string[])
      : [];
  // topArtists can be flat array or nested { items: [{name, genres}] }
  const rawArtists = Array.isArray(d.top_artists)
    ? (d.top_artists as string[])
    : Array.isArray(deepGet(d, "topArtists", "items"))
      ? (deepGet(d, "topArtists", "items") as { name: string; genres?: string[] }[]).map((a) => a.name)
      : [];
  const hours = num(
    d.listening_hours ?? d.total_listening_hours ?? deepGet(d, "listeningStats", "totalHoursThisMonth"),
  );
  const followers = num(d.followers ?? deepGet(d, "profile", "followers", "total") ?? deepGet(d, "profile", "followers"));
  const diversity = num(d.diversity_score ?? deepGet(d, "listeningStats", "diversityScore"));
  const savedTracks = num(d.saved_tracks ?? d.savedTracks ?? deepGet(d, "savedTracks", "total"));

  const facts: FactItem[] = [];
  if (topGenres.length) facts.push({ label: `Top genres: ${topGenres.slice(0, 3).join(", ")}`, value: topGenres.slice(0, 3).join(", ") });
  if (rawArtists.length) facts.push({ label: `Top artists: ${rawArtists.slice(0, 3).join(", ")}`, value: rawArtists.slice(0, 3).join(", ") });
  if (hours > 0) facts.push({ label: `${fmt(hours)} hours listening`, value: Math.round(hours) });
  if (followers > 0) facts.push({ label: `${fmt(followers)} followers`, value: followers });
  if (savedTracks > 0) facts.push({ label: `${fmt(savedTracks)} saved tracks`, value: savedTracks });
  if (diversity > 0) facts.push({ label: `${Math.round(diversity * 100)}% diversity`, value: Math.round(diversity * 100) });

  const insights: Insight[] = [];

  if (hours >= 500) {
    insights.push(insight("spotify", "Deep listener", `${fmt(hours)} hours listening — music isn't background, it's a need.`, hours >= 2000 ? 5 : 4, facts));
  } else if (hours >= 100) {
    insights.push(insight("spotify", "Committed listener", `${fmt(hours)} hours — music is always there for you.`, 3, facts));
  }

  if (topGenres.length) {
    const g = topGenres.slice(0, 3).join(", ");
    insights.push(insight("spotify", "Genre explorer", `Dominant in ${g} — you have a clear taste.`, topGenres.length >= 3 ? 4 : 3, facts));
  }

  if (diversity >= 0.7) {
    insights.push(insight("spotify", "Eclectic taste", `${Math.round(diversity * 100)}% diversity score — your range is impressive.`, 4, facts));
  }

  if (rawArtists.length >= 4) {
    insights.push(insight("spotify", "Wide palette", `${rawArtists.length} top artists — you follow your ear wherever it leads.`, 2, facts));
  }

  if (savedTracks >= 500) {
    insights.push(insight("spotify", "Curated library", `${fmt(savedTracks)} saved tracks — a personal archive of moods.`, 3, facts));
  }

  return insights;
}

// ------------------------------------------------
// YouTube — youtube.channel / watchHistory / subscriptions
// Handles nested mock { channel, watchHistory, subscriptions }
// ------------------------------------------------
export function analyzeYouTube(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const subs = num(d.subscribers ?? d.subscriber_count ?? deepGet(d, "channel", "subscriberCount"));
  const videos = num(d.videos ?? d.video_count ?? deepGet(d, "channel", "videoCount"));
  const watchHours = num(d.watch_hours ?? d.total_hours ?? deepGet(d, "watchHistory", "totalHours"));
  const topCats = Array.isArray(d.top_categories)
    ? (d.top_categories as string[])
    : Array.isArray(deepGet(d, "watchHistory", "topCategories"))
      ? (deepGet(d, "watchHistory", "topCategories") as string[])
      : [];
  const subChannels = num(d.subscribed_channels ?? deepGet(d, "watchHistory", "subscribedChannels"));
  const topics = Array.isArray(d.top_topics)
    ? (d.top_topics as string[])
    : Array.isArray(deepGet(d, "watchHistory", "topTopics"))
      ? (deepGet(d, "watchHistory", "topTopics") as string[])
      : [];

  const facts: FactItem[] = [];
  if (subs > 0) facts.push({ label: `${fmt(subs)} subscribers`, value: subs });
  if (videos > 0) facts.push({ label: `${fmt(videos)} videos`, value: videos });
  if (watchHours > 0) facts.push({ label: `${fmt(watchHours)} hours watched`, value: Math.round(watchHours) });
  if (topCats.length) facts.push({ label: `Top: ${topCats.slice(0, 3).join(", ")}`, value: topCats.slice(0, 3).join(", ") });
  if (subChannels > 0) facts.push({ label: `${fmt(subChannels)} subscriptions`, value: subChannels });

  const insights: Insight[] = [];

  if (watchHours >= 1000) {
    insights.push(insight("youtube", "Binge watcher", `${fmt(watchHours)} hours watched — YouTube is your main screen.`, 5, facts));
  } else if (watchHours >= 300) {
    insights.push(insight("youtube", "Active viewer", `${fmt(watchHours)} hours — you know your way around the platform.`, 3, facts));
  }

  const hasEducational = topCats.some((c) => /tech|edu|science|programming/i.test(c));
  if (hasEducational) {
    insights.push(insight("youtube", "Knowledge seeker", `Top categories include ${topCats.filter((c) => /tech|edu|science|programming/i.test(c)).join(", ")} — you learn here.`, 4, facts));
  }

  if (subChannels >= 100) {
    insights.push(insight("youtube", "Diverse consumer", `${fmt(subChannels)} subscriptions — a broad content diet.`, 3, facts));
  }

  if (videos >= 10) {
    insights.push(insight("youtube", "Content creator", `${fmt(videos)} videos published — you create, not just consume.`, 3, facts));
  } else if (videos > 0) {
    insights.push(insight("youtube", "Channel starter", `${videos} videos — just getting started as a creator.`, 2, facts));
  }

  if (topics.length >= 3) {
    insights.push(insight("youtube", "Curious mind", `Follows ${topics.slice(0, 3).join(", ")} — wide-ranging interests.`, 2, facts));
  }

  return insights;
}

// ------------------------------------------------
// Steam — steam.profile / games / friends
// Handles nested mock { profile, games, friends }
// ------------------------------------------------
export function analyzeSteam(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const level = num(d.level ?? deepGet(d, "profile", "level"));
  const games = num(d.games ?? d.games_count ?? deepGet(d, "games", "total"));
  const playHours = num(d.playtime_hours ?? d.total_hours ?? deepGet(d, "games", "totalHours"));
  const friends = num(d.friends ?? d.friends_count ?? deepGet(d, "friends", "total"));
  const badges = num(d.badges ?? deepGet(d, "profile", "badges"));
  const topGames = Array.isArray(d.top_games)
    ? (d.top_games as { name: string; playtimeForever: number }[])
    : Array.isArray(deepGet(d, "games", "topGames"))
      ? (deepGet(d, "games", "topGames") as { name: string; playtimeForever: number }[])
      : [];
  const genres = (typeof d.genres === "object" && d.genres !== null
    ? d.genres
    : deepGet(d, "games", "genres")) as Record<string, number> | undefined;

  const facts: FactItem[] = [];
  if (games > 0) facts.push({ label: `${fmt(games)} games`, value: games });
  if (playHours > 0) facts.push({ label: `${fmt(playHours)} hours played`, value: Math.round(playHours) });
  if (level > 0) facts.push({ label: `Level ${level}`, value: level });
  if (friends > 0) facts.push({ label: `${fmt(friends)} friends`, value: friends });
  if (topGames.length) facts.push({ label: `Top: ${topGames.slice(0, 3).map((g) => g.name).join(", ")}`, value: topGames[0]?.name ?? "" });

  const insights: Insight[] = [];

  if (playHours >= 2000) {
    insights.push(insight("steam", "Dedicated gamer", `${fmt(playHours)} hours played — gaming is a core part of your life.`, 5, facts));
  } else if (playHours >= 500) {
    insights.push(insight("steam", "Serious player", `${fmt(playHours)} hours — you invest real time in your games.`, 4, facts));
  }

  if (games >= 100) {
    insights.push(insight("steam", "Extensive library", `${fmt(games)} games — a collector's mindset.`, 3, facts));
  } else if (games >= 30) {
    insights.push(insight("steam", "Diverse library", `${fmt(games)} games — you explore different genres.`, 2, facts));
  }

  if (genres) {
    const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]);
    if (sortedGenres.length >= 4) {
      insights.push(insight("steam", "Well-rounded player", `${sortedGenres.length} genres explored — variety is your style.`, 3, facts));
    }
    if (sortedGenres.length > 0 && sortedGenres[0][1] >= 30) {
      insights.push(insight("steam", "Genre specialist", `Leans into ${sortedGenres[0][0]} (${sortedGenres[0][1]}%) — a clear favorite.`, 3, facts));
    }
  }

  if (friends >= 50) {
    insights.push(insight("steam", "Social gamer", `${fmt(friends)} friends — gaming is your social hub.`, 2, facts));
  }

  if (topGames.length >= 3) {
    const topGame = topGames[0];
    insights.push(insight("steam", "Signature game", `${topGame.name} is your most played — ${fmt(topGame.playtimeForever)}h invested.`, 2, facts));
  }

  return insights;
}

// ------------------------------------------------
// ChatGPT — chatgpt.conversations / memories
// Handles nested mock { conversations, memories }
// ------------------------------------------------
export function analyzeChatGPT(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const total = num(d.conversations_total ?? d.total_conversations ?? deepGet(d, "conversations", "total"));
  const avgLen = num(d.average_length ?? deepGet(d, "conversations", "averageLength"));
  const topTopics = Array.isArray(d.top_topics)
    ? (d.top_topics as string[])
    : Array.isArray(deepGet(d, "conversations", "topTopics"))
      ? (deepGet(d, "conversations", "topTopics") as string[])
      : [];
  const firstConv = typeof d.first_conversation === "string" ? d.first_conversation : typeof deepGet(d, "conversations", "firstConversation") === "string" ? (deepGet(d, "conversations", "firstConversation") as string) : "";
  const freq = typeof d.frequency === "string" ? d.frequency : typeof deepGet(d, "conversations", "frequency") === "string" ? (deepGet(d, "conversations", "frequency") as string) : "";
  const sessionDur = typeof d.average_session_duration === "string" ? d.average_session_duration : typeof deepGet(d, "conversations", "averageSessionDuration") === "string" ? (deepGet(d, "conversations", "averageSessionDuration") as string) : "";
  const memoriesSaved = num(d.memories_saved ?? deepGet(d, "memories", "saved"));

  const facts: FactItem[] = [];
  if (total > 0) facts.push({ label: `${fmt(total)} conversations`, value: total });
  if (avgLen > 0) facts.push({ label: `${avgLen} avg messages`, value: avgLen });
  if (topTopics.length) facts.push({ label: `Topics: ${topTopics.slice(0, 4).join(", ")}`, value: topTopics.slice(0, 4).join(", ") });
  if (freq) facts.push({ label: `Usage: ${freq}`, value: freq });
  if (memoriesSaved > 0) facts.push({ label: `${memoriesSaved} memories saved`, value: memoriesSaved });

  const insights: Insight[] = [];

  if (total >= 500) {
    insights.push(insight("chatgpt", "Power user", `${fmt(total)} conversations — AI is part of your daily workflow.`, 5, facts));
  } else if (total >= 100) {
    insights.push(insight("chatgpt", "Regular user", `${fmt(total)} conversations — you know how to prompt well.`, 3, facts));
  } else if (total > 0) {
    insights.push(insight("chatgpt", "Getting started with AI", `${total} conversations — exploring what AI can do.`, 2, facts));
  }

  if (freq === "daily") {
    insights.push(insight("chatgpt", "AI-native thinker", "Daily usage — AI is your default thinking partner.", 4, facts));
  }

  if (topTopics.length >= 4) {
    insights.push(insight("chatgpt", "Versatile user", `${topTopics.length} topics — from ${topTopics[0]} to ${topTopics[topTopics.length - 1]}.`, 3, facts));
  }

  if (firstConv && firstConv <= "2023-12") {
    insights.push(insight("chatgpt", "Early adopter", `Started in ${firstConv} — ahead of the curve.`, 4, facts));
  }

  if (memoriesSaved >= 10) {
    insights.push(insight("chatgpt", "Customized experience", `${memoriesSaved} memories saved — you've personalized your AI.`, 2, facts));
  }

  return insights;
}

// ------------------------------------------------
// LinkedIn — linkedin.profile / experience / education / skills
// Handles nested mock { profile, experience, education, skills }
// ------------------------------------------------
export function analyzeLinkedIn(data: SourceData): Insight[] {
  const d = data as unknown as Record<string, unknown>;
  const connections = num(d.connections ?? d.connection_count ?? deepGet(d, "profile", "connections"));
  const followers = num(d.followers ?? deepGet(d, "profile", "followers"));
  const experience = Array.isArray(d.experience) ? (d.experience as Record<string, unknown>[]) : [];
  const skills = Array.isArray(d.skills) ? (d.skills as Record<string, unknown>[]) : [];
  const headline = typeof d.headline === "string" ? d.headline : typeof deepGet(d, "profile", "headline") === "string" ? (deepGet(d, "profile", "headline") as string) : "";
  const location = typeof d.location === "string" ? d.location : typeof deepGet(d, "profile", "location") === "string" ? (deepGet(d, "profile", "location") as string) : "";

  const facts: FactItem[] = [];
  if (connections > 0) facts.push({ label: `${fmt(connections)} connections`, value: connections });
  if (followers > 0) facts.push({ label: `${fmt(followers)} followers`, value: followers });
  if (experience.length) facts.push({ label: `${experience.length} roles`, value: experience.length });
  if (skills.length) facts.push({ label: `${skills.length} skills`, value: skills.length });
  if (headline) facts.push({ label: headline, value: headline });

  const insights: Insight[] = [];

  if (connections >= 500) {
    insights.push(insight("linkedin", "Well-connected", `${fmt(connections)} connections — a strong professional network.`, 4, facts));
  } else if (connections >= 100) {
    insights.push(insight("linkedin", "Building network", `${fmt(connections)} connections — growing steadily.`, 3, facts));
  }

  if (experience.length >= 5) {
    insights.push(insight("linkedin", "Seasoned professional", `${experience.length} roles — a rich career journey.`, 4, facts));
  } else if (experience.length >= 2) {
    insights.push(insight("linkedin", "Experienced professional", `${experience.length} roles — solid career progression.`, 3, facts));
  }

  if (skills.length >= 7) {
    const skillNames = skills.slice(0, 4).map((s) => (typeof s.name === "string" ? s.name : String(s.name ?? ""))).filter(Boolean);
    insights.push(insight("linkedin", "Skill builder", `${skills.length} skills listed — led by ${skillNames.slice(0, 3).join(", ")}.`, 3, facts));
  } else if (skills.length >= 3) {
    insights.push(insight("linkedin", "Multi-skilled", `${skills.length} skills — a versatile toolkit.`, 2, facts));
  }

  if (followers >= 100) {
    insights.push(insight("linkedin", "Emerging leader", `${fmt(followers)} followers — people listen when you post.`, 3, facts));
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
  youtube: analyzeYouTube,
  steam: analyzeSteam,
  chatgpt: analyzeChatGPT,
  linkedin: analyzeLinkedIn,
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
