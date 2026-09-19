import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getRoadmapBySlug, listRoadmapSummaries } from "@/lib/roadmaps/catalog";
import {
  deriveRoadmapNodeStatus,
  getRoadmapCompletion,
  getStageState,
  isNodeActionable,
  nodePrerequisitesMet,
  type RoadmapStage,
} from "@/lib/roadmaps/types";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";

const mockedCreateClient = vi.mocked(createClient);

function clientWithRpc(rpc: Mock) {
  return { rpc };
}

function stage(
  statuses: ("completed" | "current" | "upcoming" | "locked")[],
  opts?: { optional?: number[] },
): RoadmapStage {
  return {
    id: "stage-1",
    position: 1,
    title: "Stage",
    nodes: statuses.map((status, i) => ({
      id: `node-${i}`,
      kind: i % 2 === 0 ? "course" : "lab",
      title: `Node ${i}`,
      href: "#",
      isOptional: opts?.optional?.includes(i) ?? false,
      status,
    })),
  };
}

const SUMMARY_ROW = {
  slug: "backend-bootcamp",
  title: "Backend Bootcamp",
  description: "Learn the backend from scratch.",
  level: "intermediate",
  published_at: "2026-09-01T00:00:00Z",
  version: 3,
  estimated_hours: 12.5,
  stage_count: 2,
  node_count: 3,
  course_count: 2,
  lab_count: 1,
  progress: 0.33,
};

