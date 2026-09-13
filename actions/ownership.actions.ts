"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function transferTeamOwnership(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const newOwnerId = formData.get("new_owner_id") as string;
  const slug = formData.get("slug") as string;

  if (!teamId || !newOwnerId) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.rpc("transfer_team_ownership", {
    p_team_id: teamId,
    p_new_owner_id: newOwnerId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${slug}`);
  revalidatePath("/teams");
  revalidatePath("/profile");
  return { success: true };
}

export async function transferProjectOwnership(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;
  const newOwnerId = formData.get("new_owner_id") as string;
  const slug = formData.get("slug") as string;

  if (!projectId || !newOwnerId) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.rpc("transfer_project_ownership", {
    p_project_id: projectId,
    p_new_owner_id: newOwnerId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");
  revalidatePath("/profile");
  return { success: true };
}
