import { NextRequest, NextResponse } from "next/server";
import { gifProvider } from "@/lib/gif/provider";
import { authenticateBearer } from "@/lib/supabase/bearer";
import { checkRateLimit } from "@/lib/rate-limit";

// Server-side GIF search — GIPHY_API_KEY never leaves server (mock fallback when not set).
// Native-callable: accepts an optional bearer token. Anonymous callers (web
// trending/search without a session) keep working under a stricter per-IP
// limit; authenticated callers are keyed by user id. The provider key is
// never included in any response.
const MAX_QUERY_LENGTH = 100;

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  let rateKey: string;
  let rateLimit: number;
  if (authHeader) {
    const bearer = await authenticateBearer(req);
    if (!bearer.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    rateKey = `user:${bearer.principal.user.id}`;
    rateLimit = 120;
  } else {
    rateKey = `ip:${clientIp(req)}`;
    rateLimit = 30;
  }

  const rl = await checkRateLimit("gif_search", rateKey, rateLimit, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited — please try again shortly" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q")?.trim() ?? "").slice(0, MAX_QUERY_LENGTH);
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
