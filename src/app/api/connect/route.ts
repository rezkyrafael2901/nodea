import { NextResponse } from "next/server";

// In production: use @opendatalabs/vana-sdk to fetch real data
// For now: simulate data from each source with realistic structure

const SOURCE_DATA: Record<string, Record<string, unknown>> = {
  github: {
    profile: {
      name: "Developer",
      avatar: "https://avatars.githubusercontent.com/u/1?v=4",
      bio: "Full-stack developer | Open source contributor",
      followers: 142,
      following: 89,
      publicRepos: 47,
      joinedYear: 2019,
    },
    contributions: {
      total: 3847,
      streak: { current: 24, longest: 187 },
      thisYear: 1205,
      peakMonth: "March",
      languages: { TypeScript: 45, JavaScript: 20, Rust: 15, Python: 12, Other: 8 },
    },
    starred: { count: 312, topTopics: ["ai", "web3", "rust", "design-systems"] },
  },
  instagram: {
    profile: {
      username: "@creativeuser",
      followers: 2340,
      following: 890,
      posts: 234,
      bio: "Digital creator 🎨 | Coffee addict ☕",
      category: "Creator",
    },
    posts: {
      total: 234,
      topHashtags: ["#design", "#coding", "#coffee", "#aesthetic", "#minimal"],
      avgLikes: 156,
      topTheme: "tech+lifestyle",
      postingFrequency: "3-4x/week",
    },
    following: {
      topCategories: ["tech_influencers", "design", "art", "music"],
      avgFollowers: 12000,
    },
  },
  chatgpt: {
    conversations: {
      total: 847,
      avgLength: 23,
      topTopics: ["programming", "writing", "analysis", "creative", "debugging"],
      firstConversation: "2023-06",
      frequency: "daily",
      avgSessionDuration: "35min",
    },
    memories: {
      saved: 23,
      topics: ["preferred_code_style", "project_context", "writing_style"],
    },
  },
  spotify: {
    profile: {
      displayName: "Creative Soul",
      followers: 23,
      playlists: 15,
      publicPlaylists: 8,
    },
    playlists: {
      totalTracks: 1247,
      topGenres: ["lo-fi", "indie", "electronic", "jazz", "post-rock"],
      topArtists: ["Bonobo", "Tycho", "Khruangbin", "Emancipator"],
      listeningHoursMonth: 87,
      diversity: 0.82, // high diversity score
    },
    savedTracks: { count: 534, topDecade: "2010s-2020s" },
  },
  youtube: {
    profile: {
      subscriberCount: 45,
      videosUploaded: 3,
      watchTimeHours: 1200,
    },
    history: {
      topCategories: ["Tech", "Education", "Music", "Documentaries"],
      avgVideoLength: "18min",
      channelsSubscribed: 89,
      topTopics: ["programming_tutorials", "music_production", "sci_edu"],
    },
    subscriptions: {
      tech: 34,
      music: 28,
      education: 27,
    },
  },
  steam: {
    profile: {
      level: 24,
      badges: 47,
      gamesOwned: 186,
      hoursPlayed: 2340,
      lastOnline: "Recently",
    },
    games: {
      topGames: [
        { name: "Hades", hours: 120 },
        { name: "Outer Wilds", hours: 87 },
        { name: "Disco Elysium", hours: 65 },
        { name: "Stardew Valley", hours: 200 },
        { name: "Factorio", hours: 150 },
      ],
      genres: { roguelike: 35, exploration: 28, strategy: 20, simulation: 17 },
    },
    friends: { count: 67, online: 12 },
  },
};

export async function POST(request: Request) {
  try {
    const { sourceId, scopes } = await request.json();

    if (!sourceId || !SOURCE_DATA[sourceId]) {
      return NextResponse.json(
        { error: `Unknown or unsupported source: ${sourceId}` },
        { status: 400 }
      );
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In production, this is where @opendatalabs/vana-sdk would fetch real data:
    // const controller = createDirectDataController({ network: process.env.VANA_NETWORK || "mainnet" });
    // const approvedData = await controller.requestData({ source: sourceId, scopes });

    const data = SOURCE_DATA[sourceId];

    return NextResponse.json({
      source: sourceId,
      data: data,
      scopesRequested: scopes,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Connect API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data source" },
      { status: 500 }
    );
  }
}
