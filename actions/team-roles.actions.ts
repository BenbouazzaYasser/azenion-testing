"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasTeamPermission, TeamPermission } from "@/lib/team-permissions.server";
import {
  createTeamRoleSchema,
  updateTeamRoleSchema,
  deleteTeamRoleSchema,
  setRolePermissionsSchema,
  assignMemberRolesSchema,
} from "@/lib/validations/team-roles.schema";

export async function createTeamRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = createTeamRoleSchema.safeParse({
    team_id: formData.get("team_id"),
    name: formData.get("name"),
    color: (formData.get("color") as string) || null,
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("create_team_role", {
    p_team_id: parsed.data.team_id,
    p_name: parsed.data.name,
    p_color: parsed.data.color,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { error: "A role with this name already exists in the team." };
    }
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath(`/teams/${formData.get("slug")}/settings`);
  return { success: true };
}

export async function updateTeamRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawName = formData.get("name") as string | null;
  const rawColor = formData.get("color") as string | null;

  const parsed = updateTeamRoleSchema.safeParse({
    role_id: formData.get("role_id"),
    name: rawName && rawName.trim() ? rawName : undefined,
    color: rawColor || null,
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("update_team_role", {
    p_role_id: parsed.data.role_id,
    p_name: parsed.data.name ?? null,
    p_color: parsed.data.color ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}/settings`);
  return { success: true };
}

export async function deleteTeamRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = deleteTeamRoleSchema.safeParse({
    role_id: formData.get("role_id"),
    team_id: formData.get("team_id"),
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("delete_team_role", {
    p_role_id: parsed.data.role_id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath(`/teams/${formData.get("slug")}/settings`);
  return { success: true };
}

export async function setRolePermissions(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let permissions: string[] = [];
  try {
    permissions = JSON.parse((formData.get("permissions") as string) || "[]");
  } catch {
    return { error: "Invalid permissions format" };
  }

  const parsed = setRolePermissionsSchema.safeParse({
    role_id: formData.get("role_id"),
    permissions,
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("set_role_permissions", {
    p_role_id: parsed.data.role_id,
    p_permissions: parsed.data.permissions,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}/settings`);
  return { success: true };
}

export async function assignMemberRoles(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let roleIds: string[] = [];
  try {
    roleIds = JSON.parse((formData.get("role_ids") as string) || "[]");
  } catch {
    return { error: "Invalid role_ids format" };
  }

  const parsed = assignMemberRolesSchema.safeParse({
    team_id: formData.get("team_id"),
    member_id: formData.get("member_id"),
    role_ids: roleIds,
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase.rpc("assign_member_roles", {
    p_team_id: parsed.data.team_id,
    p_member_id: parsed.data.member_id,
    p_role_ids: parsed.data.role_ids,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath(`/teams/${formData.get("slug")}/settings`);
  return { success: true };
}

/** Guard used by server actions that need a team permission. */
export async function requireTeamPermission(
  teamId: string,
  permission: TeamPermission
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const allowed = await hasTeamPermission(teamId, permission);
  if (!allowed) return { error: "You do not have permission to do this" };

  return { ok: true };
}
