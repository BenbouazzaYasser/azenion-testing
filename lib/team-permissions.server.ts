import { createClient } from "@/lib/supabase/server";
import { TeamPermission, TEAM_PERMISSIONS } from "./team-permissions";

export { TeamPermission, TEAM_PERMISSIONS };

/**
 * Checks whether the current user has the given permission in a team.
 * Server-only — delegates to the `has_team_permission` SQL function so the
 * result is always the database's authoritative answer (owner + platform
 * admin implicitly hold every permission).
 */
export async function hasTeamPermission(
  teamId: string,
  permission: TeamPermission
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_team_permission", {
    p_team_id: teamId,
    p_permission: permission,
  });
  return data === true;
}

/** Checks several permissions at once and returns a lookup map. */
export async function getTeamPermissions(
  teamId: string,
  permissions: readonly TeamPermission[]
): Promise<Record<TeamPermission, boolean>> {
  const entries = await Promise.all(
    permissions.map(async (p) => [p, await hasTeamPermission(teamId, p)] as const)
  );
  return Object.fromEntries(entries) as Record<TeamPermission, boolean>;
}