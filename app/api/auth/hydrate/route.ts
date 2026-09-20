import { NextResponse } from "next/server";
import { authenticateBearer } from "@/lib/supabase/bearer";
import { getLabsAuthContext } from "@/lib/labs/authorization";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/hydrate — post-login authorization snapshot for the future
 * native client. Bearer only, no anonymous access.
 *
 * Every authorization fact comes from a canonical database source evaluated
 * against the validated bearer identity (`auth.uid()` server-side):
 *   - roles / platform-admin: public.roles + public.user_roles +
 *     public.platform_admins (the same tables `has_platform_role()` reads).
 *   - course management: `is_course_manager()` RPC.
 *   - labs: `getLabsAuthContext` (preserves the platform-admin vs
 *     lab-creation capability distinction).
 *   - branch leadership: public.branch_leaders (the table
 *     `is_branch_leader()` reads), joined to branches for display.
 *
 * Never accepts a userId from query/body; never uses service-role; never
 * returns tokens, secrets, other users' data, or raw table rows.
 */

const PRIVATE_NO_STORE = "private, no-store";

function secureHeaders(): Record<string, string> {
  return {
    "Cache-Control": PRIVATE_NO_STORE,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

interface BranchLeadership {
  branch_id: string;
  slug: string;
  name: string;
}

function toBranchLeadership(rows: unknown): BranchLeadership[] {
  if (!Array.isArray(rows)) return [];
  const out: BranchLeadership[] = [];
  for (const row of rows as Array<{
    branch_id?: unknown;
    branches?: { slug?: unknown; name?: unknown } | Array<{ slug?: unknown; name?: unknown }> | null;
  }>) {
    if (typeof row?.branch_id !== "string") continue;
    const embedded = Array.isArray(row.branches) ? (row.branches[0] ?? null) : (row.branches ?? null);
    if (
      !embedded ||
      typeof embedded.slug !== "string" ||
      typeof embedded.name !== "string"
    ) {
      continue;
    }
    out.push({ branch_id: row.branch_id, slug: embedded.slug, name: embedded.name });
  }
  return out;
}

export async function GET(request: Request) {
  const auth = await authenticateBearer(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401, headers: secureHeaders() });
  }

  const { user, supabase } = auth.principal;

  // Rate limit: 60 requests per user per minute
  const rl = await checkRateLimit("auth_hydrate", `user:${user.id}`, 60, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limited — please try again shortly." },
      { status: 429, headers: secureHeaders() },
    );
  }

  const [roleRowsRes, adminRowRes, managerRes, leadershipRes, labs, createRes, publisherTeamsRes] =
    await Promise.all([
      supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
      supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.rpc("is_course_manager"),
      supabase
        .from("branch_leaders")
        .select("branch_id, branches:branch_id (slug, name)")
        .eq("user_id", user.id),
      getLabsAuthContext(supabase, user.id),
      supabase.rpc("can_create_course"),
      supabase.rpc("get_manageable_course_publisher_teams" as never),
    ]);

  if (roleRowsRes.error || adminRowRes.error || leadershipRes.error) {
    return NextResponse.json(
      { error: "Unable to load authorization snapshot." },
      { status: 500, headers: secureHeaders() },
    );
  }

  const roles = new Set<string>();
  for (const row of (roleRowsRes.data ?? []) as Array<{
    roles: { name: string } | { name: string }[] | null;
  }>) {
    const r = row.roles;
    if (!r) continue;
    if (Array.isArray(r)) {
      for (const x of r) roles.add(x.name);
    } else {
      roles.add(r.name);
    }
  }
  // Mirror has_platform_role(): platform admins implicitly hold the
  // platform_admin role.
  if (adminRowRes.data) roles.add("platform_admin");

  const coursePublisherTeams =
    createRes.data === true && Array.isArray(publisherTeamsRes.data)
      ? publisherTeamsRes.data
      : [];

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      roles: [...roles].sort(),
      isPlatformAdmin: labs.isPlatformAdmin,
      isCourseManager: managerRes.data === true,
      isCoursePublisher: createRes.data === true,
      coursePublisherTeams,
      labs: {
        isPlatformAdmin: labs.isPlatformAdmin,
        canCreateLab: labs.canCreateLab,
      },
      branchLeadership: toBranchLeadership(leadershipRes.data),
    },
    { status: 200, headers: secureHeaders() },
  );
}
