"use client";

import { useState, useEffect } from "react";

// Source definitions
export interface DataSource {
  id: string;
  name: string;
  icon: string;
  description: string;
  scopes: string[];
  maturity: "stable" | "beta" | "experimental";
  onboarded: boolean;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    description: "Code, commits, stars, repos, history",
    scopes: ["github.contributions", "github.events", "github.history", "github.profile", "github.repositories", "github.starred"],
    maturity: "stable",
    onboarded: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    description: "Posts, followers, following, ads, profile",
    scopes: ["instagram.profile", "instagram.posts", "instagram.following", "instagram.ads"],
    maturity: "stable",
    onboarded: false,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "🤖",
    description: "Conversation history, saved memories",
    scopes: ["chatgpt.conversations", "chatgpt.memories"],
    maturity: "stable",
    onboarded: false,
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: "🎵",
    description: "Playlists, profile, saved tracks",
    scopes: ["spotify.playlists", "spotify.profile", "spotify.savedTracks"],
    maturity: "stable",
    onboarded: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    description: "Watch history, likes, playlists, subscriptions",
    scopes: ["youtube.history", "youtube.likes", "youtube.playlists", "youtube.profile", "youtube.subscriptions", "youtube.watchLater"],
    maturity: "beta",
    onboarded: false,
  },
  {
    id: "steam",
    name: "Steam",
    icon: "🎮",
    description: "Games, playtime, friends, profile",
    scopes: ["steam.profile", "steam.games", "steam.friends"],
    maturity: "experimental",
    onboarded: false,
  },
];

export interface IdentityData {
  source: string;
  data: Record<string, unknown>;
  raw: Record<string, unknown>[];
}

// AI Prompt builder — build personality from all onboarded sources
export function buildIdentityPrompt(data: IdentityData[]): string {
  const sections = data.map((d) => {
    const summary = Object.keys(d.data).length > 0
      ? Object.entries(d.data)
          .slice(0, 10)
          .map(([k, v]) => `  • ${k}: ${JSON.stringify(v).slice(0, 200)}`)
          .join("\n")
      : "  (no data keys found — raw data below)\n  " + JSON.stringify(d.raw, null, 2).slice(0, 2000);

    return `=== ${d.source.toUpperCase()} DATA ===\n${summary}`;
  });

  return `You are analyzing a person's digital identity across multiple platforms. Generate a comprehensive, insightful, but fun "soul analysis" based on the data provided below.

${sections.join("\n\n")}

Analyze across these dimensions:
1. **Core Identity** — Who is this person fundamentally? (2-3 sentences)
2. **Digital Personality Score** — Rate on these scales (0-100 each):
   - Creative vs Analytical
   - Social vs Solitary
   - Consumer vs Creator
   - Risk-taker vs Cautious
   - Optimistic vs Realistic
3. **Hidden Patterns** — What surprising patterns connect across platforms?
4. **Aesthetic/Vibe** — If this person were an aesthetic, what would it be?
5. **Fun Facts** — 3 unexpected truths from the data
6. **Soul Card Summary** — A short, punchy 15-word tagline that captures their essence

Format your response as VALID JSON with this exact structure:
{
  "core_identity": "string",
  "personality_scores": {
    "creative_analytical": number,
    "social_solitary": number,
    "consumer_creator": number,
    "risk_taker_caution": number,
    "optimistic_realistic": number
  },
  "hidden_patterns": ["string", "string", "string"],
  "aesthetic": "string",
  "fun_facts": ["string", "string", "string"],
  "soul_tagline": "string",
  "mood": "string",
  "dominant_colors": ["#hexcode", "#hexcode", "#hexcode"]
}

Be honest, insightful, and entertaining. Use the actual data — don't genericize.`;
}

// Mood-based color palette
export function getPalette(mood: string): string[] {
  const palettes: Record<string, string[]> = {
    "creative": ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    "analytical": ["#2C3E50", "#3498DB", "#ECF0F1"],
    "social": ["#FF9FF3", "#F368E0", "#FEA47F"],
    "gamer": ["#00D2D3", "#54A0FF", "#5F27CD"],
    "dark": ["#0c0c0c", "#1a1a2e", "#e94560"],
    "default": ["#0a0a0a", "#16213e", "#e2e2e2"],
  };

  const lower = mood.toLowerCase();
  if (lower.includes("creat") || lower.includes("vibe")) return palettes.creative;
  if (lower.includes("analy") || lower.includes("code")) return palettes.analytical;
  if (lower.includes("social") || lower.includes("popular")) return palettes.social;
  if (lower.includes("gamer") || lower.includes("play")) return palettes.gamer;
  if (lower.includes("dark") || lower.includes("gritty")) return palettes.dark;
  return palettes.default;
}
