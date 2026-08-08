"use client";

import { useState, useEffect } from "react";
import type { BrandId } from "@/components/brand-icons";

// Platform mode — determines whether a source works without Vana Desktop
//   web     → server-side collection (ODL Data Pipe) — works on mobile & web, zero-install
//   desktop → client-side collection (Playwright in Vana Desktop) — deep data, desktop only
export type PlatformMode = "web" | "desktop" | "hybrid";

// Handle pattern (Patina-style) — user pastes a profile link, we trim it to the handle
export interface HandlePattern {
  prefix: string;        // e.g. "youtube.com/@"
  placeholder: string;   // input placeholder
  urlTemplate: string;   // e.g. "https://www.youtube.com/@{handle}"
  hint: string;          // guidance shown under the field
}

export interface DataSource {
  id: string;
  name: string;
  icon: BrandId;
  description: string;
  scopes: string[];          // web-mode scopes (server-side collectible)
  desktopScopes?: string[];  // full/deep scopes (desktop only)
  maturity: "stable" | "beta" | "experimental";
  onboarded: boolean;
  platform: PlatformMode;
  handle: HandlePattern | null;   // how to tell the user what to paste (null = no handle, use findIt)
  findIt: string[] | null;        // instructions when there's no handle to paste
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "linkedin",
    description: "Your professional journey — career, skills & network.",
    scopes: ["linkedin.profile"],
    desktopScopes: ["linkedin.profile", "linkedin.experience", "linkedin.education", "linkedin.skills"],
    maturity: "beta",
    onboarded: false,
    platform: "web",
    handle: {
      prefix: "linkedin.com/in/",
      placeholder: "yourusername or paste profile link",
      urlTemplate: "https://www.linkedin.com/in/{handle}",
      hint: "Your LinkedIn username, or paste your profile link (linkedin.com/in/...).",
    },
    findIt: null,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "instagram",
    description: "How much you post, and how many follow you.",
    scopes: ["instagram.profile"],
    desktopScopes: ["instagram.profile", "instagram.posts", "instagram.following", "instagram.ads"],
    maturity: "stable",
    onboarded: false,
    platform: "web",
    handle: {
      prefix: "instagram.com/",
      placeholder: "yourusername or paste profile link",
      urlTemplate: "https://www.instagram.com/{handle}",
      hint: "Your username, or paste your profile link. Reels/posts links are fine — we trim them.",
    },
    findIt: null,
  },
  {
    id: "github",
    name: "GitHub",
    icon: "github",
    description: "When you joined and what you have built.",
    scopes: ["github.profile"],
    desktopScopes: ["github.contributions", "github.events", "github.history", "github.profile", "github.repositories", "github.starred"],
    maturity: "stable",
    onboarded: false,
    platform: "web",
    handle: {
      prefix: "github.com/",
      placeholder: "yourusername or paste profile link",
      urlTemplate: "https://github.com/{handle}",
      hint: "Your GitHub username, or paste your profile link.",
    },
    findIt: null,
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: "spotify",
    description: "A listening life.",
    scopes: ["spotify.profile"],
    desktopScopes: ["spotify.playlists", "spotify.profile", "spotify.savedTracks"],
    maturity: "stable",
    onboarded: false,
    platform: "web",
    handle: null,
    findIt: [
      "Open Spotify and go to your own profile.",
      "Tap the three dots, then Share, then Copy link to profile.",
      "Come back here and paste it on the Vana page when it asks.",
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "youtube",
    description: "The day your account was opened — and deeper history on desktop.",
    scopes: ["youtube.profile"],
    desktopScopes: ["youtube.history", "youtube.likes", "youtube.playlists", "youtube.profile", "youtube.subscriptions", "youtube.watchLater"],
    maturity: "beta",
    onboarded: false,
    platform: "hybrid",
    handle: {
      prefix: "youtube.com/@",
      placeholder: "yourhandle or paste channel link",
      urlTemplate: "https://www.youtube.com/@{handle}",
      hint: "Paste your channel link if you have one (works for /@, /channel/, /c/). Or type the @ handle from your picture menu.",
    },
    findIt: null,
  },
  {
    id: "steam",
    name: "Steam",
    icon: "steam",
    description: "Games, playtime & friends — deep data via Vana Desktop.",
    scopes: ["steam.profile", "steam.games", "steam.friends"],
    maturity: "experimental",
    onboarded: false,
    platform: "desktop",
    handle: null,
    findIt: [
      "Install Vana Desktop on your computer (vana.org/desktop).",
      "Open the app, connect Steam under your sources.",
      "Come back here and connect — your data is already synced.",
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: "chatgpt",
    description: "Conversations & memories — deep data via Vana Desktop.",
    scopes: ["chatgpt.conversations", "chatgpt.memories"],
    maturity: "experimental",
    onboarded: false,
    platform: "desktop",
    handle: null,
    findIt: [
      "Install Vana Desktop on your computer (vana.org/desktop).",
      "Open the app, connect ChatGPT under your sources.",
      "Come back here and connect — your data is already synced.",
    ],
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
