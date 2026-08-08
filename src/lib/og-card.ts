// Shared Soul Card SVG builder — used by /api/og (SVG) and /api/og.png (PNG via sharp)

function getPalette(mood: string): string[] {
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

export interface OgCardParams {
  sources?: string;
  identity?: string;
  aesthetic?: string;
  tagline?: string;
  mood?: string;
  theme?: string;
  trait?: string;
  creative_analytical?: number;
  social_solitary?: number;
  consumer_creator?: number;
  score?: number;
  grade?: string;
  ref?: string;
}

// Theme presets — each changes bg gradient, card treatment, and accent text
const THEMES: Record<string, { label: string; defs: string; card: string; bgA: string; bgB: string }> = {
  midnight: {
    label: "Midnight",
    bgA: "#0a0a0a",
    bgB: "#16213e",
    defs: ``,
    card: `fill="url(#card)" stroke="rgba(255,255,255,0.15)"`,
  },
  neon: {
    label: "Neon",
    bgA: "#0f0c29",
    bgB: "#24243e",
    defs: `
      <radialGradient id="glow1" cx="0%" cy="0%" r="80%">
        <stop offset="0%" stop-color="rgba(79,140,255,0.55)" />
        <stop offset="100%" stop-color="rgba(79,140,255,0)" />
      </radialGradient>
      <radialGradient id="glow2" cx="100%" cy="100%" r="80%">
        <stop offset="0%" stop-color="rgba(236,72,153,0.5)" />
        <stop offset="100%" stop-color="rgba(236,72,153,0)" />
      </radialGradient>`,
    card: `fill="url(#card)" stroke="rgba(79,140,255,0.6)"`,
  },
  glass: {
    label: "Glass",
    bgA: "#101418",
    bgB: "#1c2530",
    defs: ``,
    card: `fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.3)"`,
  },
};

const TRAIT_EMOJIS: Record<string, string> = {
  "full-stacker": "⚡", "culture-vulture": "🦅", "creator-core": "✨",
  "play-hard": "🎯", "digital-native": "🧬", "aesthetic-machine": "🎨",
  "multiplayer-life": "👥", "polymath": "🧠", "omni-channel": "🌐",
  github: "💻", instagram: "📸", chatgpt: "🤖", spotify: "🎵", youtube: "▶️", steam: "🎮",
};

const TRAIT_LABELS: Record<string, string> = {
  "full-stacker": "Full Stacker", "culture-vulture": "Culture Vulture", "creator-core": "Creator Core",
  "play-hard": "Play Hard", "digital-native": "Digital Native", "aesthetic-machine": "Aesthetic Machine",
  "multiplayer-life": "Multiplayer Life", "polymath": "Polymath", "omni-channel": "Omni-Channel",
  github: "Builder", instagram: "Visual Storyteller", chatgpt: "AI Native", spotify: "Tastemaker",
  youtube: "Binge Curator", steam: "Gamer",
};

export function buildSoulCardSvg(p: OgCardParams): string {
  const sources = p.sources || "github,instagram";
  const coreIdentity = p.identity || "A multi-disciplinary creator bridging technical depth with creative expression.";
  const aesthetic = p.aesthetic || "Digital Minimalist";
  const tagline = p.tagline || "Builder with an artist's eye and a researcher's curiosity";
  const mood = p.mood || "analytical";
  const creativeAnalytical = Math.max(0, Math.min(100, p.creative_analytical ?? 72));
  const socialSolitary = Math.max(0, Math.min(100, p.social_solitary ?? 58));
  const consumerCreator = Math.max(0, Math.min(100, p.consumer_creator ?? 65));

  const score = Math.max(0, Math.min(100, p.score ?? 0));
  const grade = (p.grade || "D").toUpperCase().slice(0, 1);
  const ref = (p.ref || "").substring(0, 30);

  const themeKey = ["midnight", "neon", "glass"].includes(p.theme || "") ? (p.theme as string) : "midnight";
  const theme = THEMES[themeKey];
  const traitEmoji = TRAIT_EMOJIS[p.trait || ""] || "";
  const traitLabel = TRAIT_LABELS[p.trait || ""] || "";

  const palette = getPalette(mood);
  const safeCoreIdentity = coreIdentity.substring(0, 120).replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeTagline = tagline.substring(0, 60).replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeAesthetic = aesthetic.substring(0, 40).replace(/"/g, "'");

  const sourceBadges = sources.split(",").slice(0, 5).map((s, i) => {
    const name = s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
    return `
      <rect x="${120 + i * 140}" y="310" width="120" height="40" rx="8" fill="rgba(255,255,255,0.1)" />
      <text x="${180 + i * 140}" y="336" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="white">${name}</text>
    `;
  }).join("");

  const barWidth1 = Math.min(960, Math.max(0, (creativeAnalytical / 100) * 960));
  const barWidth2 = Math.min(960, Math.max(0, (socialSolitary / 100) * 960));
  const barWidth3 = Math.min(960, Math.max(0, (consumerCreator / 100) * 960));

  const gradeColor =
    grade === "S" ? "#fbbf24" :
    grade === "A" ? "#4F8CFF" :
    grade === "B" ? "#38bdf8" :
    grade === "C" ? "#34d399" : "#a3a3a3";

  const scoreWidth = Math.min(960, Math.max(0, (score / 100) * 960));

  return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${theme.bgA};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${theme.bgB};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.1)" />
          <stop offset="100%" style="stop-color:rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="scorebar" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${gradeColor}" />
          <stop offset="100%" style="stop-color:${palette[2] || "#ffffff"}" />
        </linearGradient>
        ${theme.defs}
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />
      ${themeKey === "neon" ? `<rect width="1200" height="630" fill="url(#glow1)" /><rect width="1200" height="630" fill="url(#glow2)" />` : ""}

      <!-- Card -->
      <rect x="60" y="60" width="1080" height="510" rx="24" ${theme.card} stroke-width="1" />

      <!-- Header -->
      <text x="120" y="140" font-family="system-ui,sans-serif" font-size="48" font-weight="800" fill="white">NODEA</text>
      <text x="120" y="180" font-family="system-ui,sans-serif" font-size="28" fill="rgba(255,255,255,0.7)">${safeTagline}</text>

      <!-- Grade badge (top right) -->
      <rect x="940" y="92" width="200" height="72" rx="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="960" y="122" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="rgba(255,255,255,0.5)">GRADE</text>
      <text x="960" y="152" font-family="system-ui,sans-serif" font-size="30" font-weight="800" fill="${gradeColor}">${grade}</text>
      <text x="1030" y="152" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="white">${score}/100</text>

      <!-- Trait badge -->
      ${traitLabel ? `
      <rect x="940" y="180" width="200" height="40" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="960" y="206" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="white">${traitEmoji} ${traitLabel}</text>
      ` : ""}

      <!-- Core Identity -->
      <text x="120" y="250" font-family="system-ui,sans-serif" font-size="22" fill="rgba(255,255,255,0.6)">${safeCoreIdentity}</text>

      <!-- Source badges -->
      ${sourceBadges}

      <!-- Soul Score bar -->
      <text x="120" y="392" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">SOUL SCORE</text>
      <rect x="120" y="400" width="960" height="12" rx="6" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="400" width="${scoreWidth}" height="12" rx="6" fill="url(#scorebar)" />

      <!-- Personality bars -->
      <text x="120" y="445" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">CREATIVE ↔ ANALYTICAL</text>
      <rect x="120" y="455" width="960" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="455" width="${barWidth1}" height="8" rx="4" fill="white" />

      <text x="120" y="490" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">SOCIAL ↔ SOLITARY</text>
      <rect x="120" y="500" width="960" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="500" width="${barWidth2}" height="8" rx="4" fill="rgba(255,255,255,0.7)" />

      <text x="120" y="535" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">CONSUMER ↔ CREATOR</text>
      <rect x="120" y="545" width="960" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="545" width="${barWidth3}" height="8" rx="4" fill="rgba(255,255,255,0.5)" />

      <!-- Footer -->
      <text x="120" y="590" font-family="system-ui,sans-serif" font-size="18" fill="rgba(255,255,255,0.5)">Aesthetic: ${safeAesthetic} • Built on Vana Network</text>

      <!-- Watermark -->
      <text x="1100" y="590" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.2)">nodea.my.id${ref ? ` · via ${ref}` : ""}</text>
    </svg>`;
}

export function parseOgParams(searchParams: URLSearchParams): OgCardParams {
  const num = (v: string | null, def: number) => {
    if (!v) return def;
    const n = parseInt(v);
    return Number.isNaN(n) ? def : n;
  };
  return {
    sources: searchParams.get("sources") || undefined,
    identity: searchParams.get("identity") || undefined,
    aesthetic: searchParams.get("aesthetic") || undefined,
    tagline: searchParams.get("tagline") || undefined,
    mood: searchParams.get("mood") || undefined,
    theme: searchParams.get("theme") || undefined,
    trait: searchParams.get("trait") || undefined,
    creative_analytical: num(searchParams.get("creative_analytical"), 72),
    social_solitary: num(searchParams.get("social_solitary"), 58),
    consumer_creator: num(searchParams.get("consumer_creator"), 65),
    score: num(searchParams.get("score"), 0),
    grade: searchParams.get("grade") || undefined,
    ref: searchParams.get("ref") || undefined,
  };
}
