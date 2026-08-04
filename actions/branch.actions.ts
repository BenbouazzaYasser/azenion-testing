"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createBranchSchema,
  updateBranchSchema,
  createBranchAnnouncementSchema,
  updateBranchAnnouncementSchema,
  createBranchEventSchema,
  updateBranchEventSchema,
  createBranchHighlightSchema,
  updateBranchHighlightSchema,
  MAX_BRANCH_ASSET_SIZE,
  ALLOWED_BRANCH_LOGO_TYPES,
  ALLOWED_BRANCH_MEDIA_TYPES,
} from "@/lib/validations/branch.schema";
import { parseEventSchedule } from "@/lib/event-schedule";

function revalidateBranchPaths(slug?: string | null) {
  revalidatePath("/branches");
  revalidatePath("/branches/manage");
  revalidatePath("/feed");
  if (slug) revalidatePath(`/branches/${slug}`);
}

function firstZodError(parsed: { error: { flatten: () => { fieldErrors: Record<string, unknown[]> } } }) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  const firstError = Object.values(fieldErrors).flat()[0];
  return (firstError as string) ?? "Invalid input";
}

function validateLogoUpload(file: File) {
  if (!file || file.size === 0) return "No file provided";
  if (file.size > MAX_BRANCH_ASSET_SIZE) return "File too large. Maximum size is 2MB";
  if (!ALLOWED_BRANCH_LOGO_TYPES.includes(file.type)) return "Invalid file type. Use PNG, JPEG, WebP, or SVG";
  return null;
}

function validateUpload(file: File) {
  if (!file || file.size === 0) return "No file provided";
  if (file.size > MAX_BRANCH_ASSET_SIZE) return "File too large. Maximum size is 2MB";
  if (!ALLOWED_BRANCH_MEDIA_TYPES.includes(file.type)) return "Invalid file type. Use PNG, JPEG, or WebP";
  return null;
}

export async function joinBranch(branchId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("join_branch", {
    p_branch_id: branchId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/branches");
  return { success: true };
}

export async function leaveBranch(slug?: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("leave_branch");

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(slug);
  return { success: true };
}

export async function createBranch(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    institution: (formData.get("institution") as string) || null,
    city: (formData.get("city") as string) || null,
    description: (formData.get("description") as string) || null,
    logo_url: (formData.get("logo_url") as string) || null,
  };

  const parsed = createBranchSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { data: branchId, error } = await supabase.rpc("create_branch", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_institution: parsed.data.institution ?? null,
    p_city: parsed.data.city ?? null,
    p_description: parsed.data.description ?? null,
    p_logo_url: parsed.data.logo_url ?? null,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return { error: "A branch with this slug already exists." };
    }
    return { error: error.message };
  }

  revalidateBranchPaths(parsed.data.slug);
  return { success: true, branch_id: branchId };
}

export async function updateBranch(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw: Record<string, unknown> = {
    branch_id: formData.get("branch_id"),
  };

  const name = formData.get("name");
  if (name) raw.name = name;
  const slug = formData.get("slug");
  if (slug) raw.slug = slug;
  raw.institution = (formData.get("institution") as string) || null;
  raw.city = (formData.get("city") as string) || null;
  raw.description = (formData.get("description") as string) || null;
  raw.logo_url = (formData.get("logo_url") as string) || null;

  const parsed = updateBranchSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const currentSlug = formData.get("_current_slug") as string | null;

  if (parsed.data.slug && parsed.data.slug !== currentSlug) {
    const { data: existing } = await supabase
      .from("branches")
      .select("id")
      .eq("slug", parsed.data.slug)
      .neq("id", parsed.data.branch_id)
      .maybeSingle();

    if (existing) {
      return { error: "A branch with this slug already exists." };
    }
  }

  const { error } = await supabase.rpc("update_branch", {
    p_branch_id: parsed.data.branch_id,
    p_name: parsed.data.name ?? null,
    p_slug: parsed.data.slug ?? null,
    p_institution: parsed.data.institution ?? null,
    p_city: parsed.data.city ?? null,
    p_description: parsed.data.description ?? null,
    p_logo_url: parsed.data.logo_url ?? null,
  });

  if (error) {
    if (error.message.includes("unique") || error.message.includes("duplicate")) {
      return { error: "A branch with this slug already exists." };
    }
    return { error: error.message };
  }

  revalidateBranchPaths(parsed.data.slug ?? currentSlug);
  return { success: true };
}