const DETAIL_ROW = {
  slug: "backend-bootcamp",
  title: "Backend Bootcamp",
  description: "Learn the backend from scratch.",
  level: "intermediate",
  published_at: "2026-09-01T00:00:00Z",
  version: 3,
  progress: 0.5,
  structure: {
    stages: [
      {
        id: "stage-1",
        position: 1,
        title: "Stage One",
        description: null,
        nodes: [
          {
            id: "n1",
            position: 1,
            kind: "course",
            ref_id: "course-1",
            title: "Node 1",
            description: null,
            estimated_minutes: 30,
            is_optional: false,
            required_node_ids: [],
          },
          {
            id: "n2",
            position: 2,
            kind: "lab",
            ref_id: "lab-1",
            title: "Node 2",
            description: null,
            estimated_minutes: 20,
            is_optional: false,
            required_node_ids: ["n1"],
          },
        ],
      },
    ],
  },
  node_flags: {
    n1: { completed: true, available: true },
    n2: { completed: false, available: true },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("roadmap catalog loads through the 00140 read RPCs", () => {
  it("lists published roadmaps from the summaries RPC", async () => {
    const rpc = vi.fn(async () => ({ data: [SUMMARY_ROW], error: null }));
    mockedCreateClient.mockResolvedValue(clientWithRpc(rpc) as never);

    await expect(listRoadmapSummaries()).resolves.toEqual([
      {
        slug: "backend-bootcamp",
        title: "Backend Bootcamp",
        description: "Learn the backend from scratch.",
        level: "intermediate",
        estimatedHours: 12.5,
        stageCount: 2,
        nodeCount: 3,
        courseCount: 2,
        labCount: 1,
        progress: 0.33,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("list_roadmap_summaries");
  });

  it("returns an honest empty list on RPC error", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    mockedCreateClient.mockResolvedValue(clientWithRpc(rpc) as never);

    await expect(listRoadmapSummaries()).resolves.toEqual([]);
  });

  it("resolves unknown/unpublished slugs to null (not-found)", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    mockedCreateClient.mockResolvedValue(clientWithRpc(rpc) as never);

    await expect(getRoadmapBySlug("anything")).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("get_roadmap_detail", { p_slug: "anything" });
  });

  it("maps detail structure and derives hrefs, statuses and counts", async () => {
    const rpc = vi.fn(async () => ({ data: DETAIL_ROW, error: null }));
    mockedCreateClient.mockResolvedValue(clientWithRpc(rpc) as never);

    const detail = await getRoadmapBySlug("backend-bootcamp");
    expect(detail).not.toBeNull();
    const roadmap = detail!;

    expect(roadmap.slug).toBe("backend-bootcamp");
    expect(roadmap.progress).toBe(0.5);
    expect(roadmap.estimatedHours).toBe(0.8); // (30 + 20) min = 0.83h
    expect(roadmap.stageCount).toBe(1);
    expect(roadmap.nodeCount).toBe(2);
    expect(roadmap.courseCount).toBe(1);
    expect(roadmap.labCount).toBe(1);

    const stage = roadmap.stages[0]!;
    const first = stage.nodes[0]!;
    const second = stage.nodes[1]!;
    expect(first.status).toBe("completed");
    expect(first.href).toBe("/api/academy/courses/course-1/file");
    expect(first.unavailable).toBe(false);
    expect(second.status).toBe("current"); // promoted from upcoming
    expect(second.href).toBe("/academy/labs/lab-1");
    expect(second.requiresCompletionOf).toEqual(["n1"]);
  });

  it("locks and flags nodes whose content became unavailable", async () => {
    const row = structuredClone(DETAIL_ROW);
    row.node_flags = {
      n1: { completed: false, available: true },
      n2: { completed: false, available: false },
    };
    const rpc = vi.fn(async () => ({ data: row, error: null }));
    mockedCreateClient.mockResolvedValue(clientWithRpc(rpc) as never);

    const roadmap = (await getRoadmapBySlug("backend-bootcamp"))!;
    const stage = roadmap.stages[0]!;
    const first = stage.nodes[0]!;
    const second = stage.nodes[1]!;
    expect(first.status).toBe("current");
    expect(second.status).toBe("locked");
    expect(second.unavailable).toBe(true);
  });
});

describe("nodePrerequisitesMet", () => {
  it("is satisfied with no declared prerequisites", () => {
    expect(nodePrerequisitesMet({ requiresCompletionOf: undefined }, new Set())).toBe(true);
    expect(nodePrerequisitesMet({ requiresCompletionOf: [] }, new Set())).toBe(true);
  });

  it("requires every declared prerequisite to be completed", () => {
    const done = new Set(["n1"]);
    expect(nodePrerequisitesMet({ requiresCompletionOf: ["n1"] }, done)).toBe(true);
    expect(nodePrerequisitesMet({ requiresCompletionOf: ["n1", "n2"] }, done)).toBe(false);
  });

  it("treats optional nodes as gateable prerequisites too", () => {
    const done = new Set<string>();
    expect(
      nodePrerequisitesMet({ requiresCompletionOf: ["n-optional"] }, done),
    ).toBe(false);
  });
});

describe("deriveRoadmapNodeStatus", () => {
  it("prefers unavailable over completed and prerequisites", () => {
    expect(
      deriveRoadmapNodeStatus({ completed: true, available: false, prerequisitesMet: true }),
    ).toBe("locked");
  });

  it("completed wins over unmet prerequisites", () => {
    expect(
      deriveRoadmapNodeStatus({ completed: true, available: true, prerequisitesMet: false }),
    ).toBe("completed");
  });

  it("locks when prerequisites are unmet", () => {
    expect(
      deriveRoadmapNodeStatus({ completed: false, available: true, prerequisitesMet: false }),
    ).toBe("locked");
  });

  it("returns upcoming when the node is otherwise actionable", () => {
    expect(
      deriveRoadmapNodeStatus({ completed: false, available: true, prerequisitesMet: true }),
    ).toBe("upcoming");
  });
});

describe("getRoadmapCompletion", () => {
  it("returns 0 for empty roadmaps instead of NaN", () => {
    expect(getRoadmapCompletion([])).toBe(0);
    expect(getRoadmapCompletion([stage([])])).toBe(0);
  });

  it("counts required nodes across mixed course/lab stages", () => {
    const stages = [
      stage(["completed", "completed"]),
      stage(["current", "upcoming"]),
    ];
    expect(getRoadmapCompletion(stages)).toBe(0.5);
  });

  it("ignores optional nodes so they never block completion", () => {
    const stages = [stage(["completed", "upcoming"], { optional: [1] })];
    expect(getRoadmapCompletion(stages)).toBe(1);
  });
});

describe("getStageState", () => {
  it("derives completed / active / locked / upcoming states", () => {
    expect(getStageState(stage(["completed", "completed"]))).toBe("completed");
    expect(getStageState(stage(["completed", "current"]))).toBe("active");
    expect(getStageState(stage(["locked", "locked"]))).toBe("locked");
    expect(getStageState(stage(["completed", "upcoming"]))).toBe("upcoming");
    expect(getStageState(stage([]))).toBe("upcoming");
  });
});

describe("isNodeActionable", () => {
  it("only treats completed/current nodes as actionable", () => {
    expect(isNodeActionable("completed")).toBe(true);
    expect(isNodeActionable("current")).toBe(true);
    expect(isNodeActionable("upcoming")).toBe(false);
    expect(isNodeActionable("locked")).toBe(false);
  });
});