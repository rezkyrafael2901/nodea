import { NextResponse } from "next/server";
import { buildSoulCardSvg, parseOgParams } from "@/lib/og-card";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const svg = buildSoulCardSvg(parseOgParams(searchParams));

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
