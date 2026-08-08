import { ImageResponse } from "@vercel/og";
import { parseOgParams } from "@/lib/og-card";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const THEME_BG: Record<string, string> = {
  midnight: "linear-gradient(135deg, #0a0a0a, #16213e)",
  neon: "linear-gradient(135deg, #0f0c29, #24243e)",
  glass: "linear-gradient(135deg, #101418, #1c2530)",
};

const THEME_CARD_BG: Record<string, string> = {
  midnight: "rgba(255,255,255,0.06)",
  neon: "rgba(168,85,247,0.12)",
  glass: "rgba(255,255,255,0.07)",
};

const THEME_CARD_BORDER: Record<string, string> = {
  midnight: "1px solid rgba(255,255,255,0.15)",
  neon: "1px solid rgba(168,85,247,0.6)",
  glass: "1px solid rgba(255,255,255,0.3)",
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

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const p = parseOgParams(searchParams);

  const palette = getPalette(p.mood || "analytical");
  const score = clamp(p.score ?? 0);
  const grade = (p.grade || "D").toUpperCase().slice(0, 1);
  const ref = (p.ref || "").substring(0, 30);
  const sources = (p.sources || "github,instagram").split(",").slice(0, 5);
  const coreIdentity = (p.identity || "A multi-disciplinary creator bridging technical depth with creative expression.").substring(0, 120);
  const tagline = (p.tagline || "What your data says about you").substring(0, 60);
  const aesthetic = (p.aesthetic || "Digital Minimalist").substring(0, 40);

  const gradeColor =
    grade === "S" ? "#fbbf24" :
    grade === "A" ? "#a78bfa" :
    grade === "B" ? "#38bdf8" :
    grade === "C" ? "#34d399" : "#a3a3a3";

  const themeKey = ["midnight", "neon", "glass"].includes(p.theme || "") ? (p.theme as string) : "midnight";
  const traitEmoji = TRAIT_EMOJIS[p.trait || ""] || "";
  const traitLabel = TRAIT_LABELS[p.trait || ""] || "";

  const bars = [
    { label: "CREATIVE ↔ ANALYTICAL", v: clamp(p.creative_analytical ?? 72), c: "255,255,255" },
    { label: "SOCIAL ↔ SOLITARY", v: clamp(p.social_solitary ?? 58), c: "255,255,255" },
    { label: "CONSUMER ↔ CREATOR", v: clamp(p.consumer_creator ?? 65), c: "255,255,255" },
  ];

  const res = new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: THEME_BG[themeKey],
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: THEME_CARD_BG[themeKey],
            border: THEME_CARD_BORDER[themeKey],
            borderRadius: 24,
            padding: "48px 60px",
            position: "relative",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: "white", letterSpacing: -1, display: "flex" }}>NODEA</div>
              <div style={{ fontSize: 24, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex" }}>{tagline}</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: "14px 22px",
              }}
            >
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 600, display: "flex" }}>GRADE</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: gradeColor, display: "flex" }}>{grade}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "white", display: "flex", alignItems: "baseline", gap: 2 }}>
                {score}/100
              </div>
            </div>
          </div>

          {/* Core identity */}
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 28, display: "flex" }}>{coreIdentity}</div>

          {/* Trait badge */}
          {traitLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 20,
                padding: "6px 16px",
                fontSize: 15,
                fontWeight: 600,
                color: "white",
                marginTop: 16,
                alignSelf: "flex-start",
              }}
            >
              <span>{traitEmoji}</span>
              <span>{traitLabel}</span>
            </div>
          ) : null}

          {/* Source badges */}
          <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
            {sources.map((s) => (
              <div
                key={s}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "10px 22px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "white",
                }}
              >
                {s.trim().charAt(0).toUpperCase() + s.trim().slice(1)}
              </div>
            ))}
          </div>

          {/* Soul Score bar */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex" }}>SOUL SCORE</div>
            <div
              style={{
                marginTop: 6,
                height: 12,
                width: "100%",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${score}%`,
                  background: `linear-gradient(90deg, ${gradeColor}, ${palette[2] || "#ffffff"})`,
                  borderRadius: 6,
                }}
              />
            </div>
          </div>

          {/* Personality bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
            {bars.map((b) => (
              <div key={b.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex" }}>{b.label}</div>
                <div
                  style={{
                    marginTop: 5,
                    height: 8,
                    width: "100%",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 4,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${b.v}%`,
                      background: `rgba(${b.c},${b.label.includes("ANALYTICAL") ? "1" : b.label.includes("SOLITARY") ? "0.7" : "0.5"})`,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
              paddingTop: 24,
            }}
          >
            <div style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", display: "flex", gap: 4 }}>
              Aesthetic: {aesthetic} • Built on Vana Network
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", display: "flex", gap: 4 }}>
              nodea.my.id{ref ? ` · via ${ref}` : ""}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    }
  );

  const buf = await res.arrayBuffer();
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
