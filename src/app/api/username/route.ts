/**
 * POST /api/username
 *
 * Claim / validate a Nodea Tag (username). The client persists the
 * result locally and sends it here to confirm the tag is well-formed.
 *
 * Body: { id: string, username: string }
 *
 * Response: { ok, username, reward }
 */

import { NextRequest, NextResponse } from "next/server";
import { REWARD_CONFIG } from "@/lib/rewards";

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

  return NextResponse.json({
    ok: true,
    username,
    reward: {
      places: REWARD_CONFIG.places,
      championPrize: REWARD_CONFIG.championPrize,
      runnerUpPrize: REWARD_CONFIG.runnerUpPrize,
      cupClosesAt: REWARD_CONFIG.cupClosesAt,
      paidBy: REWARD_CONFIG.paidBy,
    },
  });
}