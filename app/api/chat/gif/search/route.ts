import { NextRequest, NextResponse } from "next/server";
import { gifProvider } from "@/lib/gif/provider";

// Server-side GIF search — GIPHY_API_KEY never leaves server (mock fallback when not set)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Math.min(Number(limitRaw) || 12, 25) : 12;
  const offset = offsetRaw ? Number(offsetRaw) || 0 : 0;

  try {
    const results = q ? await gifProvider.search({ query: q, limit, offset }) : await gifProvider.trending(limit);
    // Return minimal data needed for picker + attribution
    return NextResponse.json(
      {
        provider: gifProvider.providerId,
        attribution: "Powered by GIPHY",
        results,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "GIF search failed";
    const status = msg.toLowerCase().includes("rate limited") ? 429 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
