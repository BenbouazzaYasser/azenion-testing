import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  updateCourseStatus,
} from "@/actions/academy-courses.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";
const TEAM_ID = "223e4567-e89b-12d3-a456-426614174000";

function userClientDouble(opts: {
  user?: { id: string } | null;
  oracleData?: unknown;
  oracleError?: { message: string } | null;
  rpcError?: { message: string } | null;
  fromSelectData?: unknown;
}) {
  const rpc = vi.fn(async (name: string, _args?: unknown) => {
    if (name === "is_course_manager" || name === "can_create_course") {
      return { data: opts.oracleData ?? null, error: opts.oracleError ?? null };
    }
    return { data: null, error: opts.rpcError ?? null };
  });
  const from = vi.fn((_table: string) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: async () => ({
          data: opts.fromSelectData ?? null,
          error: null,
        }),
      }),
    }),
  }));
  return {
    rpc,
    from,
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
    update: (..._a: unknown[]) => ({
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

describe("course creation is gated through can_create_course", () => {
  it("creators without can_create_course are rejected before any write", async () => {
    const userClient: any = userClientDouble({ oracleData: false });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const fd = new FormData();
    fd.set("title", "Intro");
    fd.set("category", "Programming");
    fd.set("content_type", "pdf");
    fd.set("file", new File(["x"], "x.pdf", { type: "application/pdf" }));
    const res = await createCourse(fd);

    expect(res).toEqual({ error: "Not authorized - core team or team course publisher only" });
    expect(userClient.rpc).toHaveBeenCalledWith("can_create_course");
    expect(admin.from).not.toHaveBeenCalled();
  });
});

describe("publishCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unauthenticated callers are rejected before any RPC", async () => {
    const userClient: any = userClientDouble({ user: null });
    (createClient as any).mockResolvedValue(userClient);

    const res = await publishCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ error: "Not authenticated" });
    expect(userClient.rpc).not.toHaveBeenCalled();
  });

  it("delegates individual publishing to publish_course with a null team id", async () => {
    const userClient: any = userClientDouble({});
    (createClient as any).mockResolvedValue(userClient);

    const res = await publishCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ success: true });
    expect(userClient.rpc).toHaveBeenCalledWith("publish_course", {
      p_course_id: COURSE_ID,
      p_publisher_team_id: null,
    });
  });

  it("passes the selected team id to publish_course", async () => {
    const userClient: any = userClientDouble({});
    (createClient as any).mockResolvedValue(userClient);

    const fd = formWithId(COURSE_ID);
    fd.set("publisher_team_id", TEAM_ID);
    const res = await publishCourse(fd);

    expect(res).toEqual({ success: true });
    expect(userClient.rpc).toHaveBeenCalledWith("publish_course", {
      p_course_id: COURSE_ID,
      p_publisher_team_id: TEAM_ID,
    });
  });

  it("rejects malformed team ids without calling the oracle", async () => {
    const userClient: any = userClientDouble({});
    (createClient as any).mockResolvedValue(userClient);

    const fd = formWithId(COURSE_ID);
    fd.set("publisher_team_id", "not-a-uuid");
    const res = await publishCourse(fd);

    expect(res).toEqual({ error: "Invalid publisher team id" });
    expect(userClient.rpc).not.toHaveBeenCalled();
  });

  it("surfaces server-side authorization failures from publish_course", async () => {
    const userClient: any = userClientDouble({
      rpcError: { message: "Not authorized to publish this course" },
    });
    (createClient as any).mockResolvedValue(userClient);

    const res = await publishCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ error: "Not authorized to publish this course" });
  });
});

describe("unpublishCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unauthenticated callers are rejected before any RPC", async () => {
    const userClient: any = userClientDouble({ user: null });
    (createClient as any).mockResolvedValue(userClient);

    const res = await unpublishCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ error: "Not authenticated" });
    expect(userClient.rpc).not.toHaveBeenCalled();
  });

  it("delegates to unpublish_course with the course id", async () => {
    const userClient: any = userClientDouble({});
    (createClient as any).mockResolvedValue(userClient);

    const res = await unpublishCourse(formWithId(COURSE_ID));

    expect(res).toEqual({ success: true });
    expect(userClient.rpc).toHaveBeenCalledWith("unpublish_course", {
      p_course_id: COURSE_ID,
    });
  });
});

describe("updateCourseStatus keeps published transitions out of direct status flips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects 'published' so publish decisions go through publishCourse", async () => {
    const userClient: any = userClientDouble({ oracleData: true });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const fd = formWithId(COURSE_ID);
    fd.set("status", "published");
    const res = await updateCourseStatus(fd);

    expect(res.error).toContain("Invalid status");
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("allows draft <-> archived for course managers", async () => {
    const userClient: any = userClientDouble({ oracleData: true });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const fd = formWithId(COURSE_ID);
    fd.set("status", "archived");
    const res = await updateCourseStatus(fd);

    expect(res).toEqual({ success: true, status: "archived" });
    expect(userClient.rpc).toHaveBeenCalledWith("is_course_manager");
  });

  it("non-managers may not toggle status", async () => {
    const userClient: any = userClientDouble({ oracleData: false });
    const admin: any = adminDouble();
    (createClient as any).mockResolvedValue(userClient);
    (createAdminClient as any).mockReturnValue(admin);

    const fd = formWithId(COURSE_ID);
    fd.set("status", "archived");
    const res = await updateCourseStatus(fd);

    expect(res).toEqual({ error: "Not authorized - core team only" });
    expect(admin.from).not.toHaveBeenCalled();
  });
});
