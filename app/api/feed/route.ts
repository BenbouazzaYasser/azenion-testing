import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateBearer } from "@/lib/supabase/bearer";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getBranchFeedItems,
  getFeedItemById,
  getFeedItems,
  getSavedFeedItems,
  getTrendingFeedItems,
} from "@/actions/feed.actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/feed — thin bearer-authenticated boundary for feed reads whose
 * enrichment crosses profile/visibility RLS boundaries (the service-role
 * reads in actions/feed.actions.ts + data/interactions.ts).
 *
 * Direct Supabase/RLS remains preferred for everything it can enforce
 * (likes/comments/saves writes, pin toggles via toggle_feed_pin). This route
 * exists only because enrichment joins tables the caller has no SELECT on.
 *
 * Auth: anonymous allowed for public scopes (viewer = null, RPCs expose only
 * public/open content); bearer token sets the viewer (p_viewer) so private
 * team/project content visible to the caller is included. The viewer identity
 * always comes from the validated bearer principal — never from a userId
 * parameter (none exists). Visibility stays enforced inside the feed RPCs
 * via is_feed_post_visible.
 */

const PRIVATE_NO_STORE = "private, no-store";

function secureHeaders(): Record<string, string> {
  return {
    "Cache-Control": PRIVATE_NO_STORE,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

const querySchema = z.object({
  scope: z.enum(["global", "trending", "branch", "saved", "single"]).default("global"),
  filter: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  branchId: z.string().uuid().optional(),
  postId: z.string().uuid().optional(),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function GET(request: Request) {
  const bearer = await authenticateBearer(request);

  // Abuse guards: per-user limit for bearer-authed callers, per-IP limit
  // for anonymous readers. Authenticated callers remain bound to their
  // identity for visibility inside the feed RPCs.
  if (bearer.ok) {
    const rl = await checkRateLimit("feed_read", `user:${bearer.principal.user.id}`, 300, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited — please try again shortly." },
        { status: 429, headers: secureHeaders() },
      );
    }
  } else {
    const rl = await checkRateLimit("feed_read", `ip:${clientIp(request)}`, 120, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited — please try again shortly." },
        { status: 429, headers: secureHeaders() },
      );
    }
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 422, headers: secureHeaders() });
  }
  const { scope, filter, page, pageSize, branchId, postId } = parsed.data;

  try {
    if (scope === "single") {
      if (!postId) {
        return NextResponse.json({ error: "postId is required." }, { status: 422, headers: secureHeaders() });
      }
      const item = await getFeedItemById(postId);
      if (!item) {
        return NextResponse.json({ error: "Not found." }, { status: 404, headers: secureHeaders() });
      }
      return NextResponse.json({ item }, { status: 200, headers: secureHeaders() });
    }

    if (scope === "trending") {
      const { items, total } = await getTrendingFeedItems(pageSize);
      return NextResponse.json({ items, total, page: 1, pageSize }, { status: 200, headers: secureHeaders() });
    }

    if (scope === "branch") {
      if (!branchId) {
        return NextResponse.json({ error: "branchId is required." }, { status: 422, headers: secureHeaders() });
      }
      const { items, total } = await getBranchFeedItems(branchId, page, pageSize);
      return NextResponse.json({ items, total, page, pageSize }, { status: 200, headers: secureHeaders() });
    }

    if (scope === "saved") {
      if (!bearer.ok) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: secureHeaders() });
      }
      const { items, total } = await getSavedFeedItems();
      return NextResponse.json({ items, total, page: 1, pageSize }, { status: 200, headers: secureHeaders() });
    }

    const { items, total } = await getFeedItems(filter ?? "all", page, pageSize);
    return NextResponse.json({ items, total, page, pageSize }, { status: 200, headers: secureHeaders() });
  } catch {
    return NextResponse.json({ error: "Unable to load feed." }, { status: 500, headers: secureHeaders() });
  }
}
