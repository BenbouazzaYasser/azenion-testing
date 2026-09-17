import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendMessage } from "@/actions/chat.actions";
import { updateProjectSettings } from "@/actions/project.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

function setupMockClient(opts: {
  user?: { id: string } | null;
  conversationMembers?: { user_id: string }[];
  isBlocked?: boolean;
  rpcError?: { message: string } | null;
}) {
  const selectQueryMock = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "msg-1", created_at: new Date().toISOString() }, error: null }),
    insert: vi.fn().mockReturnThis(),
  };

  const membersData = opts.conversationMembers ?? [{ user_id: "user-1" }, { user_id: "user-2" }];
  
  const fromMock = vi.fn((table: string) => {
    if (table === "conversation_members") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: membersData, error: null }),
        }),
      };
    }
    if (table === "messages") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "msg-1", created_at: new Date().toISOString() }, error: null }),
          }),
        }),
      };
    }
    return selectQueryMock;
  });

  const rpcMock = vi.fn(async (name: string, _args: unknown) => {
    if (name === "is_user_blocked") {
      return { data: opts.isBlocked ?? false, error: null };
    }
    return { data: null, error: opts.rpcError ?? null };
  });

  (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: {
      getUser: async () => ({
        data: { user: opts.user === undefined ? { id: "user-1" } : opts.user },
        error: null,
      }),
    },
    from: fromMock,
    rpc: rpcMock,
  });

  return { fromMock, rpcMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Authorization Regression Tests", () => {
  it("chat: rejects unauthenticated user trying to send message", async () => {
    setupMockClient({ user: null });
    const res = await sendMessage("conv-1", "Hello");
    expect(res).toEqual({ error: "Not authenticated" });
  });

  it("chat: rejects blocked sender attempting to message", async () => {
    setupMockClient({
      user: { id: "user-1" },
      conversationMembers: [{ user_id: "user-1" }, { user_id: "user-2" }],
      isBlocked: true,
    });
    const res = await sendMessage("conv-1", "Hello");
    expect(res).toEqual({ error: "You can't send messages to this user because they blocked you." });
  });

  it("project: rejects unauthenticated user trying to update project settings", async () => {
    setupMockClient({ user: null });
    const fd = new FormData();
    fd.set("project_id", "proj-1");
    fd.set("name", "Test");
    fd.set("slug", "test");
    const res = await updateProjectSettings(fd);
    expect(res).toEqual({ error: "Not authenticated" });
  });

  it("project: surfaces authorization failure when unauthorized user attempts update via RPC", async () => {
    setupMockClient({
      user: { id: "unauthorized-user" },
      rpcError: { message: "You do not have permission to edit this project" },
    });
    const fd = new FormData();
    fd.set("project_id", "proj-1");
    fd.set("name", "Test");
    fd.set("slug", "test");
    const res = await updateProjectSettings(fd);
    expect(res).toEqual({ error: "You do not have permission to edit this project" });
  });
});
