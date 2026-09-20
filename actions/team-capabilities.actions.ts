"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TEAM_CAPABILITIES = new Set(["course_publisher"]);

/**
 * Enable or disable a team capability. Enforced server-side: only platform
 * admins may toggle capabilities (set_team_capability raises otherwise).
 */
export async function setTeamCapability(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = ((formData.get("team_id") as string) ?? "").trim();
  const capability = ((formData.get("capability") as string) ?? "").trim();
  const enabled = formData.get("enabled") === "true";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
    return { error: "Invalid team id" };
  }

  if (!TEAM_CAPABILITIES.has(capability)) {
    return { error: "Unknown capability" };
  }

  const { error } = await supabase.rpc("set_team_capability", {
    p_team_id: teamId,
    p_capability: capability,
    p_enabled: enabled,
  });

  if (error) {
    return { error: error.message };
  }

  const slug = ((formData.get("slug") as string) ?? "").trim();
  revalidatePath(slug ? `/teams/${slug}/settings` : "/teams");
  return { success: true };
}