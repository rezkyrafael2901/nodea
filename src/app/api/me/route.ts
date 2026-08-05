/**
 * GET /api/me
 *
 * Returns the current Nodea identity profile for a device id.
 * This app keeps identity client-side (localStorage); the API exists
 * to (1) validate the device id shape, (2) return the referral link,
 * (3) act as the hook for a future server-side leaderboard entry.
 *
 * Query: { id?: string, username?: string }
 *
 * Response: { ok, identity: { id, username, referralCode, referralUrl } }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  REWARD_CONFIG,
  referralCodeFor,
  referralUrl,
} from "@/lib/rewards";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.slice(0, 80) ?? null;
  const username = request.nextUrl.searchParams.get("username")?.slice(0, 24) ?? null;

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const cleanUsername = username && USERNAME_RE.test(username) ? username : null;
  const code = cleanUsername ? referralCodeFor(cleanUsername) : null;

  return NextResponse.json({
    ok: true,
    identity: {
      id,
      username: cleanUsername,
      referralCode: code,
      referralUrl: code ? referralUrl(code) : null,
    },
    reward: {
      shareOfWinnings: REWARD_CONFIG.shareOfWinnings,
      places: REWARD_CONFIG.places,
      cupClosesAt: REWARD_CONFIG.cupClosesAt,
    },
  });
}