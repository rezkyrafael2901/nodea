/**
 * Mock data for dev mode — used when VANA_APP_PRIVATE_KEY is not configured.
 * Returns realistic sample data per source so the frontend flow works end-to-end.
 */

const MOCK_DATA: Record<string, Record<string, unknown>> = {
  github: {
    profile: {
      login: "developer",
      name: "Developer",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      bio: "Full-stack developer | Open source contributor",
      followers: { totalCount: 142 },
      following: { totalCount: 89 },
      repositories: { totalCount: 47 },
      createdAt: "2019-03-15T00:00:00Z",
    },
    contributions: {
      totalContributions: 3847,
      contributionStreak: { current: 24, longest: 187 },
      thisYear: 1205,
      peakMonth: "March",
      languages: [
        { name: "TypeScript", percentage: 45 },
        { name: "JavaScript", percentage: 20 },
        { name: "Rust", percentage: 15 },
        { name: "Python", percentage: 12 },
        { name: "Other", percentage: 8 },
      ],
    },
    starredRepositories: { totalCount: 312, topics: ["ai", "web3", "rust", "design-systems"] },
  },
  instagram: {
    profile: {
      username: "@creativeuser",
      fullName: "Creative User",
      followerCount: 2340,
      followingCount: 890,
      mediaCount: 234,
      biography: "Digital creator 🎨 | Coffee addict ☕",
      category: "Creator",
    },
    media: {
      count: 234,
      topHashtags: ["#design", "#coding", "#coffee", "#aesthetic", "#minimal"],
      averageLikes: 156,
      topTheme: "tech+lifestyle",
      postingFrequency: "3-4x/week",
    },
    following: {
      topCategories: ["tech_influencers", "design", "art", "music"],
      averageFollowers: 12000,
    },
  },
  chatgpt: {
    conversations: {
      total: 847,
      averageLength: 23,
      topTopics: ["programming", "writing", "analysis", "creative", "debugging"],
      firstConversation: "2023-06",
      frequency: "daily",
      averageSessionDuration: "35min",
    },
    memories: {
      saved: 23,
      topics: ["preferred_code_style", "project_context", "writing_style"],
    },
  },
  spotify: {
    profile: {
      displayName: "Creative Soul",
      followers: { total: 23 },
      publicPlaylists: 8,
    },
    topArtists: {
      items: [
        { name: "Bonobo", genres: ["electronic", "downtempo"] },
        { name: "Tycho", genres: ["ambient", "electronic"] },
        { name: "Khruangbin", genres: ["psychedelic", "funk"] },
        { name: "Emancipator", genres: ["electronic", "trip-hop"] },
      ],
    },
    savedTracks: { total: 534 },
    recentlyPlayed: [
      { track: { name: "Kerala", artists: [{ name: "Bonobo" }] } },
      { track: { name: "Awake", artists: [{ name: "Tycho" }] } },
    ],
    listeningStats: {
      totalHoursThisMonth: 87,
      topGenres: ["lo-fi", "indie", "electronic", "jazz", "post-rock"],
      diversityScore: 0.82,
    },
  },
  youtube: {
    channel: {
      subscriberCount: 45,
      videoCount: 3,
    },
    watchHistory: {
      totalHours: 1200,
      topCategories: ["Tech", "Education", "Music", "Documentaries"],
      averageVideoLength: "18min",
      subscribedChannels: 89,
      topTopics: ["programming_tutorials", "music_production", "sci_edu"],
    },
    subscriptions: {
      byCategory: { tech: 34, music: 28, education: 27 },
    },
  },
  steam: {
    profile: {
      steamId: "76561198000000000",
      personaName: "GamerSoul",
      level: 24,
      badges: 47,
    },
    games: {
      total: 186,
      totalHours: 2340,
      topGames: [
        { name: "Hades", playtimeForever: 120 },
        { name: "Outer Wilds", playtimeForever: 87 },
        { name: "Disco Elysium", playtimeForever: 65 },
        { name: "Stardew Valley", playtimeForever: 200 },
        { name: "Factorio", playtimeForever: 150 },
      ],
      genres: { roguelike: 35, exploration: 28, strategy: 20, simulation: 17 },
    },
    friends: { total: 67, currentlyOnline: 12 },
  },
};

export default function mockData(sourceId: string): Record<string, unknown> {
  const data = MOCK_DATA[sourceId];
  if (!data) {
    return { error: `Unknown source: ${sourceId}` };
  }
  return data;
}
