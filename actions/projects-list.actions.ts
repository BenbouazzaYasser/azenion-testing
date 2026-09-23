"use server";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIFECYCLE, getProjectLifecycleStatus } from "@/lib/lifecycle";
import {
  buildCursorPredicate,
  clampProjectsLimit,
  cursorForPageEnd,
  decodeProjectsCursor,
  isRowAfterCursor,
  PROJECTS_PAGE_SIZE,
  slicePage,
  type ProjectsCursor,
  type ProjectsFilterMeta,
  type ProjectsPage,
  type ProjectsPageProject,
} from "@/lib/projects-pagination";

const FILTER_META_REVALIDATE_SECONDS = 300;
const PAGE_REVALIDATE_SECONDS = 30;

function parseRecruitment(raw: unknown) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const PRIVATE_PREFIX = "private-media/";
const isPrivate = (v: string | null | undefined): boolean =>
  typeof v === "string" && v.startsWith(PRIVATE_PREFIX);
const objectPath = (m: string) => m.slice(PRIVATE_PREFIX.length);
const isSafePath = (p: string) =>
  p.length > 0 &&
  p.length <= 500 &&
  !p.includes("..") &&
  /^[A-Za-z0-9._\/-]+$/.test(p) &&
  (p.startsWith("team/") || p.startsWith("project/"));

async function resolvePrivateLogos(
  adminClient: ReturnType<typeof createAdminClient>,
  logos: (string | null)[],
): Promise<Map<string, string>> {
  const paths = new Set<string>();
  for (const logo of logos) {
    if (isPrivate(logo)) {
      const op = objectPath(logo as string);
      if (isSafePath(op)) paths.add(op);
    }
  }
  const map = new Map<string, string>();
  if (paths.size === 0) return map;
  try {
    const { data } = await adminClient.storage.from("private-media").createSignedUrls([...paths], 60);
    if (data) {
      for (const e of data) {
        if (!e.error && e.signedUrl && e.path) map.set(`${PRIVATE_PREFIX}${e.path}`, e.signedUrl);
      }
    }
  } catch {
    // Storage failure → private logos resolve to null (filtered below).
  }
  return map;
}

/**
 * One page of the public catalog, newest-first.
 *
 * DB work per cold page (all small, indexed):
 *   1. projects range scan ORDER BY created_at DESC, id DESC LIMIT n+1
 *      (covered by idx_projects_created_id_desc; ARCHIVED excluded in-DB via
 *      last_activity_at cutoff so pages stay full)
 *   2. project_members for just this page's ids (batched .in)
 *   3. project_category_members for just this page's ids (batched .in)
 *   4. project_categories (tiny table, ~11 rows) for name resolution
 *   5. at most one storage createSignedUrls batch for private logos
 *
 * `cursor`/`limit` are primitives, so unstable_cache keys each page
 * separately: ["projects-page", cursor, limit]. A cursor is an absolute
 * position, therefore a cached page never goes stale when other pages change
 * — only brand-new projects (first page, null cursor) take up to 30s to
 * appear, the same freshness as the previous full-catalog cache.
 */
