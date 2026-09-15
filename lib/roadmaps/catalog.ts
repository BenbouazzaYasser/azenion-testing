import type { RoadmapDetail, RoadmapSummary } from "./types";

/**
 * Roadmap catalog — the single seam between roadmap UI and data.
 *
 * There is no roadmap backend yet (no tables, no RLS, no queries), so both
 * loaders intentionally resolve to "no published roadmaps". Pages and
 * components are built against this async boundary, which means connecting
 * Supabase later only changes this file:
 *
 *   - `listRoadmapSummaries` → select published roadmaps + aggregate counts
 *   - `getRoadmapBySlug`     → select roadmap + ordered stages + node refs,
 *                              resolving each node to its course/lab href
 *
 * Deliberately no mock/seed roadmaps here: the index renders an honest
 * "coming soon" empty state and unknown slugs render the not-found state,
 * so nothing fake is ever presented as real Academy content.
 */
export async function listRoadmapSummaries(): Promise<RoadmapSummary[]> {
  return [];
}

export async function getRoadmapBySlug(
  _slug: string,
): Promise<RoadmapDetail | null> {
  return null;
}
