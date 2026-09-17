/**
 * Integration test: catalog keyset pagination against a REAL database.
 *
 * Same invariant as the mocked walk in lib/projects-pagination.test.ts, but
 * exercised through the deployed query (actions/projects-list.actions.ts)
 * instead of the helpers in isolation — this is what catches drift between
 * the SQL predicate and the helper logic (e.g. the inclusive-bound bug that
 * stalled every walk after page 2).
 *
 * TARGET: test/staging Supabase or local `supabase start`. NEVER production:
 * the file refuses any URL containing the production project ref, and refuses
 * to run at all unless PROJECTS_PAGINATION_IT=1. Default `npm test` skips it
 * (suite stays fast and offline); CI runs it on PRs touching the pagination
 * files (see .github/workflows/projects-pagination-it.yml).
 *
 * It seeds 45 rows + 3 users + 3 categories under a run-unique slug prefix
 * and deletes ALL of it in a finally block + afterEach fallback (both
 * prefix-scoped and idempotent), so even a failed run leaves zero residue.
 * The target must be an isolated DB — see the in-test precondition.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const ENABLED = process.env.PROJECTS_PAGINATION_IT === "1";
const IT_URL = process.env.PROJECTS_PAGINATION_IT_URL ?? "";
const IT_SERVICE_KEY = process.env.PROJECTS_PAGINATION_IT_SERVICE_KEY ?? "";
const PROD_REF = "cytwlxpomhzdezgwlbhv";

const SEED_ROWS = 45;
const PAGE_SIZE = 10; // 45 rows → pages 10/10/10/10/5 (4 boundaries)

function targetClient() {
  return createClient(IT_URL, IT_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe.skipIf(!ENABLED)("projects pagination (integration, isolated DB)", () => {
  const runId = `itpg-${Date.now().toString(36)}`;
  const prefix = `seed-${runId}-`;
  const createdUserIds: string[] = [];

  // NOTE: guards live inside the test body (not here): a skipped suite must
  // never throw at collection time during a plain `npm test`.

  // Saved process env (the actions read env lazily per call).
  const saved = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    svc: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  function pointAtTarget() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = IT_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "it-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = IT_SERVICE_KEY;
  }
  function restoreEnv() {
    if (saved.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = saved.url;
    if (saved.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = saved.anon;
    if (saved.svc === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.svc;
  }

  async function cleanup() {
    const admin = targetClient();
    // Projects first: members, category edges and trigger-created channels
    // all cascade from projects. Always re-read from offset 0 — rows shift
    // down as batches are deleted, so a rising offset would skip rows.
    for (;;) {
      const { data } = await admin
        .from("projects")
        .select("id")
        .like("slug", `${prefix}%`)
        .range(0, 99);
      if (!data || data.length === 0) break;
      await admin.from("projects").delete().in("id", data.map((r: { id: string }) => r.id));
    }
    await admin.from("project_categories").delete().like("slug", `${prefix}%`);
    for (const uid of createdUserIds.splice(0)) {
      await admin.auth.admin.deleteUser(uid);
    }
  }

  // Belt-and-suspenders: suite-level fallback if the in-test finally is
  // somehow bypassed (e.g. worker teardown). Prefix-scoped → idempotent.
  afterEach(async () => {
    if (ENABLED) {
      pointAtTarget();
      try {
        await cleanup();
      } finally {
        restoreEnv();
      }
    }
  });

  it(
    "walks 5 pages visiting every row exactly once, in order",
    async () => {
      if (IT_URL.includes(PROD_REF)) {
        throw new Error(
          "projects-pagination.it: refusing to run against the production database. " +
            "Point PROJECTS_PAGINATION_IT_URL at a staging project or local `supabase start`.",
        );
      }
      if (!IT_URL || !IT_SERVICE_KEY) {
        throw new Error(
          "projects-pagination.it: set PROJECTS_PAGINATION_IT_URL and PROJECTS_PAGINATION_IT_SERVICE_KEY.",
        );
      }
      pointAtTarget();
      // Dynamic import AFTER env override so the actions resolve the IT target.
      const { getPublicProjectsPage } = await import("@/actions/projects-list.actions");
      try {
        // Isolation precondition: the walk asserts exact page contents, so
        // the target must hold no other projects (fresh `supabase db reset`
        // in CI). Fail loudly instead of asserting against foreign data.
        const pre = targetClient();
        const { count: preCount } = await pre
          .from("projects")
          .select("id", { count: "exact", head: true });
        if ((preCount ?? 0) !== 0) {
          throw new Error(
            `projects-pagination.it: target DB is not isolated (${preCount} pre-existing projects). ` +
              "Use a fresh `supabase db reset` target.",
          );
        }
        const admin = targetClient();
        const base = Date.now();

        // ── Seed: 3 owners (trigger-created profiles) + 3 categories ──
        const ownerIds: string[] = [];
        for (let k = 0; k < 3; k++) {
          const { data, error } = await admin.auth.admin.createUser({
            email: `${prefix}owner${k}@example.test`,
            password: "it-test-password-123",
            email_confirm: true,
            user_metadata: { username: `${prefix}owner${k}`, full_name: `IT Owner ${k}` },
          });
          if (error || !data.user) throw new Error(`seed user failed: ${error?.message}`);
          createdUserIds.push(data.user.id);
          ownerIds.push(data.user.id);
        }
        // Defensive: profiles must exist (handle_new_user trigger in 00001).
        const { data: profs } = await admin.from("profiles").select("id").in("id", ownerIds);
        expect((profs ?? []).map((p: { id: string }) => p.id).sort()).toEqual([...ownerIds].sort());

        const catIds: string[] = [];
        for (let k = 0; k < 3; k++) {
          const { data, error } = await admin
            .from("project_categories")
            .insert({ name: `${prefix}cat ${k}`, slug: `${prefix}cat-${k}` })
            .select("id")
            .single();
          if (error || !data) throw new Error(`seed category failed: ${error?.message}`);
          catIds.push((data as { id: string }).id);
        }

        // ── Seed: 45 projects, distinct created_at (deterministic order) ──
        const seed = Array.from({ length: SEED_ROWS }, (_, i) => ({
          team_id: null,
          owner_id: ownerIds[i % ownerIds.length] as string,
          name: `${prefix}project ${i}`,
          slug: `${prefix}${String(i).padStart(3, "0")}`,
          description: `pagination IT row ${i}`,
          visibility: "open",
          created_at: new Date(base - i * 60_000).toISOString(),
          last_activity_at: new Date(base - i * 60_000).toISOString(),
          technologies: i % 2 === 0 ? ["Next.js"] : ["Python", "Go"],
          recruitment: [],
        }));
        const { error: pErr } = await admin.from("projects").insert(seed);
        if (pErr) throw new Error(`seed projects failed: ${pErr.message}`);
        const { data: seedRows } = await admin
          .from("projects")
          .select("id,created_at")
          .like("slug", `${prefix}%`)
          .order("slug");
        expect(seedRows).toHaveLength(SEED_ROWS);

        // Members + edges (realistic per-page follow-up shape).
        const { data: idRows } = await admin.from("projects").select("id").like("slug", `${prefix}%`);
        const ids = (idRows ?? []).map((r: { id: string }) => r.id);
        await admin.from("project_members").insert(
          ids.map((id: string, i: number) => ({
            project_id: id,
            user_id: ownerIds[i % ownerIds.length] as string,
            role: "owner",
          })),
        );
        await admin.from("project_category_members").insert(
          ids.filter((_: string, i: number) => i % 4 !== 3).map((id: string, i: number) => ({
            project_id: id,
            category_id: catIds[i % catIds.length] as string,
          })),
        );

        // Expected order: the same (created_at DESC, id DESC) the query uses.
        const { data: ordered } = await admin
          .from("projects")
          .select("id,created_at")
          .like("slug", `${prefix}%`)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        const expectedIds = (ordered ?? []).map((r: { id: string }) => r.id);
        expect(expectedIds).toHaveLength(SEED_ROWS);

        // ── Walk through the REAL action, page by page ──
        const collected: string[] = [];
        let cursor: string | null = null;
        const seenCursors = new Set<string>();
        for (let pageNo = 1; ; pageNo++) {
          const res = await getPublicProjectsPage(cursor, PAGE_SIZE);
          const isLast = pageNo === 5;
          // Boundary contract, every page:
          expect(res.projects.length).toBe(isLast ? 5 : PAGE_SIZE);
          expect(res.hasMore).toBe(!isLast);
          if (isLast) {
            expect(res.nextCursor).toBeNull();
          } else {
            expect(typeof res.nextCursor).toBe("string");
            expect(seenCursors.has(res.nextCursor as string)).toBe(false);
            seenCursors.add(res.nextCursor as string);
          }
          // Every returned row carries its enrichment shape (follow-ups ran).
          for (const p of res.projects) {
            expect(typeof p.member_count).toBe("number");
            expect(Array.isArray(p.technologies)).toBe(true);
          }
          collected.push(...res.projects.map((p) => p.id));
          if (!res.hasMore) break;
          cursor = res.nextCursor;
          if (pageNo > 10) throw new Error("walk did not terminate");
        }

        // Exact-once + order:
        expect(collected).toHaveLength(SEED_ROWS);
        expect(new Set(collected).size).toBe(SEED_ROWS);
        expect(collected).toEqual(expectedIds);

        // Fail-safe path against the real query: garbage cursor → first page.
        const firstAgain = await getPublicProjectsPage("not-a-cursor", PAGE_SIZE);
        expect(firstAgain.projects.map((p) => p.id)).toEqual(expectedIds.slice(0, PAGE_SIZE));
      } finally {
        await cleanup();
        restoreEnv();
      }
    },
    120_000,
  );
});
