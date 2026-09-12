import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateBearer, extractBearerToken } from "@/lib/supabase/bearer";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

import { createClient } from "@supabase/supabase-js";

const URL = "https://test.supabase.co";
const ANON = "anon-key";

function env() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON;
}

function reqWith(auth: string | null): Request {
  const headers: Record<string, string> = {};
  if (auth !== null) headers.authorization = auth;
  return new Request("https://azenion.com/api/auth/hydrate", { headers });
}

function supabaseDouble(opts: {
  user?: { id: string; email?: string } | null;
  error?: { message: string } | null;
}) {
  const getUser = vi.fn(async (_token: string) => ({
    data: { user: opts.user ?? null },
    error: opts.error ?? null,
  }));
  const client = { auth: { getUser } };
  (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(client);
  return { getUser, client };
}

beforeEach(() => {
  vi.clearAllMocks();
  env();
});

describe("extractBearerToken", () => {
  it("returns null for missing input", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(reqWith(null))).toBeNull();
  });

  it("rejects malformed and non-Bearer schemes", () => {
    expect(extractBearerToken("Token abc")).toBeNull();
    expect(extractBearerToken("Basic xyz")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("Bearer   ")).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });

  it("extracts the token for Bearer scheme", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractBearerToken(reqWith("Bearer abc.def.ghi"))).toBe("abc.def.ghi");
  });
});

describe("authenticateBearer", () => {
  it("401 on missing Authorization", async () => {
    const res = await authenticateBearer(reqWith(null));
    expect(res).toEqual({ ok: false, status: 401, error: "Unauthorized" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("401 on malformed / non-Bearer credentials", async () => {
    for (const header of ["Token abc", "Basic xyz", "Bearer", ""]) {
      const res = await authenticateBearer(reqWith(header));
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe(401);
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  it("fails closed on invalid token", async () => {
    supabaseDouble({ user: null, error: { message: "invalid JWT" } });
    const res = await authenticateBearer("Bearer dead.token.here");
    expect(res).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("fails closed when Auth throws", async () => {
    const { getUser } = supabaseDouble({ user: { id: "u-1" } });
    getUser.mockRejectedValueOnce(new Error("network down"));
    const res = await authenticateBearer("Bearer abc");
    expect(res.ok).toBe(false);
  });

  it("returns the validated user with a user-JWT client (never service-role)", async () => {
    const user = { id: "user-1", email: "a@b.c" };
    const { getUser, client } = supabaseDouble({ user });
    const res = await authenticateBearer("Bearer good.token");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.principal.user).toEqual(user);
    expect(res.principal.supabase).toBe(client);
    // Validated through Supabase Auth with the presented token.
    expect(getUser).toHaveBeenCalledWith("good.token");
    // Client is built with the anon key, and the caller's token travels as
    // the request Authorization header — the service-role key is never used.
    const [, anonKey, options] = (createClient as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [
      string,
      string,
      { global?: { headers?: Record<string, string> } },
    ];
    expect(anonKey).toBe(ANON);
    expect(anonKey).not.toContain("service");
    expect(options.global?.headers?.Authorization).toBe("Bearer good.token");
  });

  it("never exposes the token in failure responses", async () => {
    const secret = "super.secret.token-value";
    supabaseDouble({ user: null, error: { message: "bad" } });
    const res = await authenticateBearer(`Bearer ${secret}`);
    expect(JSON.stringify(res)).not.toContain(secret);
  });
});
