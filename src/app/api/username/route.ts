/**
 * POST /api/username
 *
 * Claim / validate a Nodea Tag (username). Mirrors Patina's
 * POST /api/patina/username — the client persists the result locally
 * and sends it here to confirm the tag is well-formed and to receive
 * the referral code + share-of-winnings math.
 *
 * Body: { id: string, username: string }
 *
 * Response: { ok, username, referralCode, referralUrl, referrerCut, reward }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  REWARD_CONFIG,
  referralCodeFor,
  referralUrl,
  referrerCut,
} from "@/lib/rewards";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

export async function POST(request: NextRequest) {
  let body: { id?: string; username?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const id = (body.id ?? "").slice(0, 80);
  const raw = (body.username ?? "").slice(0, 32);

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }
  if (!USERNAME_RE.test(raw)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Tag must be 3–24 characters: letters, numbers, _ or -.",
      },
      { status: 400 }
    );
  }

  const username = raw;
  const code = referralCodeFor(username);
  const cut = referrerCut(REWARD_CONFIG.championPayout);

  return NextResponse.json({
    ok: true,
    username,
    referralCode: code,
    referralUrl: referralUrl(code),
    referrerCut: cut,
    reward: {
      shareOfWinnings: REWARD_CONFIG.shareOfWinnings,
      places: REWARD_CONFIG.places,
      championPrize: REWARD_CONFIG.championPrize,
      runnerUpPrize: REWARD_CONFIG.runnerUpPrize,
      cupClosesAt: REWARD_CONFIG.cupClosesAt,
      paidBy: REWARD_CONFIG.paidBy,
    },
  });
}