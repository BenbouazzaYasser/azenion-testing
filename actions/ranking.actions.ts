"use server";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRENDING_WINDOW_DAYS } from "@/lib/trending";

interface TrendingRankRow {
  id: string;
}

/**
 * Best-effort helpers for the Community page dynamic sections.
 *
 * Each returns an ordered list of ids produced by the ranking RPCs in
 * supabase/migrations/00054_trending_ranking.sql. Failures (e.g. the migration
 * is not yet applied to the database) degrade to an empty list so callers can
 * fall back to their previous behaviour instead of breaking the page.
 */

async function fetchTrendingTeamIds(limit: number): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_trending_teams", {
      p_window_days: TRENDING_WINDOW_DAYS,
      p_limit: limit,
    });
    if (error) return [];
    return (data ?? []).map((r: TrendingRankRow) => r.id);
  } catch {
    return [];
  }
}
async function fetchFeaturedProjectIds(limit: number): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_featured_projects", {
      p_window_days: TRENDING_WINDOW_DAYS,
      p_limit: limit,
    });
    if (error) return [];
    return (data ?? []).map((r: TrendingRankRow) => r.id);
  } catch {
    return [];
  }
}

const getCachedTrendingTeamIds =
  process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.VITEX_TEST === "true"
    ? fetchTrendingTeamIds
    : unstable_cache(fetchTrendingTeamIds, ["trending-team-ids"], { revalidate: 30 });
const getCachedFeaturedProjectIds =
  process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.VITEX_TEST === "true"
    ? fetchFeaturedProjectIds
    : unstable_cache(fetchFeaturedProjectIds, ["featured-project-ids"], { revalidate: 30 });

export async function getTrendingTeamIds(limit = 12): Promise<string[]> {
  return getCachedTrendingTeamIds(limit);
}

export async function getFeaturedProjectIds(limit = 12): Promise<string[]> {
  return getCachedFeaturedProjectIds(limit);
}