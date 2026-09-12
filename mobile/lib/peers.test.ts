import { clearPeerCache, resolvePeers } from "./peers";
import { supabase } from "./supabase";

jest.mock("./supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const client = supabase as unknown as {
  from: jest.Mock;
  rpc: jest.Mock;
};

function tableStub(row: unknown) {
  return {
    select: (..._a: unknown[]) => ({
      eq: (..._b: unknown[]) => ({
        maybeSingle: async () => ({ data: row, error: null }),
      }),
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearPeerCache();
});

describe("resolvePeers", () => {
  it("resolves the caller from their own RLS-readable row even when search omits them", async () => {
    client.from.mockImplementation((table: string) => {
      if (table === "profiles") return tableStub({ id: "me", username: "me", full_name: "Me", avatar_url: null });
      return tableStub(null);
    });
    // search_users returns only other users (e.g. capped window without self).
    client.rpc.mockResolvedValue({
      data: [{ id: "u-2", username: "other", full_name: "Other", avatar_url: null }],
      error: null,
    });

    const out = await resolvePeers(["me", "u-2", "ghost"], "me");

    expect(out.get("me")).toMatchObject({ username: "me", full_name: "Me" });
    expect(out.get("u-2")).toMatchObject({ username: "other" });
    // Unknown ids stay unknown — no fake identity is invented.
    expect(out.has("ghost")).toBe(false);
    expect(client.from).toHaveBeenCalledWith("profiles");
  });

  it("never queries profiles for other users", async () => {
    client.rpc.mockResolvedValue({ data: [], error: null });
    await resolvePeers(["u-9"], "me");
    expect(client.from).not.toHaveBeenCalled();
  });
});
