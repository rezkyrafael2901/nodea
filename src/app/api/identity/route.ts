import { NextResponse } from "next/server";
import { buildIdentityPrompt, getPalette, type IdentityData } from "@/lib/vana-sources";

export async function POST(request: Request) {
  try {
    const { prompt, sources }: { prompt: string; sources: IdentityData[] } =
      await request.json();

    // Use AI provider — OpenRouter (configurable via env)
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // FALLBACK: return mock analysis (for development/demo)
      return NextResponse.json(getMockAnalysis(sources));
    }

    const endpoint = process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.anthropic.com/v1/messages";

    const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

    if (useOpenRouter) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nodea.vercel.app",
          "X-Title": "Nodea",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-20250514",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return NextResponse.json(getMockAnalysis(sources));
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(getMockAnalysis(sources));
      }

      try {
        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);
      } catch {
        return NextResponse.json(getMockAnalysis(sources));
      }
    }

    // Anthropic native API
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.7,
        system: "You are an AI that analyzes human digital identity across multiple social platforms. You must respond with ONLY valid JSON matching the exact schema requested. No markdown, no explanation.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(getMockAnalysis(sources));
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(getMockAnalysis(sources));
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(getMockAnalysis(sources));
    }

  } catch (error) {
    console.error("Identity API error:", error);
    return NextResponse.json(getMockAnalysis([]));
  }
}

function getMockAnalysis(sources: IdentityData[]): Record<string, unknown> {
  const sourceNames = sources.map((s) => s.source);
  const hasCode = sourceNames.includes("github");
  const hasSocial = sourceNames.includes("instagram") || sourceNames.includes("youtube");
  const hasMusic = sourceNames.includes("spotify");
  const hasAI = sourceNames.includes("chatgpt");

  const palettes: string[][] = [
    ["#0a0a0a", "#16213e", "#e2e2e2"],
    ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    ["#2C3E50", "#3498DB", "#ECF0F1"],
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];

  const cores = [
    "A multi-disciplinary creator who bridges technical depth with creative expression. Your digital footprint reveals someone who builds as much as you consume.",
    "An analytical mind with an artistic soul. You approach problems methodically but express yourself freely through creative channels.",
    "A curious explorer at the intersection of technology and human experience. You connect dots others miss.",
    "A digital-native polymath — equal parts builder, consumer, and creator across your connected platforms.",
  ];

  return {
    core_identity: cores[Math.floor(Math.random() * cores.length)],
    personality_scores: {
      creative_analytical: hasCode ? Math.floor(Math.random() * 30 + 50) : 45,
      social_solitary: hasSocial ? Math.floor(Math.random() * 40 + 40) : 35,
      consumer_creator: 62,
      risk_taker_caution: 48,
      optimistic_realistic: 55,
    },
    hidden_patterns: [
      `Your ${sourceNames.join(" + ")} profile reveals consistent creative problem-solving across all platforms`,
      hasCode ? "Technical curiosity drives both your code and your content consumption" : "Deep engagement patterns suggest systematic thinking",
      `Cross-platform consistency in ${sourceNames.slice(0, 2).join(" and ")} interests shows authentic self-expression`,
    ],
    aesthetic: "Digital Minimalist with creative undertones",
    fun_facts: [
      "Your combined data shows more unique activity patterns than 80% of users",
      "You spend more time building/creating than 70% of your peer group",
      "Your data spans 4+ distinct interest domains — rare cross-pollination",
    ],
    soul_tagline: "Builder with an artist's eye and a researcher's curiosity",
    mood: "analytical",
    dominant_colors: palette,
  };
}
