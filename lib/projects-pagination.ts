/**
 * Shared, platform-agnostic pieces of the public project catalog pagination.
 *
 * Plain module (no "use server" / "use client") so it can be imported from
 * server actions, server components, client components and unit tests alike.
 * "use server" modules may only export async functions, which is why the
 * cursor codec and page-size constants live here instead of in
 * actions/projects-list.actions.ts.
 */

export const PROJECTS_PAGE_SIZE = 24;
export const MAX_PROJECTS_PAGE_SIZE = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProjectsCursor {
  createdAt: string;
  id: string;
}

// Mirrors ProjectCardProject (components/sections/projects/project-card.tsx)
// field-for-field without importing the "use client" module. Results stay
// structurally assignable to ProjectCardProject.
export interface ProjectsPageProject {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  visibility: string;
  lifecycle_status: string | null;
  last_activity_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  technologies: string[];
  recruitment: {
    id: string;
    title: string;
    experience: "beginner" | "intermediate" | "advanced";
    positions: number;
    description: string;
  }[];
  categories: { id: string; name: string; slug: string }[];
  owner: { username: string; full_name: string; avatar_url: string | null } | null;
  team: { name: string; slug: string } | null;
  member_count: number;
}

export interface ProjectsPage {
  projects: ProjectsPageProject[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ProjectsFilterMeta {
  technologyOptions: string[];
  allCategories: { id: string; name: string; slug: string }[];
}

/**
 * Opaque keyset cursor: base64url(JSON {c: created_at ISO, i: id}).
 * Absolute position in (created_at DESC, id DESC) order — unlike OFFSET,
 * inserts/deletes elsewhere never shift or duplicate page boundaries.
 */
export function encodeProjectsCursor(cursor: ProjectsCursor): string {
  return Buffer.from(JSON.stringify({ c: cursor.createdAt, i: cursor.id }), "utf8").toString("base64url");
}

export function decodeProjectsCursor(raw: string | null | undefined): ProjectsCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { c?: unknown; i?: unknown };
    if (typeof parsed.c !== "string" || typeof parsed.i !== "string") return null;
    if (!UUID_RE.test(parsed.i)) return null;
    const t = Date.parse(parsed.c);
    if (Number.isNaN(t)) return null;
    return { createdAt: new Date(t).toISOString(), id: parsed.i };
  } catch {
    return null;
  }
}

export function clampProjectsLimit(limit: number): number {
  if (!Number.isFinite(limit)) return PROJECTS_PAGE_SIZE;
  return Math.min(MAX_PROJECTS_PAGE_SIZE, Math.max(1, Math.floor(limit)));
}

/** Minimal shape the walk logic needs: keyset order is (created_at DESC, id DESC). */
export interface CursorOrderedRow {
  created_at: string | null;
  id: string;
}

/**
 * PostgREST predicate for "strictly after cursor" in
 * (created_at DESC, id DESC) order. Exported (not inlined in the action) so
 * the exact predicate text is pinned by lib/projects-pagination.test.ts — a
 * future edit that weakens it to an inclusive bound fails tests by design.
 *
 * Injection safety: both fields come from decodeProjectsCursor (ISO date +
 * UUID-validated), never from raw user input.
 */
export function buildCursorPredicate(cursor: ProjectsCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

/**
 * True when `row` sorts strictly after `cursor` — i.e. it belongs to a later
 * page. This is the JS-side mirror of the DB predicate
 * `created_at < C OR (created_at = C AND id < I)`.
 *
 * CRITICAL INVARIANT (regression: inclusive-bound early termination): the
 * cursor row itself (`created_at = C AND id = I`) must return FALSE. If it
 * ever returns true, the limit+1 probe row is consumed by the cursor row and
 * every walk terminates after page 2. Covered by lib/projects-pagination.test.ts.
 */
export function isRowAfterCursor(
  row: { createdAt: string | null; id: string },
  cursor: ProjectsCursor,
): boolean {
  if (!row.createdAt) return false;
  if (row.createdAt > cursor.createdAt) return false;
  if (row.createdAt === cursor.createdAt && row.id >= cursor.id) return false;
  return true;
}

/**
 * Splits fetched `candidates` (pageSize+1 probe rows) into the page and the
 * hasMore flag. `hasMore` is TRUE iff a probe row exists beyond the page —
 * `>` (not `>=`): with `>=` the final full page would claim a next page that
 * yields nothing, and with the probe row consumed the walk stalls.
 */
export function slicePage<T>(candidates: T[], pageSize: number): { page: T[]; hasMore: boolean } {
  return { page: candidates.slice(0, pageSize), hasMore: candidates.length > pageSize };
}

/**
 * Opaque cursor for the row a page ends on, or null when there is no next
 * page / the page is empty. Round-trips through encode/decodeProjectsCursor.
 */
export function cursorForPageEnd(page: CursorOrderedRow[], hasMore: boolean): string | null {
  const last = page[page.length - 1];
  if (!hasMore || !last?.created_at) return null;
  return encodeProjectsCursor({ createdAt: last.created_at, id: last.id });
}