async function fetchPublicProjectsPage(
  cursor: string | null,
  limit: number,
): Promise<ProjectsPage> {
  const pageSize = clampProjectsLimit(limit);
  const parsed = decodeProjectsCursor(cursor);
  // Invalid cursor → fail safe to first page (never throw into the UI).
  const cursorPos: ProjectsCursor | null = parsed;
  const adminClient = createAdminClient();

  const archiveCutoffIso = new Date(Date.now() - LIFECYCLE.projectArchiveDays * 24 * 60 * 60 * 1000).toISOString();

  let query = adminClient
    .from("projects")
    .select(`
      id,
      slug,
      name,
      description,
      logo_url,
      visibility,
      lifecycle_status,
      last_activity_at,
      created_at,
      updated_at,
      technologies,
      recruitment,
      owner:owner_id ( username, full_name, avatar_url ),
      team:team_id ( name, slug )
    `)
    // Public catalog mirrors RLS (00012): only open projects are listed —
    // the admin client bypasses RLS, so the filter must be explicit here.
    .eq("visibility", "open")
    // ARCHIVED (= inactive >60d) excluded in-DB so pages stay full. Mirrors
    // getProjectLifecycleStatus: null last_activity_at counts as ACTIVE.
    .or(`last_activity_at.is.null,last_activity_at.gt.${archiveCutoffIso}`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (cursorPos) {
    // Exclusive keyset predicate (see buildCursorPredicate). A second .or()
    // ANDs with the archived filter (postgrest-js appends `or` params;
    // PostgREST ANDs repeated groups). Exclusive (not lte) so the +1
    // over-fetch row is always a genuinely new row — an inclusive bound
    // would eat the probe row as the cursor row itself and every walk
    // would terminate after page 2.
    query = query.or(buildCursorPredicate(cursorPos));
  }

  const [{ data: rows }, { data: allCategories }] = await Promise.all([
    query,
    adminClient.from("project_categories").select("id, name, slug").order("name"),
  ]);

  let candidates = rows ?? [];
  if (cursorPos) {
    // Safety net (normally a no-op — the DB predicate is exclusive):
    // drop anything at-or-after the cursor. Uses the tested isRowAfterCursor
    // so the exclusivity invariant can't drift from lib/projects-pagination.
    candidates = candidates.filter((r) =>
      isRowAfterCursor({ createdAt: r.created_at as string | null, id: r.id as string }, cursorPos),
    );
  }
  // Belt-and-suspenders: DB cutoff uses the same 60d rule, but keep the JS
  // lifecycle check so a drifted ecosystem_config can never leak ARCHIVED.
  candidates = candidates.filter(
    (p) => getProjectLifecycleStatus(p.last_activity_at as string | null) !== "ARCHIVED",
  );

  const { page, hasMore } = slicePage(candidates, pageSize);
  const pageIds = page.map((p) => p.id as string);

  const [memberRes, edgeRes] = await Promise.all([
    pageIds.length > 0
      ? adminClient.from("project_members").select("project_id").in("project_id", pageIds)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
    pageIds.length > 0
      ? adminClient.from("project_category_members").select("project_id, category_id").in("project_id", pageIds)
      : Promise.resolve({ data: [] as { project_id: string; category_id: string }[] }),
  ]);

  const memberCountMap = new Map<string, number>();
  for (const row of memberRes.data ?? []) {
    memberCountMap.set(row.project_id, (memberCountMap.get(row.project_id) ?? 0) + 1);
  }

  const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const cat of allCategories ?? []) categoryMap.set(cat.id, cat);
  const projectCategoryMap = new Map<string, string[]>();
  for (const edge of edgeRes.data ?? []) {
    const ids = projectCategoryMap.get(edge.project_id) ?? [];
    ids.push(edge.category_id);
    projectCategoryMap.set(edge.project_id, ids);
  }

  const markerToUrl = await resolvePrivateLogos(
    adminClient,
    page.map((p) => p.logo_url as string | null),
  );

  const projects: ProjectsPageProject[] = page.map((p) => {
    const rawLogo = p.logo_url as string | null;
    const resolvedLogo = rawLogo && isPrivate(rawLogo) ? (markerToUrl.get(rawLogo) ?? null) : rawLogo;
    return {
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      description: p.description as string | null,
      logo_url: resolvedLogo,
      visibility: p.visibility as string,
      lifecycle_status: p.lifecycle_status as string | null,
      last_activity_at: p.last_activity_at as string | null,
      created_at: p.created_at as string | null,
      updated_at: p.updated_at as string | null,
      technologies: Array.isArray(p.technologies) ? (p.technologies as string[]) : [],
      recruitment: parseRecruitment(p.recruitment) as ProjectsPageProject["recruitment"],
      categories: (projectCategoryMap.get(p.id as string) ?? [])
        .map((cid) => categoryMap.get(cid))
        .filter(Boolean) as { id: string; name: string; slug: string }[],
      owner: p.owner as unknown as ProjectsPageProject["owner"],
      team: p.team as unknown as ProjectsPageProject["team"],
      member_count: memberCountMap.get(p.id as string) ?? 0,
    };
  });

  // The keyset runs on created_at (not last_activity_at).
  const nextCursor = cursorForPageEnd(
    page.map((p) => ({ created_at: p.created_at as string | null, id: p.id as string })),
    hasMore,
  );

  return { projects, nextCursor, hasMore };
}

/**
 * Filter chips + category list for the catalog. Deliberately separate from
 * pages: technology options need a wide (but narrow-column) scan, so they are
 * cached 5 minutes instead of per-page 30s. Eventually consistent — new tech
 * tags appear in filters within 5 min.
 */
async function fetchProjectsFilterMeta(): Promise<ProjectsFilterMeta> {
  const adminClient = createAdminClient();
  const [{ data: techRows }, { data: allCategories }] = await Promise.all([
    adminClient.from("projects").select("technologies").eq("visibility", "open").limit(1000),
    adminClient.from("project_categories").select("id, name, slug").order("name"),
  ]);

  const allTechs = new Set<string>();
  for (const row of techRows ?? []) {
    const techs = (row as { technologies?: unknown }).technologies;
    if (Array.isArray(techs)) {
      for (const t of techs) {
        if (typeof t === "string" && t) allTechs.add(t);
      }
    }
  }
  const technologyOptions = [...allTechs].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return { technologyOptions, allCategories: (allCategories as ProjectsFilterMeta["allCategories"]) ?? [] };
}

const isTestEnv =
  process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.VITEX_TEST === "true";

const getCachedPublicProjectsPage = isTestEnv
  ? fetchPublicProjectsPage
  : unstable_cache(fetchPublicProjectsPage, ["projects-page"], {
      revalidate: PAGE_REVALIDATE_SECONDS,
    });

const getCachedProjectsFilterMeta = isTestEnv
  ? fetchProjectsFilterMeta
  : unstable_cache(fetchProjectsFilterMeta, ["projects-filter-meta"], {
      revalidate: FILTER_META_REVALIDATE_SECONDS,
    });

export async function getPublicProjectsPage(
  cursor: string | null,
  limit: number = PROJECTS_PAGE_SIZE,
): Promise<ProjectsPage> {
  return getCachedPublicProjectsPage(cursor, clampProjectsLimit(limit));
}

export async function getProjectsFilterMeta(): Promise<ProjectsFilterMeta> {
  return getCachedProjectsFilterMeta();
}

/**
 * Client-facing "load more" action. Thin validation wrapper over the cached
 * page fetcher — cursor opacity + limit clamp enforced server-side.
 */
export async function getProjectsPageAction(
  cursor: string | null,
  limit: number = PROJECTS_PAGE_SIZE,
): Promise<ProjectsPage> {
  return getPublicProjectsPage(cursor, clampProjectsLimit(limit));
}
