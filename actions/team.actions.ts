"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createTeamSchema,
  updateTeamSchema,
  openRoleSchema,
  MAX_LOGO_SIZE,
  ALLOWED_LOGO_TYPES,
} from "@/lib/validations/team.schema";
import {
  PRIVATE_MEDIA_BUCKET,
  privateObjectPath,
  privateMarkerFor,
  isTeamMediaPrivate,
} from "@/lib/media";
import {
  createTeamUpdateSchema,
  updateTeamUpdateSchema,
  MAX_ASSET_SIZE,
  ALLOWED_POST_IMAGE_TYPES,
} from "@/lib/validations/project.schema";
import { safeRemoveStorageObjects } from "@/lib/storage-cleanup";

// M13: extension allow-list mirrors ALLOWED_LOGO_TYPES / ALLOWED_POST_IMAGE_TYPES
// (image/png, image/jpeg, image/webp); contentType is set from this map.
const TEAM_IMAGE_EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function teamImageExt(fileName: string): { ext: string; contentType: string } | null {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const contentType = TEAM_IMAGE_EXT_MIME[ext];
  if (!contentType || /[^a-z0-9]/.test(ext)) return null;
  return { ext, contentType };
}

// No shared team-permission helper exists in this file (sibling mutations
// enforce authorization inside their RPCs, e.g. update_team/delete_team).
// Direct-table writes below (open roles, category pivots) bypass those RPCs,
// so they re-verify owner/admin here in the action instead.
async function canManageTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string,
): Promise<boolean> {
  if (!teamId || !userId) return false;

  // Platform admin bypass via the existing is_platform_admin RPC pattern.
  try {
    const { data: isAdmin } = await (supabase as any).rpc("is_platform_admin");
    if (isAdmin === true) return true;
  } catch {
    // Fall through to team-level checks.
  }

  // Team owner / admin via membership role.
  try {
    const { data: membership } = await (supabase as any)
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();
    const role = (membership as { role?: string } | null)?.role;
    if (role === "owner" || role === "admin") return true;
  } catch {
    // Fall through to the team-row ownership check.
  }

  // Fallback: owner stored on the teams row (column name varies by schema).
  // One combined select covers the common schema; the per-column probe below
  // only runs if that query fails on an older schema.
  try {
    const { data, error } = await (supabase as any)
      .from("teams")
      .select("id, owner_id, created_by, user_id")
      .eq("id", teamId)
      .maybeSingle();
    if (!error && data) {
      const record = data as unknown as Record<string, unknown>;
      return (
        record.owner_id === userId ||
        record.created_by === userId ||
        record.user_id === userId
      );
    }
  } catch {
    // Fall through to per-column probing.
  }
  for (const column of ["owner_id", "created_by", "user_id"]) {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`id, ${column}`)
        .eq("id", teamId)
        .maybeSingle();
      if (error || !data) continue;
      const record = data as unknown as Record<string, unknown>;
      if (!(column in record)) continue;
      return record[column] === userId;
    } catch {
      continue;
    }
  }

  return false;
}

export async function createTeam(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw: Record<string, unknown> = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    description: (formData.get("description") as string) || null,
    visibility: (formData.get("visibility") as string) || "public",
    logo_url: null,
  };

  const categoryIdsRaw = formData.get("category_ids") as string | null;
  if (categoryIdsRaw) {
    try {
      raw.category_ids = JSON.parse(categoryIdsRaw);
    } catch {
      return { error: "Invalid category_ids format" };
    }
  }

  const parsed = createTeamSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error: slugError } = await supabase
    .from("teams")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (slugError) {
    return { error: slugError.message };
  }

  const { data: teamId, error } = await supabase.rpc("create_team", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description ?? null,
    p_visibility: parsed.data.visibility,
    p_logo_url: null,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { error: "A team with this name or slug already exists." };
    }
    return { error: error.message };
  }

  if (parsed.data.category_ids && parsed.data.category_ids.length > 0 && teamId) {
    if (!(await canManageTeam(supabase, teamId as string, user.id))) {
      return { error: "Not authorized to update team categories" };
    }
    const insertRows = parsed.data.category_ids.map((cid) => ({
      team_id: teamId,
      category_id: cid,
    }));
    await supabase.from("team_category_members").insert(insertRows);
  }

  revalidatePath("/teams");
  revalidatePath("/profile");
  redirect(`/teams/${parsed.data.slug}`);
}

