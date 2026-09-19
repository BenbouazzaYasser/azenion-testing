/**
 * Roadmap UI data model.
 *
 * This is the UI/data boundary for the Academy Roadmaps section. Components
 * under `components/sections/academy/roadmaps/` render *only* these shapes —
 * they never query Supabase directly. When the backend lands, only
 * `lib/roadmaps/catalog.ts` (the loader) needs to change; the UI stays as-is.
 *
 * Mental model (THM-style progression):
 *   Roadmap → Stage → Course/Lab node → Completion → Next stage
 *
 * Nodes can reference courses, labs, and future Academy content types through
 * the extensible `RoadmapContentKind` union. Progression is expressed with
 * `RoadmapNodeStatus` plus optional `requiresCompletionOf` prerequisite ids.
 */

export type RoadmapLevel = "beginner" | "intermediate" | "advanced";

/** Position of a node on the learner's path. */
export type RoadmapNodeStatus =
  | "completed"
  | "current"
  | "upcoming"
  | "locked";

/**
 * The kind of Academy content a node points at. Kept as a union (not a
 * closed enum) so future content types slot in without rewriting roadmap UI.
 */
export type RoadmapContentKind = "course" | "lab";

/**
 * A single learnable step inside a stage. `href` is resolved by the catalog
 * layer (e.g. `/academy/courses/<id>` or `/academy/labs/<id>`), so roadmap
 * components stay agnostic of course/lab routing details.
 */
export interface RoadmapNodeRef {
  id: string;
  kind: RoadmapContentKind;
  title: string;
  href: string;
  description?: string | null;
  /** Estimated effort for this node, in minutes. */
  estimatedMinutes?: number | null;
  /** Optional nodes don't block stage completion. */
  isOptional?: boolean;
  /** Node ids that must be completed before this node unlocks. */
  requiresCompletionOf?: string[];
  status: RoadmapNodeStatus;
  /**
   * Referenced course/lab is not currently available (unpublished, archived,
   * or deleted). Such nodes render inert ("no silent access") and re-check
   * availability on every read — decision #8: later-unpublished content keeps
   * the roadmap published but marks the affected node unavailable.
   */
  unavailable?: boolean;
}

/** An ordered section of a roadmap (a "stage" of the journey). */
export interface RoadmapStage {
  id: string;
  /** 1-based display order within the roadmap. */
  position: number;
  title: string;
  description?: string | null;
  nodes: RoadmapNodeRef[];
}

/** Card-level fields shared by the index page and the detail page. */
export interface RoadmapSummary {
  slug: string;
  title: string;
  description: string;
  level: RoadmapLevel;
  /** Total estimated effort, in hours. Null when unknown. */
  estimatedHours?: number | null;
  stageCount: number;
  nodeCount: number;
  courseCount: number;
  labCount: number;
  /**
   * Learner progress as a 0–1 fraction, or null when progress is unknown
   * (anonymous visitor, tracking not wired yet). Cards render a neutral
   * "not started" state for null.
   */
  progress: number | null;
}

/** Full roadmap with its ordered stages. */
export interface RoadmapDetail extends RoadmapSummary {
  stages: RoadmapStage[];
}

export const ROADMAP_LEVELS: RoadmapLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const ROADMAP_NODE_STATUSES: RoadmapNodeStatus[] = [
  "completed",
  "current",
  "upcoming",
  "locked",
];

/** Required (non-optional) nodes of a stage. */
export function requiredNodes(stage: RoadmapStage): RoadmapNodeRef[] {
  return stage.nodes.filter((node) => !node.isOptional);
}

/**
 * Fraction of required nodes completed across stages (0–1). Returns 0 when
 * there is nothing required yet so progress bars render an honest empty
 * state instead of NaN.
 */
export function getRoadmapCompletion(stages: RoadmapStage[]): number {
  const required = stages.flatMap(requiredNodes);
  if (required.length === 0) return 0;
  const done = required.filter(
    (node) => node.status === "completed",
  ).length;
  return done / required.length;
}

/** A node is actionable when it is done or is the current step. */
export function isNodeActionable(status: RoadmapNodeStatus): boolean {
  return status === "completed" || status === "current";
}

/**
 * Whether a node's declared prerequisites are all completed. Nodes without
 * `requiresCompletionOf` are unconditional (decision #3: optional nodes may
 * still act as prerequisites for others, and DO gate them here).
 */
export function nodePrerequisitesMet(
  node: Pick<RoadmapNodeRef, "requiresCompletionOf">,
  completedNodeIds: ReadonlySet<string>,
): boolean {
  return (node.requiresCompletionOf ?? []).every((id) => completedNodeIds.has(id));
}

/**
 * Status of a single node from raw progress data. Unavailable content always
 * locks the node (no silent access, #8); completed wins over prerequisites so
 * already-done work is never relocked; the first node that is neither
 * completed nor locked is promoted to "current" by the catalog.
 */
export function deriveRoadmapNodeStatus(options: {
  completed: boolean;
  available: boolean;
  prerequisitesMet: boolean;
}): RoadmapNodeStatus {
  if (!options.available) return "locked";
  if (options.completed) return "completed";
  if (!options.prerequisitesMet) return "locked";
  return "upcoming";
}

/**
 * Derived stage state for section headers: a stage is complete when all its
 * required nodes are complete, active when it holds the current node, locked
 * when every node is locked, and upcoming otherwise.
 */
export type RoadmapStageState = "completed" | "active" | "locked" | "upcoming";

export function getStageState(stage: RoadmapStage): RoadmapStageState {
  if (stage.nodes.length === 0) return "upcoming";
  const required = requiredNodes(stage);
  const relevant = required.length > 0 ? required : stage.nodes;
  if (relevant.every((node) => node.status === "completed"))
    return "completed";
  if (stage.nodes.some((node) => node.status === "current")) return "active";
  if (stage.nodes.every((node) => node.status === "locked")) return "locked";
  return "upcoming";
}
