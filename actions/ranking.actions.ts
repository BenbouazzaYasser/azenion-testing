"use server";

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

export async function getTrendingTeamIds(limit = 12): Promise<string[]> {
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

export async function getFeaturedProjectIds(limit = 12): Promise<string[]> {
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