import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/media/sign/route";

vi.mock("@/lib/supabase/bearer", () => ({ authenticateBearer: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));

import { authenticateBearer } from "@/lib/supabase/bearer";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const bearerMock = authenticateBearer as unknown as ReturnType<typeof vi.fn>;
const ATTACHMENT_ID = "123e4567-e89b-12d3-a456-426614174000";
const CONV_ID = "223e4567-e89b-12d3-a456-426614174000";

function stubSupabase(opts: { row?: unknown; oracle?: unknown }) {
  return {
    from: (_table: string) => ({
      select: (..._a: unknown[]) => ({
        eq: (..._b: unknown[]) => ({
          maybeSingle: async () => ({ data: opts.row ?? null, error: null }),
        }),
      }),
    }),
    rpc: async (_name: string, _args: unknown) => ({ data: opts.oracle ?? null, error: null }),
  };
}

function req(body: unknown, auth: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth !== null) headers.authorization = auth;
  return new Request("https://azenion.com/api/chat/media/sign", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function adminReturning(url: string | null) {
  (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: async (_path: string, _ttl: number) =>
          url ? { data: { signedUrl: url }, error: null } : { data: null, error: { message: "boom" } },
      }),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (checkRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true, remaining: 1 });
});

describe("POST /api/chat/media/sign", () => {
  it("401 without bearer", async () => {
    bearerMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const res = await POST(req({ attachmentId: ATTACHMENT_ID }, null));
    expect(res.status).toBe(401);
  });

  it("422 on malformed attachment id", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "u-1" }, supabase: stubSupabase({}) },
    });
    const res = await POST(req({ attachmentId: "not-a-uuid" }, "Bearer tok"));
    expect(res.status).toBe(422);
  });

  it("403 for non-members (no row under RLS)", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "outsider" }, supabase: stubSupabase({ row: null }) },
    });
    adminReturning("https://signed.example/x");
    const res = await POST(req({ attachmentId: ATTACHMENT_ID }, "Bearer tok"));
    expect(res.status).toBe(403);
  });

  it("403 when the canonical oracle denies, even with a row", async () => {
    bearerMock.mockResolvedValue({
      ok: true,
      principal: {
        user: { id: "u-1" },
        supabase: stubSupabase({
          row: { storage_path: `chat/${CONV_ID}/a/file.png` },
          oracle: false,
        }),
      },
    });
    adminReturning("https://signed.example/x");
    const res = await POST(req({ attachmentId: ATTACHMENT_ID }, "Bearer tok"));
    expect(res.status).toBe(403);
  });

  it("403 on unsafe stored paths (traversal / cross-bucket)", async () => {
    for (const bad of [
      "private-media/team/x/file.png",
      `chat/${CONV_ID}/../../etc/passwd`,
      "chat/not-a-uuid/file.png",
    ]) {
      bearerMock.mockResolvedValue({
        ok: true,
        principal: { user: { id: "u-1" }, supabase: stubSupabase({ row: { storage_path: bad }, oracle: true }) },
      });
      adminReturning("https://signed.example/x");
      const res = await POST(req({ attachmentId: ATTACHMENT_ID }, "Bearer tok"));
      expect(res.status).toBe(403);
    }
  });

  it("mints a short-lived URL for authorized members without exposing credentials", async () => {
    const path = `chat/${CONV_ID}/a/file.png`;
    bearerMock.mockResolvedValue({
      ok: true,
      principal: { user: { id: "u-1" }, supabase: stubSupabase({ row: { storage_path: path }, oracle: true }) },
    });
    adminReturning("https://signed.example/x?token=abc");
    const res = await POST(req({ attachmentId: ATTACHMENT_ID }, "Bearer tok"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = await res.json();
    expect(body.signedUrl).toBe("https://signed.example/x?token=abc");
    expect(body.expiresIn).toBe(7200);
    expect(JSON.stringify(body)).not.toContain("service_role");
  });
});
