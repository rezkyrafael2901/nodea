// Pure data shapes — no deps, safe for client + server.

export type SourceId = "github" | "instagram" | "spotify" | "youtube" | "steam" | "chatgpt" | "linkedin";

export interface SourceData {
  sourceId: SourceId;
  [key: string]: unknown;
}

export interface FactItem {
  /** short label, e.g. "47 public repos" */
  label: string;
  /** machine-friendly value (number/string/boolean) — never altered by LLM */
  value: number | string | boolean;
}

export interface Insight {
  /** stable trait id from traits.ts (or source id for base traits) */
  id: string;
  /** human title, e.g. "Active open-source contributor" */
  title: string;
  /** emoji for UI */
  emoji: string;
  /** one-line why this insight holds (used as card narrative) */
  narrative: string;
  /** 1-5, higher = more impactful for user */
  strength: number;
  /** fact labels this insight is derived from */
  evidence: string[];
  /** ordered facts this insight is derived from */
  facts: FactItem[];
}

export interface Recommendation {
  sourceId: SourceId;
  insights: Insight[];
  /** fallback (no-LLM) narrative built from templates */
  fallbackNarrative: string;
  /** final narrative: either LLM-enhanced or fallback */
  finalNarrative: string;
  /** true when LLM narrator was used */
  enhanced: boolean;
  /** deterministic signature so we can cache/memoize */
  signature: string;
}

// ---- API response shape (what the client consumes) ----

export type NarratorMode = "auto" | "llm-only" | "rules-only";

export interface Fact {
  label: string;
  value: number | string | boolean;
}

export interface RecommendationResult {
  sourceId: SourceId;
  engine: "llm" | "rules";
  fallbackReason: string | null;
  facts: Fact[];
  recommendations: {
    insight: {
      id: string;
      emoji: string;
      title: string;
      strength: number;
      evidence: string[];
    };
    narrative: string;
  }[];
  narrative: string;
  devMode?: boolean;
  timestamp?: string;
}