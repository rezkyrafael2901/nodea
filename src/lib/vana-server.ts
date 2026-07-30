/**
 * Vana Data Portability Controller Factory
 *
 * Creates a DirectDataController per source dynamically — server-side only.
 * NEVER import this file in browser code (contains app private key).
 */

import { createDirectDataController } from "@opendatalabs/vana-sdk/server";
import type { DirectDataController, DirectDataControllerConfig } from "@opendatalabs/vana-sdk/server";

// Valid source IDs with their scopes
const SOURCE_SCOPES: Record<string, string[]> = {
  github: ["github.contributions", "github.events", "github.history", "github.profile", "github.repositories", "github.starred"],
  instagram: ["instagram.profile", "instagram.posts", "instagram.following", "instagram.ads"],
  chatgpt: ["chatgpt.conversations", "chatgpt.memories"],
  spotify: ["spotify.playlists", "spotify.profile", "spotify.savedTracks"],
  youtube: ["youtube.history", "youtube.likes", "youtube.playlists", "youtube.profile", "youtube.subscriptions", "youtube.watchLater"],
  steam: ["steam.profile", "steam.games", "steam.friends"],
};

export function getSourceScopes(sourceId: string): string[] | null {
  return SOURCE_SCOPES[sourceId] ?? null;
}

export function isValidSource(sourceId: string): boolean {
  return sourceId in SOURCE_SCOPES;
}

/**
 * Create a Vana DirectDataController for a specific source.
 *
 * Each controller is scoped to ONE source + its scopes.
 * For multi-source apps, create a new controller per source per request.
 */
export function createVanaController(sourceId: string): DirectDataController {
  const scopes = getSourceScopes(sourceId);
  if (!scopes) {
    throw new Error(`Unknown source: ${sourceId}`);
  }

  const config: DirectDataControllerConfig = {
    env: process.env.VANA_ENV === "dev" ? "dev" : "production",
    network: process.env.VANA_NETWORK === "moksha" ? "moksha" : "mainnet",
    appPrivateKey: process.env.VANA_APP_PRIVATE_KEY,
    app: {
      id: process.env.VANA_APP_ID || "vana-soul",
      name: process.env.VANA_APP_NAME || "Vana Soul",
      homepageUrl: process.env.VANA_APP_URL || "https://vana-soul.vercel.app",
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
