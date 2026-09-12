import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProjectSettings } from "@/actions/project.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const PROJECT_ID = "123e4567-e89b-12d3-a456-426614174000";

function setup(opts: { user?: { id: string } | null; rpcError?: { message: string } | null }) {
  const rpc = vi.fn(async (_name: string, _args: unknown) => ({
    data: null,
    error: opts.rpcError ?? null,
  }));
  (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    auth: {
      getUser: async () => ({
        data: { user: opts.user === undefined ? { id: "user-1" } : opts.user },
        error: null,
      }),
    },
    rpc,
  });
  return { rpc };
}

function form(): FormData {
  const fd = new FormData();
  fd.set("project_id", PROJECT_ID);
  fd.set("name", "New name");
  fd.set("slug", "new-slug");
  fd.set("description", "desc");
  fd.set("visibility", "open");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateProjectSettings (canonical RPC boundary)", () => {
  it("rejects unauthenticated callers before any RPC", async () => {
    const { rpc } = setup({ user: null });
    const res = await updateProjectSettings(form());
    expect(res).toEqual({ error: "Not authenticated" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires a project id", async () => {
    setup({});
    const fd = new FormData();
    const res = await updateProjectSettings(fd);
    expect(res).toEqual({ error: "Project ID is required" });
  });

  it("delegates authorization to the RPC with no caller-supplied actor", async () => {
    const { rpc } = setup({});
    const res = await updateProjectSettings(form());
    expect(res).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("update_project_settings");
    expect(args.p_project_id).toBe(PROJECT_ID);
    // No actor/user/subject field is ever sent; the RPC uses auth.uid().
    expect(Object.keys(args).join(",")).not.toMatch(/user|actor|owner/i);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("surfaces RPC authorization failures without privilege change", async () => {
    setup({ rpcError: { message: "You do not have permission to edit this project" } });
    const res = await updateProjectSettings(form());
    expect(res).toEqual({ error: "You do not have permission to edit this project" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON inputs before the RPC", async () => {
    const { rpc } = setup({});
    const fd = form();
    fd.set("technologies", "{bad json");
    const res = await updateProjectSettings(fd);
    expect(res).toEqual({ error: "Invalid technologies format" });
    expect(rpc).not.toHaveBeenCalled();
  });
});