export async function uploadBranchLogo(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;
  const slug = formData.get("slug") as string;
  const file = formData.get("logo") as File;

  if (!branchId) {
    return { error: "Branch ID is required" };
  }

  const [{ data: isPlatformAdmin }, { data: isBranchLeader }] = await Promise.all([
    supabase.rpc("is_platform_admin"),
    supabase.rpc("is_branch_leader", { p_branch_id: branchId }),
  ]);

  if (!isPlatformAdmin && !isBranchLeader) {
    return { error: "Only platform admins or the leader of this branch can manage its logo" };
  }

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  const uploadError = validateLogoUpload(file);
  if (uploadError) {
    return { error: uploadError };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `${branchId}/logos/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from("branch-assets")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("branch-assets").getPublicUrl(filePath);

  const { error: updateError } = await supabase.rpc("update_branch", {
    p_branch_id: branchId,
    p_logo_url: publicUrl,
  });

  if (updateError) {
    console.error("UPDATE ERROR OBJECT");
    console.error(updateError);
    console.error(JSON.stringify(updateError, null, 2));

    return {
      error: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
    };
  }

  revalidateBranchPaths(slug);
  return { success: true, logo_url: publicUrl };
}

export async function uploadBranchLogoAsset(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) {
    return { error: "Only platform admins can manage branch logos" };
  }

  const file = formData.get("logo") as File;

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  const uploadError = validateLogoUpload(file);
  if (uploadError) {
    return { error: uploadError };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `00000000-0000-0000-0000-000000000000/logos/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from("branch-assets")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("branch-assets").getPublicUrl(filePath);

  return { success: true, logo_url: publicUrl };
}

type BranchAssetsBucket = ReturnType<ReturnType<typeof createClient>["storage"]["from"]>;

/**
 * Recursively collects every file path under `prefix` in the given storage
 * bucket using the Storage API (list). Folders are returned with a null
 * metadata entry, so they are traversed; files are returned with their full
 * path relative to the bucket root.
 */
async function listBucketFilePaths(
  bucket: BranchAssetsBucket,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await bucket.list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;

    const items = data ?? [];
    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.metadata === null) {
        paths.push(...(await listBucketFilePaths(bucket, fullPath)));
      } else {
        paths.push(fullPath);
      }
    }

    if (items.length < limit) break;
    offset += items.length;
  }

  return paths;
}

