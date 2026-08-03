"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createProjectSchema,
  createProjectUpdateSchema,
  updateProjectUpdateSchema,
  MAX_ASSET_SIZE,
  ALLOWED_LOGO_TYPES,
  ALLOWED_POST_IMAGE_TYPES,
} from "@/lib/validations/project.schema";

export async function createProject(formData: FormData) {
  console.log("--- createProject action started ---");

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("user from auth:", user?.id ?? "null");

  if (!user) {
    return { error: "Not authenticated" };
  }

  const categoryIdsRaw = formData.get("category_ids") as string | null;

  const raw = {
    team_id: formData.get("team_id") as string,
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    description: (formData.get("description") as string) || null,
    visibility: (formData.get("visibility") as string) || "open",
    logo_url: null,
  };

  console.log("raw formData:", raw);

  const parsed = createProjectSchema.safeParse(raw);

  console.log("zod parsed:", parsed);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  console.log("parsed.data:", parsed.data);
  console.log("calling create_project RPC with:", {
    p_team_id: parsed.data.team_id,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description ?? null,
    p_visibility: parsed.data.visibility,
    p_logo_url: null,
  });

  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_team_id: parsed.data.team_id,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description ?? null,
    p_visibility: parsed.data.visibility,
    p_logo_url: null,
  });

  console.log("RPC result:", { data: projectId, error });

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
    const members = categoryIds.map((cid) => ({
      project_id: projectId as string,
      category_id: cid,
    }));
    const { error: catError } = await supabase
      .from("project_category_members")
      .insert(members);
    if (catError) {
      console.log("[DEBUG] category insert error:", catError);
    }
  }

  revalidatePath(`/teams/${formData.get("team_slug")}`);
  revalidatePath("/teams");
  revalidatePath("/projects");

  return { slug: parsed.data.slug };
}