export async function updateTeam(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw: Record<string, unknown> = {
    team_id: formData.get("team_id"),
  };

  const name = formData.get("name");
  if (name) raw.name = name;

  const slug = formData.get("slug");
  if (slug) raw.slug = slug;

  const description = formData.get("description");
  raw.description = description || null;

  const visibility = formData.get("visibility");
  if (visibility) raw.visibility = visibility;

  const technologiesRaw = formData.get("technologies") as string | null;
  if (technologiesRaw) {
    try {
      raw.technologies = JSON.parse(technologiesRaw);
    } catch {
      return { error: "Invalid technologies format" };
    }
  }

  const categoryIdsRaw = formData.get("category_ids") as string | null;
  if (categoryIdsRaw) {
    try {
      raw.category_ids = JSON.parse(categoryIdsRaw);
    } catch {
      return { error: "Invalid category_ids format" };
    }
  }

  const parsed = updateTeamSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  if (parsed.data.slug && parsed.data.slug !== formData.get("_current_slug")) {
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("slug", parsed.data.slug)
      .neq("id", parsed.data.team_id)
      .maybeSingle();

    if (existing) {
      return { error: "A team with this slug already exists." };
    }
  }

  const { error } = await supabase.rpc("update_team", {
    p_team_id: parsed.data.team_id,
    p_name: parsed.data.name ?? null,
    p_slug: parsed.data.slug ?? null,
    p_description: parsed.data.description ?? null,
    p_visibility: parsed.data.visibility ?? null,
    p_logo_url: null,
    p_banner_url: null,
    p_category_id: null,
    p_technologies: parsed.data.technologies ?? null,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { error: "A team with this name or slug already exists." };
    }
    return { error: error.message };
  }

  // Update category pivot table
  if (parsed.data.category_ids) {
    const teamId = parsed.data.team_id;
    if (!(await canManageTeam(supabase, teamId, user.id))) {
      return { error: "Not authorized to update team categories" };
    }
    await supabase.from("team_category_members").delete().eq("team_id", teamId);
    if (parsed.data.category_ids.length > 0) {
      const insertRows = parsed.data.category_ids.map((cid) => ({
        team_id: teamId,
        category_id: cid,
      }));
      await supabase.from("team_category_members").insert(insertRows);
    }
  }

  revalidatePath(`/teams/${formData.get("_current_slug")}`);
  revalidatePath("/teams");
  revalidatePath("/profile");
  return { success: true };
}

