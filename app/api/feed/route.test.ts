import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/feed/route";

vi.mock("@/lib/supabase/bearer", () => ({ authenticateBearer: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/actions/feed.actions", () => ({
  getFeedItems: vi.fn(),
  getTrendingFeedItems: vi.fn(),
  getBranchFeedItems: vi.fn(),
  getSavedFeedItems: vi.fn(),
  getFeedItemById: vi.fn(),
}));

import { authenticateBearer } from "@/lib/supabase/bearer";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getBranchFeedItems,
  getFeedItemById,
  getFeedItems,
  getSavedFeedItems,
  getTrendingFeedItems,
} from "@/actions/feed.actions";

const bearerMock = authenticateBearer as unknown as ReturnType<typeof vi.fn>;
const rlMock = checkRateLimit as unknown as ReturnType<typeof vi.fn>;

const ITEM = { id: "post-1", title: "Hello" };

function req(query: string, auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth !== null) headers.authorization = auth;
  return new Request(`https://azenion.com/api/feed${query}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  rlMock.mockResolvedValue({ allowed: true, remaining: 119 });
});

describe("GET /api/feed", () => {
  it("serves anonymous global feed without forwarding a viewer (public content only)", async () => {
    bearerMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    (getFeedItems as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [ITEM],
      total: 1,
    });
    const res = await GET(req("?scope=global&page=1&pageSize=20", null));
    expect(res.status).toBe(200);
    expect(getFeedItems).toHaveBeenCalledWith("all", 1, 20);
    const body = await res.json();
    expect(body.items).toEqual([ITEM]);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("never forwards viewer parameters — identity stays server-derived", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "viewer-9" }, supabase: {} },
    });
    (getFeedItems as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    const res = await GET(req("?scope=global&userId=someone-else&viewer=attacker", "Bearer tok"));
    expect(res.status).toBe(200);
    expect(getFeedItems).toHaveBeenCalledWith("all", 1, 20);
  });

  it("requires authentication for saved scope", async () => {
    bearerMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const res = await GET(req("?scope=saved", null));
    expect(res.status).toBe(401);
    expect(getSavedFeedItems).not.toHaveBeenCalled();
  });

  it("rejects invalid query parameters", async () => {
    bearerMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const res = await GET(req("?scope=branch", null));
    expect(res.status).toBe(422);
  });

  it("rate-limits anonymous readers", async () => {
    bearerMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    rlMock.mockResolvedValue({ allowed: false, remaining: 0 });
    const res = await GET(req("?scope=global", null));
    expect(res.status).toBe(429);
    expect(getFeedItems).not.toHaveBeenCalled();
  });

  it("masks invisible single posts as 404", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "viewer-9" }, supabase: {} },
    });
    (getFeedItemById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(
      req("?scope=single&postId=123e4567-e89b-12d3-a456-426614174000", "Bearer tok"),
    );
    expect(res.status).toBe(404);
    expect(getFeedItemById).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000");
  });

  it("forwards branch and trending scopes without a viewer argument", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "viewer-9" }, supabase: {} },
    });
    (getBranchFeedItems as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    (getTrendingFeedItems as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
    const branchId = "123e4567-e89b-12d3-a456-426614174000";
    await GET(req(`?scope=branch&branchId=${branchId}`, "Bearer tok"));
    expect(getBranchFeedItems).toHaveBeenCalledWith(branchId, 1, 20);
    await GET(req("?scope=trending&pageSize=10", "Bearer tok"));
    expect(getTrendingFeedItems).toHaveBeenCalledWith(10);
  });
});
