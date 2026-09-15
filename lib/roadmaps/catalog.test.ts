import { describe, expect, it } from "vitest";

import { getRoadmapBySlug, listRoadmapSummaries } from "@/lib/roadmaps/catalog";
import {
  getRoadmapCompletion,
  getStageState,
  isNodeActionable,
  type RoadmapStage,
} from "@/lib/roadmaps/types";

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

describe("roadmap catalog boundary", () => {
  it("lists no roadmaps before the backend lands", async () => {
    await expect(listRoadmapSummaries()).resolves.toEqual([]);
  });

  it("resolves unknown slugs to null (not-found UI)", async () => {
    await expect(getRoadmapBySlug("anything")).resolves.toBeNull();
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