export async function reactivateTeam(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const slug = formData.get("slug") as string;

  if (!teamId) {
    return { error: "Team ID is required" };
  }

  const { error } = await supabase.rpc("reactivate_team", {
    p_team_id: teamId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${slug}`);
  revalidatePath("/teams");
  return { success: true };
}

export async function deleteTeam(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;

  if (!teamId) {
    return { error: "Team ID is required" };
  }

  const { error } = await supabase.rpc("delete_team", {
    p_team_id: teamId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/teams");
  revalidatePath("/projects");
  revalidatePath("/profile");
  return { success: true, redirectTo: "/teams" };
}

export async function leaveTeam(teamId: string, slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("leave_team", {
    p_team_id: teamId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${slug}`);
  revalidatePath("/teams");
  revalidatePath("/profile");
  return { success: true };
}

export async function uploadTeamLogo(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const file = formData.get("logo") as File;

  if (!teamId) {
    return { error: "Team ID is required" };
  }

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  if (file.size > MAX_LOGO_SIZE) {
    return { error: "File too large. Maximum size is 2MB" };
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }

  const logoExt = teamImageExt(file.name);
  if (!logoExt) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }
  const ext = logoExt.ext;
  const isPrivate = await isTeamMediaPrivate(supabase, teamId);
  const bucket = isPrivate ? PRIVATE_MEDIA_BUCKET : "team-logos";
  const objectPath = isPrivate
    ? privateObjectPath("team", teamId, `${crypto.randomUUID()}.${ext}`)
    : `${teamId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      contentType: logoExt.contentType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const storedValue = isPrivate
    ? privateMarkerFor(objectPath)
    : supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

  const { error: updateError } = await supabase.rpc("update_team_appearance", {
    p_team_id: teamId,
    p_logo_url: storedValue,
    p_banner_url: null,
  });

  if (updateError) {
    await safeRemoveStorageObjects(supabase, bucket, [objectPath]);
    return { error: updateError.message };
  }

  revalidatePath("/teams");
  revalidatePath(`/teams/${formData.get("slug")}`);
  return { success: true, logo_url: storedValue };
}

export async function uploadTeamBanner(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const file = formData.get("banner") as File;

  if (!teamId) {
    return { error: "Team ID is required" };
  }

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  if (file.size > MAX_LOGO_SIZE) {
    return { error: "File too large. Maximum size is 2MB" };
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }

  const bannerExt = teamImageExt(file.name);
  if (!bannerExt) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }
  const ext = bannerExt.ext;
  const isPrivate = await isTeamMediaPrivate(supabase, teamId);
  const bucket = isPrivate ? PRIVATE_MEDIA_BUCKET : "team-logos";
  const objectPath = isPrivate
    ? privateObjectPath("team", teamId, `${crypto.randomUUID()}.${ext}`)
    : `banners/${teamId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      contentType: bannerExt.contentType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const storedValue = isPrivate
    ? privateMarkerFor(objectPath)
    : supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

  const { error: updateError } = await supabase.rpc("update_team_appearance", {
    p_team_id: teamId,
    p_logo_url: null,
    p_banner_url: storedValue,
  });

  if (updateError) {
    await safeRemoveStorageObjects(supabase, bucket, [objectPath]);
    return { error: updateError.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  return { success: true, banner_url: storedValue };
}

export async function updateMemberRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const targetUserId = formData.get("user_id") as string;
  const newRole = formData.get("role") as string;

  if (!teamId || !targetUserId || !newRole) {
    return { error: "Missing required fields" };
  }

  if (!["admin", "member"].includes(newRole)) {
    return { error: "Invalid role" };
  }

  const { error } = await supabase.rpc("update_member_role", {
    p_team_id: teamId,
    p_user_id: targetUserId,
    p_role: newRole,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath("/teams");
  return { success: true };
}

export async function removeMember(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const targetUserId = formData.get("user_id") as string;

  if (!teamId || !targetUserId) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.rpc("remove_member", {
    p_team_id: teamId,
    p_user_id: targetUserId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath("/teams");
  return { success: true };
}

export async function saveOpenRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    id: (formData.get("id") as string) || undefined,
    team_id: formData.get("team_id") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    quantity: parseInt(formData.get("quantity") as string, 10) || 1,
  };

  const parsed = openRoleSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const teamId = parsed.data.team_id;
  if (!teamId) {
    return { error: "Team ID is required" };
  }

  if (!(await canManageTeam(supabase, teamId, user.id))) {
    return { error: "Not authorized to manage team roles" };
  }

  if (parsed.data.id) {
    const { error } = await supabase
      .from("team_open_roles")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
      })
      .eq("id", parsed.data.id)
      .eq("team_id", parsed.data.team_id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("team_open_roles")
      .insert({
        team_id: parsed.data.team_id,
        title: parsed.data.title,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
      });

    if (error) return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath("/teams");
  return { success: true };
}

export async function deleteOpenRole(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const roleId = formData.get("role_id") as string;

  if (!roleId) {
    return { error: "Role ID is required" };
  }

  const requestedTeamId = formData.get("team_id") as string | null;

  // Resolve the owning team so the delete is scoped by both id and team_id
  // and authorized against that team.
  const { data: role } = await supabase
    .from("team_open_roles")
    .select("team_id")
    .eq("id", roleId)
    .maybeSingle();

  if (requestedTeamId && role?.team_id && requestedTeamId !== role.team_id) {
    return { error: "Not authorized to manage team roles" };
  }

  const teamId = role?.team_id ?? requestedTeamId;

  if (!teamId) {
    return { error: "Role not found" };
  }

  if (!(await canManageTeam(supabase, teamId, user.id))) {
    return { error: "Not authorized to manage team roles" };
  }

  const { error } = await supabase
    .from("team_open_roles")
    .delete()
    .eq("id", roleId)
    .eq("team_id", teamId);

  if (error) return { error: error.message };

  revalidatePath(`/teams/${formData.get("slug")}`);
  revalidatePath("/teams");
  return { success: true };
}

// ── Team Updates ────────────────────────────────────────────────────────

export async function toggleTeamFeedPin(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const updateId = formData.get("update_id") as string;
  if (!teamId || !updateId) {
    return { error: "Missing required fields" };
  }

  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("source_type", "team_update")
    .eq("source_id", updateId)
    .maybeSingle();

  if (!post) {
    return { error: "Post not found" };
  }

  const { error } = await supabase.rpc("toggle_feed_pin", {
    p_post_id: post.id,
    p_scope: "team",
    p_team_id: teamId,
    p_branch_id: null,
    p_project_id: null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  return { success: true };
}

export async function createTeamUpdate(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const raw = {
      team_id: formData.get("team_id") as string,
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || null,
    };

    const parsed = createTeamUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input", fieldErrors };
  }

    const { data: update, error } = await supabase
      .from("team_updates")
      .insert({
        team_id: parsed.data.team_id,
        author_id: user.id,
        title: parsed.data.title,
        body: parsed.data.body,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    // Fetch team name + slug for the activity
    const { data: team } = await supabase
      .from("teams")
      .select("name, slug")
      .eq("id", parsed.data.team_id)
      .single();

    // Log activity
    await supabase.from("activities").insert({
      user_id: user.id,
      type: "created_team_update",
      metadata: {
        team_id: parsed.data.team_id,
        team_name: team?.name ?? "",
        team_slug: team?.slug ?? "",
      },
    });

    revalidatePath(`/teams/${formData.get("slug")}`);
    return { success: true, id: update.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Server error" };
  }
}

export async function uploadTeamUpdateImage(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const teamId = formData.get("team_id") as string;
  const updateId = formData.get("update_id") as string;
  const file = formData.get("image") as File;

  if (!teamId || !updateId || !file || file.size === 0) {
    return { error: "Missing required fields" };
  }

  if (file.size > MAX_ASSET_SIZE) {
    return { error: "File too large. Maximum size is 2MB" };
  }

  if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }

  const updateImageExt = teamImageExt(file.name);
  if (!updateImageExt) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }
  const ext = updateImageExt.ext;
  const isPrivate = await isTeamMediaPrivate(supabase, teamId);
  const bucket = isPrivate ? PRIVATE_MEDIA_BUCKET : "team-updates";
  const objectPath = isPrivate
    ? privateObjectPath("team", teamId, `${crypto.randomUUID()}.${ext}`)
    : `${teamId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, { contentType: updateImageExt.contentType, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const storedValue = isPrivate
    ? privateMarkerFor(objectPath)
    : supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

  const { data: existing } = await supabase
    .from("team_updates")
    .select("images, image_url")
    .eq("id", updateId)
    .eq("author_id", user.id)
    .maybeSingle();

const images = Array.isArray(existing?.images) ? existing.images : [];

  const { data: updateResult, error: updateError } = await supabase
    .from("team_updates")
    .update({
      images: [...images, storedValue],
      image_url: existing?.image_url ?? storedValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updateId)
    .eq("author_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updateResult) {
    await safeRemoveStorageObjects(supabase, bucket, [objectPath]);
    if (updateError) return { error: updateError.message };
    return { error: "Update not found or you are not the author" };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  return { success: true, image_url: storedValue };
}

export async function updateTeamUpdate(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Update ID is required" };

  const raw = {
    id,
    title: formData.get("title") as string | undefined,
    body: formData.get("body") as string | undefined,
  };

  const parsed = updateTeamUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body || null;

  const { error } = await supabase
    .from("team_updates")
    .update(updates)
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  return { success: true };
}

export async function deleteTeamUpdate(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Update ID is required" };

  const { error } = await supabase
    .from("team_updates")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // Remove the corresponding activity
  const teamId = formData.get("team_id") as string;
  if (teamId) {
    await supabase
      .from("activities")
      .delete()
      .eq("type", "created_team_update")
      .eq("user_id", user.id)
      .filter("metadata->>team_id", "eq", teamId);
  }

  revalidatePath(`/teams/${formData.get("slug")}`);
  return { success: true };
}
