import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupOrphanedStorageObjects, safeRemoveStorageObjects, reconcileOrphanedStorage } from "@/lib/storage-cleanup";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";

beforeEach(() => {
  vi.clearAllMocks();
});

function storageDouble(opts: {
  removeError?: { message: string } | null;
  removed?: { name: string }[];
  listError?: { message: string } | null;
  listData?: { name: string }[] | null;
}) {
  const remove = vi.fn(async (_paths: string[]) => ({
    data: opts.removed ?? [],
    error: opts.removeError ?? null,
  }));
  const list = vi.fn(async (_prefix: string, _opts?: unknown) => ({
    data: opts.listData ?? null,
    error: opts.listError ?? null,
  }));
  return {
    remove,
    list,
    from: vi.fn((_bucket: string) => ({ remove, list })),
  };
}

describe("cleanupOrphanedStorageObjects (admin-client, pre-existing contract)", () => {
  it("is a no-op success when given no paths", async () => {
    const admin = { storage: storageDouble({}) };
    (createAdminClient as any).mockReturnValue(admin);

    const res = await cleanupOrphanedStorageObjects("avatars", []);
    expect(res).toEqual({ success: true, removed: [] });
    expect(admin.storage.from).not.toHaveBeenCalled();
  });

  it("removes valid paths and returns the removed names", async () => {
    const admin = { storage: storageDouble({ removed: [{ name: "a.png" }, { name: "b.png" }] }) };
    (createAdminClient as any).mockReturnValue(admin);

    const res = await cleanupOrphanedStorageObjects("avatars", ["a.png", "b.png"]);
    expect(res).toEqual({ success: true, removed: ["a.png", "b.png"] });
    expect(admin.storage.from).toHaveBeenCalledWith("avatars");
  });

  it("filters blank paths before removal", async () => {
    const admin = { storage: storageDouble({ removed: [{ name: "a.png" }] }) };
    (createAdminClient as any).mockReturnValue(admin);

    const res = await cleanupOrphanedStorageObjects("avatars", ["a.png", "   "]);
    expect(res).toEqual({ success: true, removed: ["a.png"] });
    const removeMock = admin.storage.from("avatars").remove;
    expect(removeMock).toHaveBeenCalledWith(["a.png"]);
  });

  it("returns a structured error instead of throwing when removal fails", async () => {
    const admin = { storage: storageDouble({ removeError: { message: "denied" } }) };
    (createAdminClient as any).mockReturnValue(admin);

    const res = await cleanupOrphanedStorageObjects("avatars", ["a.png"]);
    expect(res).toEqual({ success: false, removed: [], error: "denied" });
  });
});

describe("safeRemoveStorageObjects (caller-provided client)", () => {
  it("filters traversal paths (..) as a safety guard", async () => {
    const client = { storage: storageDouble({ removed: [] }) };
    const res = await safeRemoveStorageObjects(client as any, "bucket", ["ok.png", "../escape.png"]);

    expect(res).toEqual({ success: true, removed: [] });
    expect(client.storage.from("bucket").remove).toHaveBeenCalledWith(["ok.png"]);
  });

  it("never throws; returns structured error on failure", async () => {
    const client = { storage: storageDouble({ removeError: { message: "conflict" } }) };
    const res = await safeRemoveStorageObjects(client as any, "bucket", ["a.png"]);
    expect(res).toEqual({ success: false, removed: [], error: "conflict" });
  });

  it("normalizes blank input to a no-op success", async () => {
    const client = { storage: storageDouble({}) };
    const res = await safeRemoveStorageObjects(client as any, "bucket", ["", " "]);
    expect(res).toEqual({ success: true, removed: [] });
    expect(client.storage.from).not.toHaveBeenCalled();
  });
});

describe("reconcileOrphanedStorage (list + diff against active paths)", () => {
  it("removes listed objects that are not referenced by activePaths", async () => {
    const client = {
      storage: storageDouble({
        listData: [
          { name: "keep.png" },
          { name: "orphan.png" },
        ],
        removed: [{ name: "folder/orphan.png" }],
      }),
    };
    const active = new Set(["folder/keep.png"]);

    const res = await reconcileOrphanedStorage(client as any, "avatars", "folder", active);
    expect(res).toEqual({ removedCount: 1, errors: [] });
    expect(client.storage.from("avatars").remove).toHaveBeenCalledWith(["folder/orphan.png"]);
  });

  it("reports a summary error when listing fails without throwing", async () => {
    const client = { storage: storageDouble({ listError: { message: "no access" } }) };
    const res = await reconcileOrphanedStorage(client as any, "avatars", "folder", new Set());
    expect(res).toEqual({ removedCount: 0, errors: ["no access"] });
  });
});