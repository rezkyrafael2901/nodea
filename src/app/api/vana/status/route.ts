/**
 * GET /api/vana/status?requestId=...&sourceId=...
 *
 * Polls the status of a Vana access request.
 *
 * Query: { requestId: string, sourceId: string }
 * Returns: { status: string, personalServerUrl?: string, grantId?: string, scope?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createVanaController, isValidSource } from "@/lib/vana-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");
    const sourceId = searchParams.get("sourceId");
    const mode = searchParams.get("mode") === "full" ? "full" : "web";

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    if (!sourceId || !isValidSource(sourceId)) {
      return NextResponse.json({ error: "Missing or invalid sourceId" }, { status: 400 });
    }

    // Never turn a missing production integration into a fake approved request.
    if (!process.env.VANA_APP_PRIVATE_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Vana connection is temporarily unavailable." }, { status: 503 });
      }
      return NextResponse.json({ error: "Vana app private key not configured", devMode: true, status: "approved", requestId, sourceId });
    }

    const controller = createVanaController(sourceId, mode);
    const status = await controller.getAccessRequestStatus(requestId);

    return NextResponse.json({
      ...status,
      sourceId,
      mode,
    });
  } catch (error) {
    console.error("Vana status error:", error);
    const msg = error instanceof Error ? error.message : "Failed to get request status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
