import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/academy/courses/[id]/file/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/bearer", () => ({ authenticateBearer: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 19 }) }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateBearer } from "@/lib/supabase/bearer";

const COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";
const OWNER_ID = "223e4567-e89b-12d3-a456-426614174000";
const FILE_PATH = `courses/${OWNER_ID}/323e4567-e89b-12d3-a456-426614174000.pdf`;

function courseRow(status: string) {
  return {
    content_type: "pdf",
    file_path: FILE_PATH,
    thumbnail: null,
    status,
    created_by: OWNER_ID,
  };
}

function clientStub(opts: { user?: { id: string } | null; course?: unknown; manager?: unknown }) {
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from: (_table: string) => ({
      select: (..._a: unknown[]) => ({
        eq: (..._b: unknown[]) => ({
          maybeSingle: async () => ({ data: opts.course ?? null, error: null }),
        }),
      }),
    }),
    rpc: async (_name: string) => ({ data: opts.manager ?? false, error: null }),
  };
}

function setup(opts: {
  cookieUser?: { id: string } | null;
  cookieCourse?: unknown;
  bearerOk?: boolean;
  bearerUserId?: string;
  bearerCourse?: unknown;
  bearerManager?: unknown;
}) {
  (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    clientStub({ user: opts.cookieUser ?? null, course: opts.cookieCourse ?? null }),
  );
  if (opts.bearerOk) {
    (authenticateBearer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      principal: {
        user: { id: opts.bearerUserId ?? OWNER_ID },
        supabase: clientStub({
          user: { id: opts.bearerUserId ?? OWNER_ID },
          course: opts.bearerCourse ?? null,
          manager: opts.bearerManager ?? false,
        }),
      },
    });
  } else {
    (authenticateBearer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  }
  (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    storage: {
      from: (_bucket: string) => ({
        download: async (_path: string) => ({
          data: new Blob(["pdf-bytes"], { type: "application/pdf" }),
          error: null,
        }),
      }),
    },
  });
}

function req(id: string, query: string, auth: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (auth !== null) headers.authorization = auth;
  return new NextRequest(`https://azenion.com/api/academy/courses/${id}/file${query}`, { headers });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/academy/courses/[id]/file", () => {
  it("400 on invalid course id without touching auth", async () => {
    setup({});
    const res = await GET(req("not-a-uuid", "", null), params("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(authenticateBearer).not.toHaveBeenCalled();
  });

  it("preserves anonymous published reads (web behavior)", async () => {
    setup({ cookieCourse: courseRow("published") });
    const res = await GET(req(COURSE_ID, "", null), params(COURSE_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("inline");
    expect(authenticateBearer).not.toHaveBeenCalled();
  });

  it("serves HTML inline in an isolated tab", async () => {
    setup({
      cookieCourse: {
        ...courseRow("published"),
        content_type: "html_css",
        file_path: `courses/${OWNER_ID}/323e4567-e89b-12d3-a456-426614174000.html`,
      },
    });
    const res = await GET(req(COURSE_ID, "", null), params(COURSE_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain("inline");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("content-security-policy")).toContain("script-src 'none'");
  });

  it("allows scripts only in the isolated preview response", async () => {
    setup({
      cookieCourse: {
        ...courseRow("published"),
        content_type: "html_css",
        file_path: `courses/${OWNER_ID}/323e4567-e89b-12d3-a456-426614174000.html`,
      },
    });
    const res = await GET(req(COURSE_ID, "?view=preview", null), params(COURSE_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("inline");
    expect(res.headers.get("content-security-policy")).toContain("sandbox allow-scripts");
    expect(res.headers.get("content-security-policy")).toContain("script-src 'unsafe-inline' https:");
  });

  it("still 404s drafts for anonymous callers", async () => {
    setup({ cookieCourse: courseRow("draft") });
    const res = await GET(req(COURSE_ID, "", null), params(COURSE_ID));
    expect(res.status).toBe(404);
  });

  it("allows draft preview for the bearer-authenticated owner", async () => {
    setup({ bearerOk: true, bearerCourse: courseRow("draft") });
    const res = await GET(req(COURSE_ID, "", "Bearer tok"), params(COURSE_ID));
    expect(res.status).toBe(200);
    expect(authenticateBearer).toHaveBeenCalled();
  });

  it("denies drafts on invalid bearer (fails closed to anonymous)", async () => {
    setup({ cookieCourse: courseRow("draft"), bearerOk: false });
    const res = await GET(req(COURSE_ID, "", "Bearer bad"), params(COURSE_ID));
    expect(res.status).toBe(404);
  });

  it("denies drafts for bearer outsiders", async () => {
    setup({ bearerOk: true, bearerUserId: "outsider-1", bearerCourse: courseRow("draft") });
    const res = await GET(req(COURSE_ID, "", "Bearer tok"), params(COURSE_ID));
    expect(res.status).toBe(404);
  });
});
