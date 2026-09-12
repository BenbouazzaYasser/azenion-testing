import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFeedItems } from "@/actions/feed.actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function chainable(result: unknown) {
  const self: Record<string, unknown> = {};
  const proxy = new Proxy(function () {}, {
    get(_t, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return (..._a: unknown[]) => proxy;
    },
  });
  void self;
  return proxy;
}

function setup() {
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: {
      getUser: async () => ({ data: { user: { id: "session-user" } }, error: null }),
    },
  });
  (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: (table: string) =>
      table === "posts"
        ? chainable({ count: 0, data: null, error: null })
        : chainable({ data: [], error: null }),
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return { data: [], error: null };
    },
  });
  return { rpcCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("feed viewer override (native bearer support)", () => {
  it("passes an explicit viewer id to the visibility RPC", async () => {
    const { rpcCalls } = setup();
    await getFeedItems("all", 1, 20, "viewer-9");
    const call = rpcCalls.find((c) => c.name === "get_global_feed_posts");
    expect(call).toBeDefined();
    expect(call?.args).toMatchObject({ p_viewer: "viewer-9" });
  });

  it("passes null viewer for anonymous reads", async () => {
    const { rpcCalls } = setup();
    await getFeedItems("all", 1, 20, null);
    const call = rpcCalls.find((c) => c.name === "get_global_feed_posts");
    expect(call?.args).toMatchObject({ p_viewer: null });
  });

  it("falls back to the cookie session when no viewer is given (web behavior)", async () => {
    const { rpcCalls } = setup();
    await getFeedItems("all", 1, 20);
    const call = rpcCalls.find((c) => c.name === "get_global_feed_posts");
    expect(call?.args).toMatchObject({ p_viewer: "session-user" });
  });
});
