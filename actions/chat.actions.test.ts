import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchUsers } from "@/actions/chat.actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const searchUsersRow = {
  id: "user-1",
  username: "alice",
  full_name: "Alice A",
  institution: "Example",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchUsers privacy", () => {
  it("returns an empty list without hitting the database for anonymous callers", async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });

    const result = await searchUsers("alice");

    expect(result).toEqual([]);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("uses the search_users RPC through the session-bound client and never the admin client", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [searchUsersRow], error: null });
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "session-user" } }, error: null }) },
      rpc,
    });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(),
    });

    const result = await searchUsers("ali");

    expect(createAdminClient).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("search_users", {
      p_query: "ali",
      p_limit: 10,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "user-1",
      username: "alice",
      full_name: "Alice A",
      avatar_url: null,
    });
  });

  it("never calls the RPC for an empty query", async () => {
    const rpc = vi.fn();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id: "session-user" } }, error: null }) },
      rpc,
    });

    await searchUsers("   ");

    expect(rpc).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});