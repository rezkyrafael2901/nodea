/**
 * POST /api/vana/request
 *
 * Creates a Vana access request for a specific data source.
 * The user will approve this in a separate browser tab via approvalUrl.
 *
 * Body: { sourceId: string, mode?: "web" | "full" }
 *   mode "web"  (default) — server-side collectible scopes, works on mobile & web.
 *   mode "full"           — all scopes (deep data, may require Vana Desktop).
 * Returns: { requestId: string, approvalUrl: string, appAddress: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createVanaController, isValidSource } from "@/lib/vana-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, mode = "web" } = body;

    if (!sourceId || !isValidSource(sourceId)) {
      return NextResponse.json(
        { error: `Invalid or unsupported source: ${sourceId}` },
        { status: 400 }
      );
    }

    // Check if app private key is configured
    if (!process.env.VANA_APP_PRIVATE_KEY) {
      return NextResponse.json(
        {
          error: "Vana app private key not configured. Set VANA_APP_PRIVATE_KEY in environment.",
          devMode: true,
          sourceId,
          mode,
        },
        { status: 501 }
      );
    }

    // Create a controller for this specific source + mode
    const controller = createVanaController(sourceId, mode === "full" ? "full" : "web");

    // Create the access request with a return URL pointing back to our app
    const baseUrl = process.env.VANA_APP_URL || "https://nodea.my.id";
    const returnUrl = `${baseUrl}/connect/return?source=${sourceId}&mode=${mode}`;

    const request_data = await controller.createAccessRequest({ returnUrl });

    return NextResponse.json({
      requestId: request_data.requestId,
      approvalUrl: request_data.approvalUrl,
      appAddress: request_data.appAddress,
      sourceId,
      mode,
    });
  } catch (error) {
    console.error("Vana request error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create access request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
