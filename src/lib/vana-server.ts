/**
 * Vana Data Portability Controller Factory
 *
 * Creates a DirectDataController per source dynamically — server-side only.
 * NEVER import this file in browser code (contains app private key).
 */

import { createDirectDataController } from "@opendatalabs/vana-sdk/server";
import type { DirectDataController, DirectDataControllerConfig } from "@opendatalabs/vana-sdk/server";

// Scope map — web-mode scopes (server-side collectible via ODL Data Pipe,
// works without Vana Desktop, mobile-friendly) vs full/deep scopes.
const SOURCE_SCOPES: Record<string, { web: string[]; full: string[] }> = {
  github: {
    web: ["github.profile"],
    full: ["github.contributions", "github.events", "github.history", "github.profile", "github.repositories", "github.starred"],
  },
  instagram: {
    web: ["instagram.profile"],
    full: ["instagram.profile", "instagram.posts", "instagram.following", "instagram.ads"],
  },
  chatgpt: {
    web: ["chatgpt.conversations"],
    full: ["chatgpt.conversations", "chatgpt.memories"],
  },
  spotify: {
    web: ["spotify.profile"],
    full: ["spotify.playlists", "spotify.profile", "spotify.savedTracks"],
  },
  youtube: {
    web: ["youtube.profile"],
    full: ["youtube.history", "youtube.likes", "youtube.playlists", "youtube.profile", "youtube.subscriptions", "youtube.watchLater"],
  },
  steam: {
    web: ["steam.profile"],
    full: ["steam.profile", "steam.games", "steam.friends"],
  },
  linkedin: {
    web: ["linkedin.profile"],
    full: ["linkedin.profile", "linkedin.experience", "linkedin.education", "linkedin.skills"],
  },
};

export function getSourceScopes(sourceId: string, mode: "web" | "full" = "web"): string[] | null {
  const entry = SOURCE_SCOPES[sourceId];
  if (!entry) return null;
  return mode === "full" ? entry.full : entry.web;
}

export function isValidSource(sourceId: string): boolean {
  return sourceId in SOURCE_SCOPES;
}

/**
 * Create a Vana DirectDataController for a specific source.
 *
 * mode: "web" (default) — server-side collectible scopes, works on mobile & web.
 *       "full" — all scopes for the source (deep data, may need Vana Desktop).
 */
export function createVanaController(sourceId: string, mode: "web" | "full" = "web"): DirectDataController {
  const scopes = getSourceScopes(sourceId, mode);
  if (!scopes) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const config: DirectDataControllerConfig = {
    env: process.env.VANA_ENV === "dev" ? "dev" : "production",
    network: process.env.VANA_NETWORK === "moksha" ? "moksha" : "mainnet",
    appPrivateKey: process.env.VANA_APP_PRIVATE_KEY,
    app: {
      id: process.env.VANA_APP_ID || "nodea",
      name: process.env.VANA_APP_NAME || "Nodea",
      homepageUrl: process.env.VANA_APP_URL || "https://nodea-app.vercel.app",
    },
    source: sourceId,
    scopes: scopes,
    // Escrow settlement: if configured, handles 402 Payment Required automatically.
    // Without escrow, readApprovedData throws PaymentRequiredError for paid reads.
    ...(process.env.VANA_DP_RPC_URL
      ? {
          escrow: {
            escrowContract: process.env.VANA_ESCROW_CONTRACT as `0x${string}` | undefined,
          },
        }
      : {}),
  };

  return createDirectDataController(config);
}

/**
 * Get the app's identity (address + metadata).
 * Uses a default controller (GitHub) since app address is same regardless of source.
 */
export function getAppIdentity() {
  const ctrl = createVanaController("github");
  return ctrl.getAppIdentity();
}
