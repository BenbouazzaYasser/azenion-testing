import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOutEverywhere } from "@/actions/settings.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/actions/auth.actions", () => ({ signOut: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ACCESS_TOKEN = "access-token-123";

function setup(opts: {
  user?: { id: string } | null;
  accessToken?: string | null;
  adminError?: { message: string } | null;
}) {
  const user = opts.user === undefined ? { id: "user-1" } : opts.user;
  const accessToken = opts.accessToken === undefined ? ACCESS_TOKEN : opts.accessToken;
  const signOut = vi.fn(async (_jwt: string, _scope: string) => ({
    data: null,
    error: opts.adminError ?? null,
  }));
  (createClient as any).mockReturnValue({
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
        error: null,
      }),
    },
  });
  (createAdminClient as any).mockReturnValue({
    auth: { admin: { signOut } },
  });
  return { signOut };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signOutEverywhere", () => {
  it("accepts no caller-supplied target user id", () => {
    expect(signOutEverywhere.length).toBe(0);
  });

  it("revokes all sessions for the authenticated user via the admin Auth API", async () => {
    const { signOut } = setup({});

    const res = await signOutEverywhere();

    expect(res).toEqual({ success: true });
    expect(createAdminClient).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith(ACCESS_TOKEN, "global");
  });

  it("unauthenticated invocation fails without touching the admin client", async () => {
    const { signOut } = setup({ user: null, accessToken: null });

    const res = await signOutEverywhere();

    expect(res).toEqual({ error: "Not authenticated" });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("fails when no active session token is available", async () => {
    const { signOut } = setup({ accessToken: null });

    const res = await signOutEverywhere();

    expect(res).toEqual({ error: "No active session found." });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("surfaces admin API errors", async () => {
    setup({ adminError: { message: "revocation failed" } });

    const res = await signOutEverywhere();

    expect(res).toEqual({ error: "revocation failed" });
  });
});