export async function joinProject(projectId: string) {
  const supabase = createClient();

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
  const supabase = createClient();

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
  console.log("[DEBUG] updateProjectSettings called");
  console.log("[DEBUG] formData entries:");
  for (const [key, val] of formData.entries()) {
    console.log(`  ${key}:`, val);
  }

  const ssr = createClient(); // SSR-aware, has cookies → can auth
  const supabase = createAdminClient(); // service-role, bypasses RLS

  const {
    data: { user },
  } = await ssr.auth.getUser();

  console.log("[DEBUG] authenticated user:", user?.id);

  if (!user) {
    return { error: "Not authenticated" };
  }

  const projectId = formData.get("project_id") as string;
  console.log("[DEBUG] projectId from form:", projectId);

  if (!projectId) {
    console.log("[DEBUG] projectId is missing");
    return { error: "Project ID is required" };
  }

  const updates: Record<string, unknown> = {};

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

  if (name) updates.name = name;
  if (slug) updates.slug = slug;
  updates.description = description || null;
  updates.description_long = descriptionLong || null;
  updates.website = website || null;
  updates.github_url = githubUrl || null;
  if (visibility) updates.visibility = visibility;

  if (technologiesRaw) {
    try {
      updates.technologies = JSON.parse(technologiesRaw);
    } catch (e) {
      console.log("[DEBUG] technologies JSON parse error:", e);
      return { error: "Invalid technologies format" };
    }
  }

  if (recruitmentRaw) {
    try {
      updates.recruitment = JSON.parse(recruitmentRaw);
    } catch (e) {
      console.log("[DEBUG] recruitment JSON parse error:", e);
      return { error: "Invalid recruitment format" };
    }
  }

  console.log("[DEBUG] final updates payload:", JSON.stringify(updates));
  console.log("[DEBUG] projectId for WHERE clause:", projectId);

  const payload = { ...updates, updated_at: new Date().toISOString() };
  console.log("[DEBUG] full update payload with timestamps:", JSON.stringify(payload));

  const { data: updateData, error: updateError } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId)
    .select();

  console.log("[DEBUG] update error:", updateError);
  console.log("[DEBUG] update data:", updateData);

  if (updateError) {
    console.log("[DEBUG] update failed with error:", updateError.message, updateError.details, updateError.hint);
    return { error: updateError.message };
  }

  const { data: verify } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  console.log("[DEBUG] row after update:", JSON.stringify(verify));

  if (categoryIdsRaw !== null) {
    const categoryIds: string[] = JSON.parse(categoryIdsRaw) as string[];
    await supabase.from("project_category_members").delete().eq("project_id", projectId);
    if (categoryIds.length > 0) {
      const members = categoryIds.map((cid) => ({
        project_id: projectId,
        category_id: cid,
      }));
      const { error: catError } = await supabase
        .from("project_category_members")
        .insert(members);
      if (catError) {
        console.log("[DEBUG] category sync error:", catError);
      }
    }
  }

  revalidatePath(`/projects/${formData.get("slug")}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProject(formData: FormData) {
  const supabase = createClient();

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
  const supabase = createClient();

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

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `${projectId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("project-logos")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("project-logos").getPublicUrl(filePath);

  const { error: updateError } = await supabase.rpc("update_project_logo", {
    p_project_id: projectId,
    p_logo_url: publicUrl,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${formData.get("slug")}`);
  return { success: true, logo_url: publicUrl };
}

export async function createProjectUpdate(formData: FormData) {
  try {
    console.log("[DEBUG] createProjectUpdate called");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("[DEBUG] auth user:", user?.id ?? "null");

    if (!user) {
      return { error: "Not authenticated" };
    }

    const raw = {
      project_id: formData.get("project_id") as string,
      title: formData.get("title") as string,
      body: (formData.get("body") as string) || null,
    };

    console.log("[DEBUG] raw formData:", raw);

    const parsed = createProjectUpdateSchema.safeParse(raw);

    console.log("[DEBUG] zod parsed success:", parsed.success);
    if (!parsed.success) {
      console.log("[DEBUG] zod errors:", JSON.stringify(parsed.error.flatten()));
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0];
      return { error: firstError ?? "Invalid input" };
    }

    console.log("[DEBUG] parsed data:", parsed.data);

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

    console.log("[DEBUG] insert error:", error);
    console.log("[DEBUG] insert data:", update);

    if (error) {
      console.log("[DEBUG] insert failed:", error.message, error.details, error.hint);
      return { error: error.message };
    }

    // Verify persistence by immediately fetching the newest update
    const { data: verify } = await supabase
      .from("project_updates")
      .select("id, title, created_at")
      .eq("project_id", parsed.data.project_id)
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("[DEBUG] verify fetched newest update:", JSON.stringify(verify));

    revalidatePath(`/projects/${formData.get("slug")}`);
    console.log("[DEBUG] revalidated path:", `/projects/${formData.get("slug")}`);
    return { success: true, id: update.id };
  } catch (err) {
    console.error("[DEBUG] createProjectUpdate threw:", err);
    return { error: err instanceof Error ? err.message : "Server error" };
  }
}

export async function uploadUpdateImage(formData: FormData) {
  const supabase = createClient();

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

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `${projectId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("project-updates")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("project-updates").getPublicUrl(filePath);

  const { data: existing } = await supabase
    .from("project_updates")
    .select("images, image_url")
    .eq("id", updateId)
    .eq("author_id", user.id)
    .maybeSingle();

  const images = Array.isArray(existing?.images) ? existing.images : [];

  const { error: updateError } = await supabase
    .from("project_updates")
    .update({
      images: [...images, publicUrl],
      image_url: existing?.image_url ?? publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", updateId)
    .eq("author_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/projects/${formData.get("slug")}`);
  return { success: true, image_url: publicUrl };
}

export async function updateProjectUpdate(formData: FormData) {
  const supabase = createClient();

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
  const supabase = createClient();

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
