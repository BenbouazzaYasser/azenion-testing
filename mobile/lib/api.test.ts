import { ApiError, apiFetch, apiJson } from "./api";
import { supabase } from "./supabase";

jest.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  refreshSession: jest.Mock;
  signOut: jest.Mock;
};

const SECRET = "live-access-token-value";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  jest.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: { access_token: SECRET } } });
});

describe("apiFetch bearer helper", () => {
  it("sends the current access token as a Bearer credential", async () => {
    global.fetch = jest.fn(async () => jsonResponse(200, { ok: true })) as unknown as typeof fetch;
    const res = await apiFetch("/api/auth/hydrate");
    expect(res.status).toBe(200);
    const [, init] = (global.fetch as unknown as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
  });

  it("refreshes once and retries once after a 401", async () => {
    let n = 0;
    global.fetch = jest.fn(async () => {
      n += 1;
      return n === 1 ? jsonResponse(401, { error: "Unauthorized" }) : jsonResponse(200, { ok: true });
    }) as unknown as typeof fetch;
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: "new-token" } }, error: null });

    const res = await apiFetch("/api/feed?scope=global");
    expect(res.status).toBe(200);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(auth.signOut).not.toHaveBeenCalled();
    expect((global.fetch as unknown as jest.Mock).mock.calls).toHaveLength(2);
  });

  it("signs out when refresh fails", async () => {
    global.fetch = jest.fn(async () => jsonResponse(401, { error: "Unauthorized" })) as unknown as typeof fetch;
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: "expired" } });

    await expect(apiFetch("/api/feed")).rejects.toThrow(ApiError);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("signs out when the retry is still 401 (no refresh loop)", async () => {
    global.fetch = jest.fn(async () => jsonResponse(401, { error: "Unauthorized" })) as unknown as typeof fetch;
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: "new-token" } }, error: null });

    await expect(apiFetch("/api/feed")).rejects.toThrow(ApiError);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect((global.fetch as unknown as jest.Mock).mock.calls).toHaveLength(2);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("throws 401 immediately when there is no session", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(apiFetch("/api/feed")).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("never exposes the token in errors", async () => {
    global.fetch = jest.fn(async () => jsonResponse(500, { error: "boom" })) as unknown as typeof fetch;
    try {
      await apiJson("/api/feed");
      throw new Error("should have thrown");
    } catch (e) {
      expect(String((e as Error).message)).not.toContain(SECRET);
      expect(JSON.stringify(e)).not.toContain(SECRET);
    }
  });

  it("surfaces server error messages without raw bodies", async () => {
    global.fetch = jest.fn(async () => jsonResponse(403, { error: "Not allowed." })) as unknown as typeof fetch;
    await expect(apiJson("/api/feed")).rejects.toMatchObject({ status: 403, message: "Not allowed." });
  });
});
