import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCourse } from "@/actions/academy-courses.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";

function userClientDouble(opts: {
  user?: { id: string } | null;
  oracleData?: unknown;
  oracleError?: { message: string } | null;
}) {
  const rpc = vi.fn(async (name: string, _args?: unknown) => ({
    data: opts.oracleData ?? null,
    error: opts.oracleError ?? null,
  }));
  return {
    rpc,
    auth: {
      getUser: async () => ({
        data: { user: opts.user === undefined ? { id: "user-1" } : opts.user },
        error: null,
      }),
    },
  };
}

function adminDouble() {
  const tableStub = () => ({
    select: (..._a: unknown[]) => ({
      eq: (..._b: unknown[]) => ({
        maybeSingle: async () => ({
          data: { file_path: "courses/owner-1/abc.pdf", thumbnail: null },
          error: null,
        }),
      }),
    }),
    delete: (..._a: unknown[]) => ({
      eq: (..._b: unknown[]) => ({ error: null }),
    }),
  });
  return {
    rpc: vi.fn(),
    from: vi.fn((_table: string) => tableStub()),
    storage: {
      from: vi.fn((_bucket: string) => ({
        remove: vi.fn(async (_paths: string[]) => ({ data: [], error: null })),
      })),
    },
  };
}

function formWithId(id: string): FormData {
  const fd = new FormData();
  fd.set("id", id);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("course-manager gate delegates to the canonical DB oracle", () => {
  it("calls is_course_manager on the user-scoped client with no user-id argument", async () => {
    const userClient: any = userClientDouble({ oracleData: true });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    await deleteCourse(formWithId(COURSE_ID));

    expect(userClient.rpc).toHaveBeenCalledTimes(1);
    expect(userClient.rpc).toHaveBeenCalledWith("is_course_manager");
    // The authorization decision must not come from the service-role client.
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it.each([
    { role: "platform admin", oracle: true, allowed: true },
    { role: "core team member", oracle: true, allowed: true },
    { role: "creator", oracle: true, allowed: true },
    { role: "instructor without course-manager privilege", oracle: false, allowed: false },
    { role: "ordinary user", oracle: false, allowed: false },
  ])("$role (oracle=$oracle) is ${allowed ? 'allowed' : 'denied'}", async ({ oracle, allowed }) => {
    const userClient: any = userClientDouble({ oracleData: oracle });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const res = await deleteCourse(formWithId(COURSE_ID));

    if (allowed) {
      expect(res).toEqual({ success: true });
      expect(admin.from).toHaveBeenCalled();
    } else {
      expect(res).toEqual({ error: "Not authorized - core team only" });
      expect(admin.from).not.toHaveBeenCalled();
    }
  });

  it("fails closed when the oracle errors", async () => {
    const userClient: any = userClientDouble({
      oracleData: null,
      oracleError: { message: "boom" },
    });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const res = await deleteCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ error: "Not authorized - core team only" });
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("unauthenticated callers get 'Not authenticated' before the gate", async () => {
    const userClient: any = userClientDouble({ user: null, oracleData: true });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const res = await deleteCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ error: "Not authenticated" });
    expect(userClient.rpc).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });
});
