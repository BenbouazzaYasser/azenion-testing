import type {
  RoadmapDetail,
  RoadmapNodeRef,
  RoadmapNodeStatus,
  RoadmapStage,
  RoadmapSummary,
} from "./types";
import { deriveRoadmapNodeStatus, nodePrerequisitesMet } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Roadmap catalog — the single seam between roadmap UI and data.
 *
 * Backed by two single-call RPCs (00140) so a page never issues per-node or
 * per-roadmap queries:
 *   - `list_roadmap_summaries()` → card summaries for every published roadmap
 *   - `get_roadmap_detail(p_slug)` → one payload (header + published snapshot
 *     + per-node `completed`/`available` flags + progress)
 *
 * Status derivation ({@link deriveRoadmapNodeStatus}) happens here, in one
 * testable place: unavailable content locks a node (decision #8), completed
 * wins, unmet prerequisites lock, and the first eligible node becomes
 * "current". The immutable published snapshot is the sole source of structure.
 */

/** Row shape returned by the `list_roadmap_summaries()` RPC. */
interface RoadmapSummaryRow {
  slug: string;
  title: string;
  description: string | null;
  level: RoadmapSummary["level"];
  published_at: string;
  version: number;
  estimated_hours: number | null;
  stage_count: number;
  node_count: number;
  course_count: number;
  lab_count: number;
  progress: number | null;
}

/** Node shape from the roadmap_versions.structure snapshot (00138/00139). */
interface SnapshotNode {
  id: string;
  position: number;
  kind: "course" | "lab";
  ref_id: string;
  title: string;
  description?: string | null;
  estimated_minutes?: number | null;
  is_optional?: boolean;
  required_node_ids?: string[];
}

interface SnapshotStage {
  id: string;
  position: number;
  title: string;
  description?: string | null;
  nodes: SnapshotNode[];
}

/** Row shape returned by the `get_roadmap_detail()` RPC. */
interface RoadmapDetailRow {
  slug: string;
  title: string;
  description: string | null;
  level: RoadmapSummary["level"];
  published_at: string;
  version: number;
  structure: { stages: SnapshotStage[] };
  node_flags: Record<string, { completed: boolean; available: boolean }>;
  progress: number | null;
}

function toNodeHref(kind: SnapshotNode["kind"], refId: string): string {
  return kind === "course"
    ? `/api/academy/courses/${refId}/file`
    : `/academy/labs/${refId}`;
}

function estimatedHoursFromSnapshots(
  stages: SnapshotStage[] | undefined,
): number | null {
  const minutes = (stages ?? []).reduce(
    (sum, stage) =>
      sum +
      (stage.nodes ?? []).reduce(
        (stageSum, node) =>
          stageSum + (typeof node.estimated_minutes === "number" ? node.estimated_minutes : 0),
        0,
      ),
    0,
  );
  return minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : null;
}

function toSummary(row: RoadmapSummaryRow): RoadmapSummary {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    level: row.level,
    estimatedHours:
      typeof row.estimated_hours === "number" ? row.estimated_hours : null,
    stageCount: row.stage_count,
    nodeCount: row.node_count,
    courseCount: row.course_count,
    labCount: row.lab_count,
    progress: row.progress ?? null,
  };
}

/** Promote the first upcoming node (in stage/node order) to "current". */
function assignCurrent(stages: RoadmapStage[]): void {
  for (const stage of stages) {
    for (const node of stage.nodes) {
      if (node.status === "upcoming") {
        node.status = "current";
        return;
      }
    }
  }
}

function toDetailStages(
  stages: SnapshotStage[] | undefined,
  flags: RoadmapDetailRow["node_flags"],
): RoadmapStage[] {
  const completedIds = new Set<string>((stages ?? []).flatMap((stage) =>
    (stage.nodes ?? [])
      .filter((node) => flags[node.id]?.completed)
      .map((node) => node.id),
  ));

  return (stages ?? []).map((stage) => ({
    id: stage.id,
    position: stage.position,
    title: stage.title,
    description: stage.description ?? null,
    nodes: (stage.nodes ?? []).map<RoadmapNodeRef & { status: RoadmapNodeStatus }>(
      (node) => {
        const flag = flags[node.id] ?? { completed: false, available: true };
        const unavailable = flag.available === false;
        const status = deriveRoadmapNodeStatus({
          completed: flag.completed,
          available: flag.available,
          prerequisitesMet: nodePrerequisitesMet(
            { requiresCompletionOf: node.required_node_ids },
            completedIds,
          ),
        });
        return {
          id: node.id,
          kind: node.kind,
          title: node.title,
          href: toNodeHref(node.kind, node.ref_id),
          description: node.description ?? null,
          estimatedMinutes:
            typeof node.estimated_minutes === "number"
              ? node.estimated_minutes
              : null,
          isOptional: node.is_optional ?? false,
          requiresCompletionOf: node.required_node_ids ?? [],
          status,
          unavailable,
        };
      },
    ),
  }));
}

function toDetail(row: RoadmapDetailRow): RoadmapDetail {
  const stages = toDetailStages(row.structure?.stages, row.node_flags ?? {});
  assignCurrent(stages);

  const allNodes = (row.structure?.stages ?? []).flatMap(
    (stage) => stage.nodes ?? [],
  );

  return {
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    level: row.level,
    estimatedHours: estimatedHoursFromSnapshots(row.structure?.stages),
    stageCount: stages.length,
    nodeCount: allNodes.length,
    courseCount: allNodes.filter((node) => node.kind === "course").length,
    labCount: allNodes.filter((node) => node.kind === "lab").length,
    progress: row.progress ?? null,
    stages,
  };
}

/** All published roadmaps, newest first, as card summaries. */
export async function listRoadmapSummaries(): Promise<RoadmapSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_roadmap_summaries");
  if (error || !Array.isArray(data)) return [];
  return (data as RoadmapSummaryRow[]).map(toSummary);
}

/**
 * Full published roadmap for its permalink slug, or null when the slug is
 * unknown or the roadmap isn't published (caller renders the not-found state).
 */
export async function getRoadmapBySlug(
  slug: string,
): Promise<RoadmapDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_roadmap_detail", {
    p_slug: slug,
  });
  if (error || data === null || typeof data !== "object") return null;
  return toDetail(data as RoadmapDetailRow);
}