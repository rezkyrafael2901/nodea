// LLM Narrator — optional enhancement layer.
// Server-only: takes verified facts/insights, returns a polished narrative.
// NEVER sends raw PII beyond what the app already displays. Timeout-bounded.

import type { Insight } from "./types";

export interface NarratorConfig {
  /** OpenAI-compatible base URL */
  baseUrl?: string;
  /** API key (server-side only) */
  apiKey?: string;
  /** model id, default deepseek-v4-flash-free */
  model?: string;
  /** max ms to wait, default 8000 */
  timeoutMs?: number;
}

export const LLM_MODEL_DEFAULT = "jr/f/mimo-v2.5-free";
const DEFAULT_BASE = process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "";
const DEFAULT_KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "";

export function narratorConfigured(): boolean {
  return Boolean(DEFAULT_BASE && DEFAULT_KEY);
}

/** Compact facts — exactly what the LLM is allowed to reference. */
function factsText(insights: Insight[]): string {
  return insights
    .map(
      (i) =>
        `- ${i.title}: ${i.narrative}${i.facts.length ? ` (data: ${i.facts.map((f) => f.label).join("; ")})` : ""}`,
    )
    .join("\n");
}

/**
 * Ask the LLM to turn verified insights into a warm, actionable narrative.
 * Contract: LLM MUST NOT change facts; it only rewrites in a human voice.
 */
export async function narrate(
  sourceId: string,
  insights: Insight[],
  config: NarratorConfig = {},
): Promise<string> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE;
  const apiKey = config.apiKey ?? DEFAULT_KEY;
  const model = config.model ?? process.env.LLM_MODEL ?? LLM_MODEL_DEFAULT;
  const timeoutMs = config.timeoutMs ?? 30000;

  if (!baseUrl || !apiKey || !insights.length) {
    throw new Error("narrator not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a personal-insight writer for the Nodea app. Task: rewrite the given verified insights into a 3-4 sentence narrative that is warm, personal, and actionable in natural English (global audience). HARD RULES: do not change, add, or remove any facts or numbers. Never invent new data. Focus: make the user feel seen and genuinely helped.",
          },
          {
            role: "user",
            content: `Source: ${sourceId}\nInsights terverifikasi:\n${factsText(insights)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`narrator http ${res.status}`);
    }
    // 9router & some gateways append a streaming trailer ("data: [DONE]") after
    // the JSON body — res.json() would fail. Take the text and trim to last "}".
    const raw = await res.text();
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonEnd < 0) throw new Error("narrator non-json response");
    let j: { choices?: { message?: { content?: string } }[] };
    try {
      j = JSON.parse(raw.slice(0, jsonEnd + 1)) as { choices?: { message?: { content?: string } }[] };
    } catch {
      throw new Error("narrator invalid json");
    }
    const content = j.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("narrator empty response");
    return content;
  } finally {
    clearTimeout(timer);
  }
}
