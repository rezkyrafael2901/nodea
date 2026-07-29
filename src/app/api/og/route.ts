import { NextResponse } from "next/server";

// Inline palette function (avoid import issue)
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sources = searchParams.get("sources") || "github,instagram";
  
  const coreIdentity = searchParams.get("identity") || "A multi-disciplinary creator bridging technical depth with creative expression.";
  const aesthetic = searchParams.get("aesthetic") || "Digital Minimalist";
  const tagline = searchParams.get("tagline") || "Builder with an artist's eye and a researcher's curiosity";
  const mood = searchParams.get("mood") || "analytical";
  const creativeAnalytical = parseInt(searchParams.get("creative_analytical") || "72");
  const socialSolitary = parseInt(searchParams.get("social_solitary") || "58");
  const consumerCreator = parseInt(searchParams.get("consumer_creator") || "65");

  const palette = getPalette(mood);
  const safeCoreIdentity = coreIdentity.substring(0, 120).replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeTagline = tagline.substring(0, 60).replace(/"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeAesthetic = aesthetic.substring(0, 40).replace(/"/g, "'");

  const sourceBadges = sources.split(',').map((s, i) => {
    const name = s.trim().charAt(0).toUpperCase() + s.trim().slice(1);
    return `
      <rect x="${120 + i * 140}" y="310" width="120" height="40" rx="8" fill="rgba(255,255,255,0.1)" />
      <text x="${180 + i * 140}" y="336" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="white">${name}</text>
    `;
  }).join('');

  const barWidth1 = Math.min(960, Math.max(0, (creativeAnalytical / 100) * 960));
  const barWidth2 = Math.min(960, Math.max(0, (socialSolitary / 100) * 960));
  const barWidth3 = Math.min(960, Math.max(0, (consumerCreator / 100) * 960));

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette[1] || palette[0]};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.1)" />
          <stop offset="100%" style="stop-color:rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />
      
      <!-- Card -->
      <rect x="60" y="60" width="1080" height="510" rx="24" fill="url(#card)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      
      <!-- Header -->
      <text x="120" y="140" font-family="system-ui,sans-serif" font-size="48" font-weight="800" fill="white">VANA SOUL</text>
      <text x="120" y="180" font-family="system-ui,sans-serif" font-size="28" fill="rgba(255,255,255,0.7)">${safeTagline}</text>
      
      <!-- Core Identity -->
      <text x="120" y="250" font-family="system-ui,sans-serif" font-size="22" fill="rgba(255,255,255,0.6)">${safeCoreIdentity}</text>
      
      <!-- Source badges -->
      ${sourceBadges}
      
      <!-- Personality bars -->
      <text x="120" y="400" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">CREATIVE ↔ ANALYTICAL</text>
      <rect x="120" y="410" width="960" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="410" width="${barWidth1}" height="8" rx="4" fill="white" />
      
      <text x="120" y="445" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">SOCIAL ↔ SOLITARY</text>
      <rect x="120" y="455" width="960" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="455" width="${barWidth2}" height="8" rx="4" fill="rgba(255,255,255,0.7)" />
      
      <text x="120" y="490" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">CONSUMER ↔ CREATOR</text>
      <rect x="120" y="500" width="960" height="8" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="120" y="500" width="${barWidth3}" height="8" rx="4" fill="rgba(255,255,255,0.5)" />
      
      <!-- Footer -->
      <text x="120" y="555" font-family="system-ui,sans-serif" font-size="18" fill="rgba(255,255,255,0.5)">Aesthetic: ${safeAesthetic} • Built on Vana Network</text>
      
      <!-- Watermark -->
      <text x="1100" y="560" text-anchor="end" font-family="system-ui,sans-serif" font-size="14" fill="rgba(255,255,255,0.2)">vana-soul.vercel.app</text>
    </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
