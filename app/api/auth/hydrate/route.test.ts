import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/hydrate/route";

vi.mock("@/lib/supabase/bearer", () => ({ authenticateBearer: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 59 }) }));

import { authenticateBearer } from "@/lib/supabase/bearer";

const USER = { id: "user-1", email: "user@example.com" };

function tableStub(rows: unknown) {
  const builder: Record<string, unknown> = {};
  builder.select = (..._a: unknown[]) => builder;
  builder.eq = (..._a: unknown[]) => builder;
  builder.maybeSingle = async () => ({ data: rows ?? null, error: null });
  // Awaiting the builder itself (as getLabsAuthContext does for user_roles).
  builder.then = (resolve: (v: unknown) => void) =>
    resolve({ data: rows ?? null, error: null });
  return builder;
}

function stubClient(opts: {
  userRoles?: unknown;
  platformAdmin?: unknown;
  branchLeaders?: unknown;
  rpc?: Record<string, unknown>;
}) {
  return {
    from: (table: string) => {
      if (table === "user_roles") return tableStub(opts.userRoles ?? []);
      if (table === "platform_admins") return tableStub(opts.platformAdmin ?? null);
      if (table === "branch_leaders") return tableStub(opts.branchLeaders ?? []);
      return tableStub(null);
    },
    rpc: async (name: string) => ({ data: opts.rpc?.[name] ?? null, error: null }),
  };
}

function authed(principal: { user: typeof USER; supabase: unknown }) {
  (authenticateBearer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    principal,
  });
}

function request(userIdQuery?: string): Request {
  const url = userIdQuery
    ? `https://azenion.com/api/auth/hydrate?userId=${userIdQuery}`
    : "https://azenion.com/api/auth/hydrate";
  return new Request(url, { headers: { authorization: "Bearer good.token" } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/hydrate", () => {
  it("401 when bearer is missing", async () => {
    (authenticateBearer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await GET(new Request("https://azenion.com/api/auth/hydrate"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("401 when bearer is invalid", async () => {
    (authenticateBearer as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("returns the caller's own snapshot with canonical capabilities", async () => {
    authed({
      user: USER,
      supabase: stubClient({
        userRoles: [{ roles: { name: "instructor" } }],
        rpc: { is_course_manager: false },
      }),
    });
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await res.json();
    expect(body.user).toEqual({ id: "user-1", email: "user@example.com" });
    expect(body.roles).toEqual(["instructor"]);
    expect(body.isPlatformAdmin).toBe(false);
    expect(body.isCourseManager).toBe(false);
    expect(body.labs).toEqual({ isPlatformAdmin: false, canCreateLab: true });
    expect(body.branchLeadership).toEqual([]);
  });

  it("reflects course-manager, platform-admin, and branch leadership from canonical sources", async () => {
    authed({
      user: USER,
      supabase: stubClient({
        userRoles: [{ roles: [{ name: "core_team_member" }, { name: "creator" }] }],
        platformAdmin: { user_id: "user-1" },
        branchLeaders: [
          {
            branch_id: "branch-1",
            branches: { slug: "casa", name: "Casablanca" },
          },
        ],
        rpc: { is_course_manager: true },
      }),
    });
    const res = await GET(request());
    const body = await res.json();
    expect(body.roles).toEqual(["core_team_member", "creator", "platform_admin"]);
    expect(body.isPlatformAdmin).toBe(true);
    expect(body.isCourseManager).toBe(true);
    expect(body.labs).toEqual({ isPlatformAdmin: true, canCreateLab: true });
    expect(body.branchLeadership).toEqual([
      { branch_id: "branch-1", slug: "casa", name: "Casablanca" },
    ]);
  });

  it("a caller-supplied userId cannot influence the result", async () => {
    authed({
      user: USER,
      supabase: stubClient({ userRoles: [] }),
    });
    const res = await GET(request("someone-else"));
    const body = await res.json();
    expect(body.user.id).toBe("user-1");
  });

  it("exposes no tokens, secrets, or service-role material", async () => {
    authed({
      user: USER,
      supabase: stubClient({ userRoles: [] }),
    });
    const res = await GET(request());
    const raw = await res.text();
    expect(raw).not.toContain("service_role");
    expect(raw).not.toContain("refresh_token");
    expect(raw).not.toContain("access_token");
    expect(raw).not.toContain("good.token");
  });
});
