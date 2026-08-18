/**
 * GET /api/vana/data?requestId=...&sourceId=...
 *
 * Reads approved data from the user's Personal Server.
 * Handles 402 Payment Required automatically if escrow is configured.
 *
 * Query: { requestId: string, sourceId: string }
 * Returns: { scope: string, data: T, payment?: DirectPaymentReceipt }
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

    // Check if app private key is configured
    if (!process.env.VANA_APP_PRIVATE_KEY) {
      // Dev mode: return mock data when real SDK is not configured
      const { default: mockData } = await import("./mock-data");
      const data = mockData(sourceId);
      return NextResponse.json({
        scope: sourceId,
        data,
        sourceId,
        devMode: true,
        timestamp: new Date().toISOString(),
      });
    }

    const controller = createVanaController(sourceId, mode);
    const result = await controller.readApprovedData({ requestId });

    return NextResponse.json({
      ...result,
      sourceId,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Vana data error:", error);
    const msg = error instanceof Error ? error.message : "Failed to read approved data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
