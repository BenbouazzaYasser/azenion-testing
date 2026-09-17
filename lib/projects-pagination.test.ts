import { describe, expect, it } from "vitest";
import {
  buildCursorPredicate,
  clampProjectsLimit,
  cursorForPageEnd,
  decodeProjectsCursor,
  isRowAfterCursor,
  PROJECTS_PAGE_SIZE,
  slicePage,
  type ProjectsCursor,
} from "@/lib/projects-pagination";

/**
 * Permanent regression suite for the catalog keyset pagination.
 *
 * No DB, no seed data: a mock table models the CONTRACT the SQL must satisfy
 * (rows ordered created_at DESC/id DESC, exclusive cursor predicate), and the
 * walk drives the REAL helpers (codec, slicePage, cursorForPageEnd,
 * isRowAfterCursor, buildCursorPredicate). JS-side logic drift fails fast
 * here; the live SQL text is pinned by the predicate test and was verified
 * against PostgREST during the N=1500 benchmark (see bench notes in
 * docs/web-performance-audit.md).
 */

const PAGE = PROJECTS_PAGE_SIZE; // 24

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

interface Row {
  created_at: string;
  id: string;
}

/** 1426 rows newest-first with one 5-row timestamp tie-group (tie-break path). */
function makeTable(n = 1426): Row[] {
  const base = Date.parse("2026-09-17T12:00:00.000Z");
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    // Rows 100..104 share one instant to exercise the (created_at, id) tie-break.
    const t = i >= 100 && i <= 104 ? base - 100 * 37 * 60 * 1000 : base - i * 37 * 60 * 1000;
    rows.push({ created_at: new Date(t).toISOString(), id: uuid(i + 1) });
  }
  return rows.sort((a, b) =>
    b.created_at.localeCompare(a.created_at) || (a.id < b.id ? 1 : -1),
  );
}

/** Mock DB honoring the exclusive-predicate contract. */
function mockDbAfter(rows: Row[], cursor: ProjectsCursor | null, limit: number): Row[] {
  const rest = cursor
    ? rows.filter(
        (r) => r.created_at < cursor.createdAt || (r.created_at === cursor.createdAt && r.id < cursor.id),
      )
    : rows;
  return rest.slice(0, limit);
}

/** Full walk using the real codec + helpers. Returns collected ids + page count. */
function walk(rows: Row[], pageSize = PAGE): { ids: string[]; pages: number } {
  const ids: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  for (;;) {
    const pos = decodeProjectsCursor(cursor);
    const fetched = mockDbAfter(rows, pos, pageSize + 1);
    const { page, hasMore } = slicePage(fetched, pageSize);
    ids.push(...page.map((r) => r.id));
    pages += 1;
    cursor = cursorForPageEnd(page, hasMore);
    if (!hasMore) break;
    if (pages > 200) throw new Error("walk did not terminate");
  }
  return { ids, pages };
}

describe("slicePage probe semantics", () => {
  it("empty candidates → empty page, no next", () => {
    expect(slicePage([], PAGE)).toEqual({ page: [], hasMore: false });
  });
  it("exactly one page → hasMore false (no phantom next page)", () => {
    const rows = makeTable(PAGE);
    expect(slicePage(rows, PAGE).hasMore).toBe(false);
  });
  it("probe row present → full page + hasMore true", () => {
    const rows = makeTable(PAGE + 1);
    const { page, hasMore } = slicePage(rows, PAGE);
    expect(page).toHaveLength(PAGE);
    expect(hasMore).toBe(true);
  });
  it("uses strict > so a consumed probe can't stall the walk", () => {
    // If hasMore were `>=`, a 24-row final fetch would claim another page.
    expect(slicePage(makeTable(PAGE), PAGE)).toEqual({
      page: makeTable(PAGE),
      hasMore: false,
    });
  });
});

describe("cursorForPageEnd", () => {
  it("null when no more pages or page empty", () => {
    expect(cursorForPageEnd([], true)).toBeNull();
    expect(cursorForPageEnd(makeTable(3), false)).toBeNull();
  });
  it("round-trips through the codec to the page's last row", () => {
    const page = makeTable(5);
    const last = page[page.length - 1];
    if (!last) throw new Error("fixture empty");
    const cursor = cursorForPageEnd(page, true);
    expect(cursor).not.toBeNull();
    expect(decodeProjectsCursor(cursor)).toEqual({ createdAt: last.created_at, id: last.id });
  });
});

