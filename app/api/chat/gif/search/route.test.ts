import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/chat/gif/search/route";

vi.mock("@/lib/supabase/bearer", () => ({ authenticateBearer: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));

import { authenticateBearer } from "@/lib/supabase/bearer";
import { checkRateLimit } from "@/lib/rate-limit";

const bearerMock = authenticateBearer as unknown as ReturnType<typeof vi.fn>;
const rlMock = checkRateLimit as unknown as ReturnType<typeof vi.fn>;

function req(query: string, auth: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (auth !== null) headers.authorization = auth;
  return new NextRequest(`https://azenion.com/api/chat/gif/search${query}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  rlMock.mockResolvedValue({ allowed: true, remaining: 29 });
});

describe("GET /api/chat/gif/search", () => {
  it("preserves anonymous web behavior", async () => {
    const res = await GET(req("?q=hello&limit=5", null));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("giphy");
    expect(Array.isArray(body.results)).toBe(true);
    expect(rlMock).toHaveBeenCalledWith("gif_search", expect.stringMatching(/^ip:/), 30, 60);
  });

  it("401 on invalid bearer, without calling upstream", async () => {
    bearerMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const res = await GET(req("?q=hello", "Bearer bad"));
    expect(res.status).toBe(401);
    expect(rlMock).not.toHaveBeenCalled();
  });

  it("accepts a valid bearer keyed by user id", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "u-7" }, supabase: {} },
    });
    const res = await GET(req("?q=hello", "Bearer good"));
    expect(res.status).toBe(200);
    expect(rlMock).toHaveBeenCalledWith("gif_search", "user:u-7", 120, 60);
  });

  it("caps overlong queries and never exposes the API key", async () => {
    const res = await GET(req(`?q=${"x".repeat(500)}`, null));
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).not.toContain("GIPHY_API_KEY");
    expect(raw).not.toContain("api_key");
  });

  it("429 when rate-limited", async () => {
    rlMock.mockResolvedValue({ allowed: false, remaining: 0 });
    const res = await GET(req("?q=hello", null));
    expect(res.status).toBe(429);
  });
});
