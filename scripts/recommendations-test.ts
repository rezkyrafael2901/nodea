import { getRecommendationsSync } from "../src/lib/recommendations/engine";
import type { SourceData } from "../src/lib/recommendations/types";

const github: SourceData = {
  sourceId: "github",
  name: "Rezki Pratama",
  login: "rezkyrafael2901",
  public_repos: 47,
  total_stars: 1240,
  followers: 89,
  created_at: "2019-03-12T00:00:00Z",
  primaryLanguage: "TypeScript",
};

const ig: SourceData = {
  sourceId: "instagram",
  username: "rezki.pratama",
  followers: 15400,
  following: 320,
  posts: 312,
  is_verified: true,
  bio: "Building in public",
};

const spotify: SourceData = {
  sourceId: "spotify",
  username: "rezki",
  top_genres: ["indie pop", "alternative", "lo-fi"],
  top_artists: ["Tame Impala", "Men I Trust", "Sal Priadi"],
  listening_hours: 1240,
  followers: 12,
};

for (const data of [github, ig, spotify]) {
  const rec = getRecommendationsSync(data);
  console.log(`\n===== ${rec.sourceId.toUpperCase()} =====`);
  for (const i of rec.insights) {
    console.log(`  [${"★".repeat(i.strength)}${"☆".repeat(5 - i.strength)}] ${i.emoji} ${i.title} — ${i.narrative}`);
  }
  console.log("--- fallback narrative ---");
  console.log(rec.finalNarrative);
}