export async function deleteBranch(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;

  if (!branchId) {
    return { error: "Branch ID is required" };
  }

  // The RPC also enforces this, but it must be checked here too because the
  // storage cleanup below runs before the RPC is called.
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) {
    return { error: "Only the platform administrator can delete branches" };
  }

  // ── Storage cleanup (Storage API only — direct DML on storage.objects is
  //    forbidden by Supabase) ────────────────────────────────────────────
  try {
    const bucket = supabase.storage.from("branch-assets");
    const paths = await listBucketFilePaths(bucket, branchId);

    if (paths.length > 0) {
      for (let i = 0; i < paths.length; i += 1000) {
        const chunk = paths.slice(i, i + 1000);
        const { error: storageError } = await bucket.remove(chunk);
        if (storageError) {
          return { error: storageError.message };
        }
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to clean up branch files" };
  }

  const { error } = await supabase.rpc("delete_branch", {
    p_branch_id: branchId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths();
  redirect("/branches/manage");
}

// ── Branch Leaders (Platform Admin appoints/removes) ────────────────────

export async function assignBranchLeader(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;
  const userId = formData.get("user_id") as string;

  if (!branchId || !userId) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.rpc("assign_branch_leader", {
    p_branch_id: branchId,
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths();
  return { success: true };
}

export async function removeBranchLeader(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;
  const userId = formData.get("user_id") as string;

  if (!branchId || !userId) {
    return { error: "Missing required fields" };
  }

  const { error } = await supabase.rpc("remove_branch_leader", {
    p_branch_id: branchId,
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths();
  return { success: true };
}

// ── Branch Announcements ───────────────────────────────────────────────

export async function createBranchAnnouncement(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    branch_id: formData.get("branch_id") as string,
    title: formData.get("title") as string,
    body: (formData.get("body") as string) || null,
    is_pinned: formData.get("is_pinned") === "true",
  };

  const parsed = createBranchAnnouncementSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { data: announcementId, error } = await supabase.rpc(
    "create_branch_announcement",
    {
      p_branch_id: parsed.data.branch_id,
      p_title: parsed.data.title,
      p_body: parsed.data.body ?? null,
      p_image_url: null,
      p_is_pinned: parsed.data.is_pinned ?? false,
    },
  );

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true, id: announcementId };
}

export async function uploadBranchAnnouncementImage(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;
  const announcementId = formData.get("update_id") as string;
  const file = formData.get("image") as File;

  if (!branchId || !announcementId) {
    return { error: "Missing required fields" };
  }

  const uploadError = validateUpload(file);
  if (uploadError) {
    return { error: uploadError };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from("feed-images")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("feed-images").getPublicUrl(filePath);

  const { data: existing } = await supabase
    .from("branch_announcements")
    .select("images, image_url")
    .eq("id", announcementId)
    .maybeSingle();

  const images = Array.isArray(existing?.images) ? existing.images : [];

  const { error: updateError } = await supabase
    .from("branch_announcements")
    .update({
      images: [...images, publicUrl],
      image_url: existing?.image_url ?? publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true, image_url: publicUrl };
}

export async function updateBranchAnnouncement(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Update ID is required" };

  const isPinnedRaw = formData.get("is_pinned");
  let isPinned: boolean | null = null;
  if (isPinnedRaw === "true") isPinned = true;
  else if (isPinnedRaw === "false") isPinned = false;

  const title = formData.get("title");
  const body = formData.get("body");

  const raw = {
    id,
    title: title ?? undefined,
    body: body ?? undefined,
    is_pinned: isPinned ?? undefined,
  };

  const parsed = updateBranchAnnouncementSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { error } = await supabase.rpc("update_branch_announcement", {
    p_announcement_id: parsed.data.id,
    p_title: parsed.data.title ?? null,
    p_body: parsed.data.body !== undefined ? parsed.data.body ?? null : null,
    p_image_url: null,
    p_is_pinned: parsed.data.is_pinned ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true };
}

export async function deleteBranchAnnouncement(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Update ID is required" };

  const { error } = await supabase.rpc("delete_branch_announcement", {
    p_announcement_id: id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true };
}

// ── Branch Events ──────────────────────────────────────────────────────

export async function createBranchEvent(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const schedule = (formData.get("schedule") as string) || "";
  const parsedStart = parseEventSchedule(schedule);

  const raw = {
    branch_id: formData.get("branch_id") as string,
    title: formData.get("title") as string,
    schedule,
    starts_at: parsedStart?.toISOString() ?? "",
    description: (formData.get("description") as string) || null,
    location: (formData.get("location") as string) || null,
    ends_at: null,
    cover_url: (formData.get("cover_url") as string) || null,
    registration_url: (formData.get("registration_url") as string) || null,
    visibility: (formData.get("visibility") as string) || "public",
  };

  const parsed = createBranchEventSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { data: eventId, error } = await supabase.rpc("create_branch_event", {
    p_branch_id: parsed.data.branch_id,
    p_title: parsed.data.title,
    p_starts_at: parsed.data.starts_at || null,
    p_description: parsed.data.description ?? null,
    p_location: parsed.data.location ?? null,
    p_ends_at: parsed.data.ends_at || null,
    p_cover_url: parsed.data.cover_url ?? null,
    p_registration_url: parsed.data.registration_url ?? null,
    p_visibility: parsed.data.visibility,
    p_schedule: parsed.data.schedule,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true, id: eventId };
}

export async function updateBranchEvent(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Event ID is required" };

  const raw: Record<string, unknown> = { id };

  const title = formData.get("title");
  if (title) raw.title = title;
  const schedule = formData.get("schedule");
  if (schedule && typeof schedule === "string") {
    raw.schedule = schedule;
    raw.starts_at = parseEventSchedule(schedule)?.toISOString() ?? null;
  }
  raw.description = (formData.get("description") as string) || null;
  raw.location = (formData.get("location") as string) || null;
  raw.cover_url = (formData.get("cover_url") as string) || null;
  raw.registration_url = (formData.get("registration_url") as string) || null;
  const visibility = formData.get("visibility");
  if (visibility) raw.visibility = visibility;

  const parsed = updateBranchEventSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { error } = await supabase.rpc("update_branch_event", {
    p_event_id: parsed.data.id,
    p_title: parsed.data.title ?? null,
    p_description: parsed.data.description !== undefined ? parsed.data.description ?? null : null,
    p_location: parsed.data.location !== undefined ? parsed.data.location ?? null : null,
    p_starts_at: parsed.data.starts_at !== undefined ? parsed.data.starts_at || null : null,
    p_ends_at: null,
    p_cover_url: parsed.data.cover_url !== undefined ? parsed.data.cover_url ?? null : null,
    p_registration_url: parsed.data.registration_url !== undefined ? parsed.data.registration_url ?? null : null,
    p_visibility: parsed.data.visibility ?? null,
    p_schedule: parsed.data.schedule ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true };
}

export async function deleteBranchEvent(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Event ID is required" };

  const { error } = await supabase.rpc("delete_branch_event", {
    p_event_id: id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true };
}

export async function uploadBranchEventCover(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;
  const eventId = formData.get("event_id") as string;
  const file = formData.get("cover") as File;

  if (!branchId || !eventId) {
    return { error: "Missing required fields" };
  }

  const uploadError = validateUpload(file);
  if (uploadError) {
    return { error: uploadError };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `${branchId}/events/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from("branch-assets")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("branch-assets").getPublicUrl(filePath);

  const { error: rpcError } = await supabase.rpc("update_branch_event", {
    p_event_id: eventId,
    p_cover_url: publicUrl,
  });

  if (rpcError) {
    return { error: rpcError.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true, cover_url: publicUrl };
}

// ── Branch Highlights ──────────────────────────────────────────────────

export async function createBranchHighlight(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    branch_id: formData.get("branch_id") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    image_url: (formData.get("image_url") as string) || null,
    link_url: (formData.get("link_url") as string) || null,
    sort_order: parseInt(formData.get("sort_order") as string, 10) || 0,
  };

  const parsed = createBranchHighlightSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { data: highlightId, error } = await supabase.rpc("create_branch_highlight", {
    p_branch_id: parsed.data.branch_id,
    p_title: parsed.data.title,
    p_description: parsed.data.description ?? null,
    p_image_url: parsed.data.image_url ?? null,
    p_link_url: parsed.data.link_url ?? null,
    p_sort_order: parsed.data.sort_order,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true, id: highlightId };
}

export async function updateBranchHighlight(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Highlight ID is required" };

  const raw: Record<string, unknown> = { id };

  const title = formData.get("title");
  if (title) raw.title = title;
  raw.description = (formData.get("description") as string) || null;
  raw.image_url = (formData.get("image_url") as string) || null;
  raw.link_url = (formData.get("link_url") as string) || null;
  const sortOrder = formData.get("sort_order");
  if (sortOrder) raw.sort_order = parseInt(sortOrder as string, 10) || 0;

  const parsed = updateBranchHighlightSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: firstZodError(parsed) };
  }

  const { error } = await supabase.rpc("update_branch_highlight", {
    p_highlight_id: parsed.data.id,
    p_title: parsed.data.title ?? null,
    p_description: parsed.data.description !== undefined ? parsed.data.description ?? null : null,
    p_image_url: parsed.data.image_url !== undefined ? parsed.data.image_url ?? null : null,
    p_link_url: parsed.data.link_url !== undefined ? parsed.data.link_url ?? null : null,
    p_sort_order: parsed.data.sort_order ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true };
}

export async function deleteBranchHighlight(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = formData.get("id") as string;
  if (!id) return { error: "Highlight ID is required" };

  const { error } = await supabase.rpc("delete_branch_highlight", {
    p_highlight_id: id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true };
}

export async function uploadBranchHighlightImage(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const branchId = formData.get("branch_id") as string;
  const highlightId = formData.get("highlight_id") as string;
  const file = formData.get("image") as File;

  if (!branchId || !highlightId) {
    return { error: "Missing required fields" };
  }

  const uploadError = validateUpload(file);
  if (uploadError) {
    return { error: uploadError };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `${branchId}/highlights/${crypto.randomUUID()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from("branch-assets")
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (storageError) {
    return { error: storageError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("branch-assets").getPublicUrl(filePath);

  const { error: rpcError } = await supabase.rpc("update_branch_highlight", {
    p_highlight_id: highlightId,
    p_image_url: publicUrl,
  });

  if (rpcError) {
    return { error: rpcError.message };
  }

  revalidateBranchPaths(formData.get("slug") as string);
  return { success: true, image_url: publicUrl };
}
