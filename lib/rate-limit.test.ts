import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, pruneRateLimitAttempts } from "@/lib/rate-limit";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";

beforeEach(() => {
  vi.clearAllMocks();
});

function adminDouble(opts: {
  count?: number | null;
  countError?: { message: string } | null;
}) {
  // Chain: from().select().eq().eq().gte() -> { count, error }
  const builder: Record<string, unknown> = {};
  builder.eq = vi.fn(() => builder);
  builder.gte = vi.fn(async () => ({
    count: opts.count ?? 0,
    error: opts.countError ?? null,
  }));
  const select = vi.fn(() => builder);
  const insert = vi.fn(async () => ({ data: null, error: null }));
  const lt = vi.fn(async () => ({ data: null, error: null }));
  const del = vi.fn(() => ({ lt }));
  const from = vi.fn(() => ({ select, insert, delete: del }));
  return { from, select, insert, eq: builder.eq, gte: builder.gte, del, lt };
}

describe("checkRateLimit", () => {
  it("allows a request under the limit and records the attempt", async () => {
    const admin = adminDouble({ count: 3 });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const res = await checkRateLimit("auth_signin", "ip:1.2.3.4", 5, 60);

    expect(res).toEqual({ allowed: true, remaining: 1 });
    expect(admin.from).toHaveBeenCalledWith("rate_limit_attempts");
    expect(admin.insert).toHaveBeenCalledWith({ scope: "auth_signin", key: "ip:1.2.3.4" });
  });

  it("denies a request at the limit without recording another attempt", async () => {
    const admin = adminDouble({ count: 5 });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const res = await checkRateLimit("auth_signin", "ip:1.2.3.4", 5, 60);

    expect(res).toEqual({ allowed: false, remaining: 0 });
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("denies a request over the limit without recording another attempt", async () => {
    const admin = adminDouble({ count: 42 });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const res = await checkRateLimit("auth_signup", "ip:9.9.9.9", 5, 3600);

    expect(res).toEqual({ allowed: false, remaining: 0 });
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("fails closed (denies) when the counter query errors", async () => {
    const admin = adminDouble({ countError: { message: "db down" } });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    const res = await checkRateLimit("auth_signin", "ip:1.2.3.4", 10, 900);

    expect(res).toEqual({ allowed: false, remaining: 0 });
    expect(admin.insert).not.toHaveBeenCalled();
  });

  it("scopes counts per (scope, key) via equality filters", async () => {
    const admin = adminDouble({ count: 0 });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    await checkRateLimit("course_file_download", "user:abc", 60, 60);

    expect(admin.eq).toHaveBeenCalledWith("scope", "course_file_download");
    expect(admin.eq).toHaveBeenCalledWith("key", "user:abc");
    expect(admin.gte).toHaveBeenCalledTimes(1);
  });
});

describe("pruneRateLimitAttempts", () => {
  it("deletes attempts older than the cutoff", async () => {
    const admin = adminDouble({});
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);

    await pruneRateLimitAttempts(3600);

    expect(admin.from).toHaveBeenCalledWith("rate_limit_attempts");
    expect(admin.del).toHaveBeenCalledTimes(1);
    expect(admin.lt).toHaveBeenCalledTimes(1);
    const [col, cutoff] = (admin.lt as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(col).toBe("attempted_at");
    expect(Number.isNaN(Date.parse(cutoff))).toBe(false);
  });
});
