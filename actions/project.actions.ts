"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectSchema,
  createProjectUpdateSchema,
  updateProjectUpdateSchema,
  MAX_ASSET_SIZE,
  ALLOWED_LOGO_TYPES,
  ALLOWED_POST_IMAGE_TYPES,
} from "@/lib/validations/project.schema";
import {
  PRIVATE_MEDIA_BUCKET,
  privateObjectPath,
  privateMarkerFor,
  isProjectMediaPrivate,
} from "@/lib/media";
import { safeRemoveStorageObjects } from "@/lib/storage-cleanup";

// M13: extension allow-list mirrors ALLOWED_LOGO_TYPES / ALLOWED_POST_IMAGE_TYPES
// (image/png, image/jpeg, image/webp); contentType is set from this map.
const PROJECT_IMAGE_EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function projectImageExt(fileName: string): { ext: string; contentType: string } | null {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  const contentType = PROJECT_IMAGE_EXT_MIME[ext];
  if (!contentType || /[^a-z0-9]/.test(ext)) return null;
  return { ext, contentType };
}

// Direct pivot-table writes below bypass the authorizing RPCs
// (create_project / create_standalone_project), so owner/admin is re-verified
// here in the action, mirroring the team.actions.ts convention.
async function canManageProjectCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  opts: { teamId?: string | null; projectId?: string | null },
): Promise<boolean> {
  const { teamId, projectId } = opts;
  if ((!teamId && !projectId) || !userId) return false;

  // Platform admin bypass via the existing is_platform_admin RPC pattern.
  try {
    const { data: isAdmin } = await (supabase as any).rpc("is_platform_admin");
    if (isAdmin === true) return true;
  } catch {
    // Fall through to team/project-level checks.
  }

  // Team-owned project: caller must own or administer the parent team.
  if (teamId) {
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

    // One combined select covers the common schema; the per-column probe below
    // only runs if that query fails on an older schema.
    try {
      const { data, error } = await supabase
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

  // Standalone project: caller must own the project row.
  if (projectId) {
    // One combined select covers the common schema; the per-column probe below
    // only runs if that query fails on an older schema.
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, owner_id, created_by, user_id")
        .eq("id", projectId)
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
          .from("projects")
          .select(`id, ${column}`)
          .eq("id", projectId)
          .maybeSingle();
        if (error || !data) continue;
        const record = data as unknown as Record<string, unknown>;
        if (!(column in record)) continue;
        return record[column] === userId;
      } catch {
        continue;
      }
    }
  }

  return false;
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const categoryIdsRaw = formData.get("category_ids") as string | null;

  const raw = {
    team_id: (formData.get("team_id") as string) || undefined,
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    description: (formData.get("description") as string) || null,
    visibility: (formData.get("visibility") as string) || "open",
    logo_url: null,
  };

  const parsed = createProjectSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  // Standalone project (no parent team): no server, just a group chat channel.
  if (!parsed.data.team_id) {
    const { data: projectId, error } = await supabase.rpc("create_standalone_project", {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
      p_description: parsed.data.description ?? null,
      p_visibility: parsed.data.visibility,
      p_logo_url: null,
    });

    if (error) {
      if (error.message.includes("duplicate key") || error.message.includes("unique")) {
        return { error: "A project with this name or slug already exists." };
      }
      return { error: error.message };
    }

    const categoryIds: string[] = categoryIdsRaw
      ? (JSON.parse(categoryIdsRaw) as string[])
      : [];

    if (categoryIds.length > 0 && projectId) {
      if (
        !(await canManageProjectCategories(supabase, user.id, {
          projectId: projectId as string,
        }))
      ) {
        return { error: "Not authorized to update project categories" };
      }
      const members = categoryIds.map((cid) => ({
        project_id: projectId as string,
        category_id: cid,
      }));
      await supabase.from("project_category_members").insert(members);
    }

    revalidatePath("/projects");

    return { slug: parsed.data.slug };
  }

  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_team_id: parsed.data.team_id,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description ?? null,
    p_visibility: parsed.data.visibility,
    p_logo_url: null,
  });

  if (error) {
    if (error.message.includes("duplicate key") || error.message.includes("unique")) {
      return { error: "A project with this name or slug already exists." };
    }
    return { error: error.message };
  }

  const categoryIds: string[] = categoryIdsRaw
    ? (JSON.parse(categoryIdsRaw) as string[])
    : [];

  if (categoryIds.length > 0 && projectId) {
    if (
      !(await canManageProjectCategories(supabase, user.id, {
        teamId: parsed.data.team_id,
        projectId: projectId as string,
      }))
    ) {
      return { error: "Not authorized to update project categories" };
    }
    const members = categoryIds.map((cid) => ({
      project_id: projectId as string,
      category_id: cid,
    }));
    const { error: catError } = await supabase
      .from("project_category_members")
      .insert(members);
    if (catError) {
      // Category insert failed but project created; non-fatal
    }
  }

  revalidatePath(`/teams/${formData.get("team_slug")}`);
  revalidatePath("/teams");
  revalidatePath("/projects");

  return { slug: parsed.data.slug };
}