describe("isRowAfterCursor exclusivity (fixed bug: inclusive bound)", () => {
  const cursor: ProjectsCursor = { createdAt: "2026-09-01T12:00:00.000Z", id: uuid(10) };
  it("the cursor row itself is NOT after the cursor", () => {
    expect(isRowAfterCursor({ createdAt: cursor.createdAt, id: cursor.id }, cursor)).toBe(false);
  });
  it("older rows and same-instant smaller ids are after", () => {
    expect(isRowAfterCursor({ createdAt: "2026-08-01T00:00:00.000Z", id: uuid(99) }, cursor)).toBe(true);
    expect(isRowAfterCursor({ createdAt: cursor.createdAt, id: uuid(9) }, cursor)).toBe(true);
  });
  it("newer rows, same-instant larger ids, and null timestamps are not", () => {
    expect(isRowAfterCursor({ createdAt: "2026-10-01T00:00:00.000Z", id: uuid(1) }, cursor)).toBe(false);
    expect(isRowAfterCursor({ createdAt: cursor.createdAt, id: uuid(11) }, cursor)).toBe(false);
    expect(isRowAfterCursor({ createdAt: null, id: uuid(1) }, cursor)).toBe(false);
  });
});

describe("buildCursorPredicate", () => {
  it("pins the exact exclusive predicate text", () => {
    expect(buildCursorPredicate({ createdAt: "2026-09-01T12:00:00.000Z", id: uuid(7) })).toBe(
      `created_at.lt.2026-09-01T12:00:00.000Z,and(created_at.eq.2026-09-01T12:00:00.000Z,id.lt.${uuid(7)})`,
    );
  });
  it("uses strict lt (inclusive lte reintroduces the page-2 stall)", () => {
    const pred = buildCursorPredicate({ createdAt: "2026-09-01T12:00:00.000Z", id: uuid(7) });
    expect(pred).toContain("created_at.lt.");
    expect(pred).toContain("id.lt.");
    expect(pred).not.toMatch(/(created_at|id)\.lte?\b.*lte/);
    expect(pred).not.toContain("lte");
  });
});

describe("60-page walk (1426 rows, tie-group included)", () => {
  it("visits every row exactly once and terminates past page 2", () => {
    const rows = makeTable(1426);
    const { ids, pages } = walk(rows);
    expect(pages).toBe(60); // ceil(1426/24) — guards the page-2 stall regression
    expect(ids).toHaveLength(1426);
    expect(new Set(ids).size).toBe(1426);
    expect(ids).toEqual(rows.map((r) => r.id)); // order preserved
  });
});

describe("concurrent front-inserts during pagination", () => {
  it("keyset collects exactly the baseline (no skip, no dup)", () => {
    const rows = makeTable(1426);
    const baseline = rows.map((r) => r.id);
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    for (;;) {
      const fetched = mockDbAfter(rows, decodeProjectsCursor(cursor), PAGE + 1);
      const { page, hasMore } = slicePage(fetched, PAGE);
      ids.push(...page.map((r) => r.id));
      pages += 1;
      if (pages === 2) {
        // 30 newest-first rows land mid-walk (all sort before page 1).
        const first = rows[0];
        if (!first) throw new Error("fixture empty");
        const newcomers: Row[] = Array.from({ length: 30 }, (_, k) => ({
          created_at: new Date(Date.parse(first.created_at) + (30 - k) * 1000).toISOString(),
          id: uuid(100000 + k),
        }));
        rows.unshift(...newcomers);
      }
      cursor = cursorForPageEnd(page, hasMore);
      if (!hasMore) break;
    }
    expect(ids).toEqual(baseline);
  });

  it("OFFSET under the same inserts skips/duplicates (why keyset exists)", () => {
    const rows = makeTable(1426);
    const ids: string[] = [];
    const newcomerIds = new Set<string>();
    for (let page = 0; ; page++) {
      const chunk = rows.slice(page * PAGE, page * PAGE + PAGE);
      ids.push(...chunk.map((r) => r.id));
      if (page === 1) {
        const first = rows[0];
        if (!first) throw new Error("fixture empty");
        const newcomers: Row[] = Array.from({ length: 30 }, (_, k) => ({
          created_at: new Date(Date.parse(first.created_at) + (30 - k) * 1000).toISOString(),
          id: uuid(200000 + k),
        }));
        for (const n of newcomers) newcomerIds.add(n.id);
        rows.unshift(...newcomers);
      }
      if (chunk.length < PAGE) break;
    }
    const uniq = new Set(ids);
    const missedNewcomers = [...newcomerIds].filter((id) => !uniq.has(id));
    // 30 front-inserts shift every later window: the already-passed boundary
    // repeats (dups) while rows that landed in passed windows never appear.
    // (Live run at N=1500: 28 dups + 28 skipped rows.)
    expect(ids.length - uniq.size).toBeGreaterThan(0);
    expect(missedNewcomers.length).toBeGreaterThan(0);
  });
});

describe("clampProjectsLimit", () => {
  it("clamps to [1, 50] with sane defaults", () => {
    expect(clampProjectsLimit(24)).toBe(24);
    expect(clampProjectsLimit(0)).toBe(1);
    expect(clampProjectsLimit(500)).toBe(50);
    expect(clampProjectsLimit(Number.NaN)).toBe(24);
  });
});