export async function joinProject(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("join_project", {
    p_project_id: projectId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function leaveProject(projectId: string, slug: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("leave_project", {
    p_project_id: projectId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function updateProjectSettings(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;

  if (!projectId) {
    return { error: "Project ID is required" };
  }

  // Authorization is enforced inside the update_project_settings RPC
  // (owner or owner/maintainer member, evaluated against auth.uid()).
  // Only the fields the settings form already manages are passed; logo
  // updates stay in update_project_logo and membership in their own RPCs.
  const name = formData.get("name") as string | null;
  const slug = formData.get("slug") as string | null;
  const description = formData.get("description") as string | null;
  const descriptionLong = formData.get("description_long") as string | null;
  const website = formData.get("website") as string | null;
  const githubUrl = formData.get("github_url") as string | null;
  const visibility = formData.get("visibility") as string | null;
  const technologiesRaw = formData.get("technologies") as string | null;
  const recruitmentRaw = formData.get("recruitment") as string | null;
  const categoryIdsRaw = formData.get("category_ids") as string | null;

  let technologies: unknown = null;
  if (technologiesRaw) {
    try {
      technologies = JSON.parse(technologiesRaw);
    } catch {
      return { error: "Invalid technologies format" };
    }
  }

  let recruitment: unknown = null;
  if (recruitmentRaw) {
    try {
      recruitment = JSON.parse(recruitmentRaw);
    } catch {
      return { error: "Invalid recruitment format" };
    }
  }

  let categoryIds: string[] | null = null;
  if (categoryIdsRaw !== null) {
    try {
      categoryIds = JSON.parse(categoryIdsRaw) as string[];
    } catch {
      return { error: "Invalid categories format" };
    }
  }

  const { error: updateError } = await supabase.rpc("update_project_settings", {
    p_project_id: projectId,
    p_name: name || null,
    p_slug: slug || null,
    p_description: description || null,
    p_description_long: descriptionLong || null,
    p_website: website || null,
    p_github_url: githubUrl || null,
    p_visibility: visibility || null,
    p_technologies: (technologies ?? null) as never,
    p_recruitment: (recruitment ?? null) as never,
    p_category_ids: categoryIds,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/projects/${formData.get("slug")}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function restoreProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;
  const slug = formData.get("slug") as string;

  if (!projectId) {
    return { error: "Project ID is required" };
  }

  const { error } = await supabase.rpc("restore_project", {
    p_project_id: projectId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${slug}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;

  if (!projectId) {
    return { error: "Project ID is required" };
  }

  const { error } = await supabase.rpc("delete_project", {
    p_project_id: projectId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/teams");
  revalidatePath("/profile");
  return { success: true, redirectTo: "/projects" };
}

export async function uploadProjectLogo(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;
  const file = formData.get("logo") as File;

  if (!projectId) {
    return { error: "Project ID is required" };
  }

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  if (file.size > MAX_ASSET_SIZE) {
    return { error: "File too large. Maximum size is 2MB" };
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }

  const logoExt = projectImageExt(file.name);
  if (!logoExt) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }
  const ext = logoExt.ext;
  const isPrivate = await isProjectMediaPrivate(supabase, projectId);
  const bucket = isPrivate ? PRIVATE_MEDIA_BUCKET : "project-logos";
  const objectPath = isPrivate
    ? privateObjectPath("project", projectId, `${crypto.randomUUID()}.${ext}`)
    : `${projectId}/${crypto.randomUUID()}.${ext}`;

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

  const { error: updateError } = await supabase.rpc("update_project_logo", {
    p_project_id: projectId,
    p_logo_url: storedValue,
  });

  if (updateError) {
    await safeRemoveStorageObjects(supabase, bucket, [objectPath]);
    return { error: updateError.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${formData.get("slug")}`);
  return { success: true, logo_url: storedValue };
}

export async function createProjectUpdate(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const raw = {
      project_id: formData.get("project_id") as string,
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || null,
    };

    const parsed = createProjectUpdateSchema.safeParse(raw);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0];
      return { error: firstError ?? "Invalid input" };
    }

    const { data: update, error } = await supabase
      .from("project_updates")
      .insert({
        project_id: parsed.data.project_id,
        author_id: user.id,
        title: parsed.data.title,
        body: parsed.data.body,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    // Fetch project + team names for the activity
    const { data: project } = await supabase
      .from("projects")
      .select("name, slug, team_id")
      .eq("id", parsed.data.project_id)
      .single();

    let teamName = "";
    let teamSlug = "";
    if (project?.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("name, slug")
        .eq("id", project.team_id)
        .single();
      teamName = team?.name ?? "";
      teamSlug = team?.slug ?? "";
    }

    // Log activity
    await supabase.from("activities").insert({
      user_id: user.id,
      type: "created_project_update",
      metadata: {
        project_id: parsed.data.project_id,
        project_name: project?.name ?? "",
        project_slug: project?.slug ?? "",
        team_id: project?.team_id ?? null,
        team_name: teamName,
        team_slug: teamSlug,
      },
    });

    revalidatePath(`/projects/${formData.get("slug")}`);
    return { success: true, id: update.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Server error" };
  }
}

export async function uploadUpdateImage(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;
  const updateId = formData.get("update_id") as string;
  const file = formData.get("image") as File;

  if (!projectId || !updateId || !file || file.size === 0) {
    return { error: "Missing required fields" };
  }

  if (file.size > MAX_ASSET_SIZE) {
    return { error: "File too large. Maximum size is 2MB" };
  }

  if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }

  const updateImageExt = projectImageExt(file.name);
  if (!updateImageExt) {
    return { error: "Invalid file type. Use PNG, JPEG, or WebP" };
  }
  const ext = updateImageExt.ext;
  const isPrivate = await isProjectMediaPrivate(supabase, projectId);
  const bucket = isPrivate ? PRIVATE_MEDIA_BUCKET : "project-updates";
  const objectPath = isPrivate
    ? privateObjectPath("project", projectId, `${crypto.randomUUID()}.${ext}`)
    : `${projectId}/${crypto.randomUUID()}.${ext}`;

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
    .from("project_updates")
    .select("images, image_url")
    .eq("id", updateId)
    .eq("author_id", user.id)
    .maybeSingle();

  const images = Array.isArray(existing?.images) ? existing.images : [];

  const { data: updateResult, error: updateError } = await supabase
    .from("project_updates")
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

  revalidatePath(`/projects/${formData.get("slug")}`);
  return { success: true, image_url: storedValue };
}

export async function updateProjectUpdate(formData: FormData) {
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

  const parsed = updateProjectUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body || null;

  const { error } = await supabase
    .from("project_updates")
    .update(updates)
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${formData.get("slug")}`);
  return { success: true };
}

export async function deleteProjectUpdate(formData: FormData) {
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
    .from("project_updates")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${formData.get("slug")}`);
  return { success: true };
}
