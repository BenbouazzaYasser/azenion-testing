"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { courseSchema } from "@/lib/validations/course.schema";
import { safeRemoveStorageObjects } from "@/lib/storage-cleanup";

const COURSES_PATH = "/academy/courses";

const MAX_COURSE_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

const PDF_EXTENSIONS = new Set(["pdf"]);
const HTML_CSS_EXTENSIONS = new Set(["zip", "html", "htm", "css", "js", "mjs"]);
const THUMBNAIL_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
};

const THUMBNAIL_EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Canonical course-manager check. Delegates to the database oracle
 * `public.is_course_manager()` (platform roles: core_team_member, creator,
 * plus platform-admin override) on the authenticated user-scoped client, so
 * the caller's identity always comes from `auth.uid()` server-side. Never
 * re-implements role logic here and never consults the service-role client
 * for this decision.
 */
async function isCourseManager(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_course_manager");
  if (error) return false;
  return data === true;
}

/**
 * Canonical "may this user create course drafts" check. Course managers may
 * always create; additionally anyone who can publish courses on behalf of at
 * least one team (team owner or PUBLISH_COURSES role with the capability
 * enabled) may create drafts. Creating is deliberately separate from
 * publishing: drafts carry no publication authority.
 */
async function canCreateCourse(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_create_course");
  if (error) return false;
  return data === true;
}

function parseTags(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export async function createCourse(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await canCreateCourse(supabase))) {
    return { error: "Not authorized - core team or team course publisher only" };
  }

  const raw = {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    category: (formData.get("category") as string) ?? "",
    content_type: (formData.get("content_type") as string) ?? "",
    duration: (formData.get("duration") as string) ?? "",
    difficulty: (formData.get("difficulty") as string) ?? undefined,
    tags: parseTags((formData.get("tags") as string) ?? null),
  };

  // Courses are always created as drafts. Publishing is a separate, explicit,
  // server-validated step (publishCourse) so creation never grants
  // publication authority by itself.
  const status = "draft";

  const parsed = courseSchema.omit({ id: true }).safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  if (!["html_css", "pdf"].includes(raw.content_type)) {
    return { error: "Invalid content type" };
  }

  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  if (file.size > MAX_COURSE_FILE_SIZE) {
    return { error: "File too large. Maximum size is 100MB" };
  }

  const ext = fileExtension(file.name);
  const allowedExts =
    raw.content_type === "pdf" ? PDF_EXTENSIONS : HTML_CSS_EXTENSIONS;

  // M13: ext is already lowercased; reject non-alphanumeric extensions and
  // anything outside the per-content-type allow-list.
  if (/[^a-z0-9]/.test(ext) || !allowedExts.has(ext)) {
    return {
      error:
        raw.content_type === "pdf"
          ? "Invalid file type. Use a .pdf file for PDF courses."
          : "Invalid file type. Use a .zip, .html, .css, or .js file for HTML/CSS/JS courses.",
    };
  }

  const objectPath = `courses/${user.id}/${crypto.randomUUID()}.${ext}`;

  // Use admin client to bypass RLS (storage bucket + courses table are gated by is_course_manager)
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("course-files")
    .upload(objectPath, file, {
      contentType: CONTENT_TYPES[ext],
      upsert: false,
      metadata: { created_by: user.id },
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("course-files").getPublicUrl(objectPath);

  const { data: inserted, error: insertError } = await admin
    .from("courses")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      content_type: raw.content_type,
      file_url: publicUrl,
      file_path: objectPath,
      duration: parsed.data.duration || null,
      difficulty: parsed.data.difficulty ?? null,
      tags: parsed.data.tags ?? null,
      status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    await safeRemoveStorageObjects(admin, "course-files", [objectPath]);
    return { error: insertError?.message ?? "Failed to create course" };
  }

  const thumbnail = formData.get("thumbnail") as File | null;
  if (thumbnail && thumbnail.size > 0) {
    if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
      return { error: "Thumbnail too large. Maximum size is 5MB" };
    }
    const thumbExt = fileExtension(thumbnail.name);
    // M13: ext is already lowercased; reject non-alphanumeric extensions.
    if (/[^a-z0-9]/.test(thumbExt) || !THUMBNAIL_EXTENSIONS.has(thumbExt)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, GIF, or AVIF image." };
    }
    const thumbnailPath = `courses/${inserted.id}/thumbnail.${thumbExt}`;
    const { error: thumbError } = await admin.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: THUMBNAIL_EXT_MIME[thumbExt],
        upsert: true,
      });

    if (!thumbError) {
      const {
        data: { publicUrl: thumbUrl },
      } = admin.storage.from("course-files").getPublicUrl(thumbnailPath);
      const { error: thumbUpdateError } = await admin.from("courses").update({ thumbnail: thumbUrl }).eq("id", inserted.id);
      if (thumbUpdateError) {
        await safeRemoveStorageObjects(admin, "course-files", [thumbnailPath]);
      }
    }
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}

export async function deleteCourse(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isCourseManager(supabase))) {
    return { error: "Not authorized - core team only" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing course id" };
  }

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("file_path, thumbnail")
    .eq("id", id)
    .maybeSingle();

  const { error: deleteError } = await admin.from("courses").delete().eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const objectsToRemove: string[] = [];
  if (course?.file_path) objectsToRemove.push(course.file_path);
  if (course?.thumbnail) {
    const thumbPath = course.thumbnail.split("/course-files/")[1];
    if (thumbPath) objectsToRemove.push(thumbPath);
  }

  if (objectsToRemove.length > 0) {
    await safeRemoveStorageObjects(admin, "course-files", objectsToRemove);
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}

export async function updateCourse(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = courseSchema.safeParse({
    id: (formData.get("id") as string) ?? "",
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    category: (formData.get("category") as string) ?? "",
    duration: (formData.get("duration") as string) ?? "",
    difficulty: (formData.get("difficulty") as string) ?? undefined,
    tags: parseTags((formData.get("tags") as string) ?? null),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  // Status is explicitly NOT editable here: courses move to/from published
  // only through publishCourse / unpublishCourse so every transition is
  // server-validated and audited.
  const nextStatus = null;

  const thumbnail = formData.get("thumbnail") as File | null;
  const removeThumbnail = formData.get("remove_thumbnail") === "true";
  const hasNewThumbnail = thumbnail && thumbnail.size > 0;

  if (hasNewThumbnail && thumbnail.size > MAX_THUMBNAIL_SIZE) {
    return { error: "Thumbnail too large. Maximum size is 5MB" };
  }

  // The course creator may maintain their own course metadata; course
  // managers retain the same access over every course.
  const { data: courseOwner } = await supabase
    .from("courses")
    .select("created_by")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!courseOwner) {
    return { error: "Course not found" };
  }

  const isCreator = courseOwner.created_by === user.id;
  if (!isCreator && !(await isCourseManager(supabase))) {
    return { error: "Not authorized - core team only" };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("courses")
    .select("thumbnail")
    .eq("id", parsed.data.id)
    .maybeSingle();

  let thumbnailPath: string | null = null;

  if (hasNewThumbnail) {
    const ext = fileExtension(thumbnail.name);
    // M13: ext is already lowercased; reject non-alphanumeric extensions.
    if (/[^a-z0-9]/.test(ext) || !THUMBNAIL_EXTENSIONS.has(ext)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, GIF, or AVIF image." };
    }

    thumbnailPath = `courses/${parsed.data.id}/thumbnail.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: THUMBNAIL_EXT_MIME[ext],
        upsert: true,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }
  }

  const patch: {
    title: string;
    description: string | null;
    category: string;
    duration: string | null;
    difficulty: string | null;
    tags: string[] | null;
    thumbnail?: string | null;
  } = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category,
    duration: parsed.data.duration || null,
    difficulty: parsed.data.difficulty ?? null,
    tags: parsed.data.tags ?? null,
  };

  if (hasNewThumbnail && thumbnailPath) {
    const {
      data: { publicUrl },
    } = admin.storage.from("course-files").getPublicUrl(thumbnailPath);
    patch.thumbnail = publicUrl;
  } else if (removeThumbnail) {
    patch.thumbnail = null;
    if (existing?.thumbnail) {
      const oldThumbPath = existing.thumbnail.split("/course-files/")[1];
      if (oldThumbPath) {
        await safeRemoveStorageObjects(admin, "course-files", [oldThumbPath]);
      }
    }
  }

  const { error: updateError } = await admin
    .from("courses")
    .update(patch)
    .eq("id", parsed.data.id);

  if (updateError) {
    if (hasNewThumbnail && thumbnailPath) {
      await safeRemoveStorageObjects(admin, "course-files", [thumbnailPath]);
    }
    return { error: updateError.message };
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}

/**
 * Explicit publish. The publisher context is resolved server-side through
 * `publish_course()` — the caller may pass a team they want to publish for,
 * but the RPC re-validates every condition (team exists, capability enabled,
 * owner or PUBLISH_COURSES, creator/manager of the course) and never trusts
 * the client. Passing no team publishes individually under the existing
 * course-manager authorization.
 */
export async function publishCourse(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = ((formData.get("id") as string) ?? "").trim();
  const rawTeamId = ((formData.get("publisher_team_id") as string) ?? "").trim();

  if (!id) {
    return { error: "Missing course id" };
  }

  let publisherTeamId: string | null = null;
  if (rawTeamId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTeamId)) {
      return { error: "Invalid publisher team id" };
    }
    publisherTeamId = rawTeamId;
  }

  const { error } = await supabase.rpc("publish_course", {
    p_course_id: id,
    p_publisher_team_id: publisherTeamId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}

/**
 * Explicit unpublish. Delegates to `unpublish_course()` which restricts the
 * actor (creator, course manager, or a publisher of the course's current
 * team) and records the transition in the audit trail. There is no direct
 * manager-only status flip anymore.
 */
export async function unpublishCourse(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const id = ((formData.get("id") as string) ?? "").trim();

  if (!id) {
    return { error: "Missing course id" };
  }

  const { error } = await supabase.rpc("unpublish_course", { p_course_id: id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}

/**
 * Non-published status maintenance (draft <-> archived) for course managers.
 * The published state is deliberately NOT reachable here — courses move
 * to/from published only through publishCourse/unpublishCourse to keep every
 * publication transition server-validated and audited.
 */
export async function updateCourseStatus(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isCourseManager(supabase))) {
    return { error: "Not authorized - core team only" };
  }

  const id = ((formData.get("id") as string) ?? "").trim();
  const raw = ((formData.get("status") as string) ?? "").trim();

  if (!id) {
    return { error: "Missing course id" };
  }

  if (raw !== "draft" && raw !== "archived") {
    return {
      error: "Invalid status. Draft and archived only — publish or unpublish explicitly.",
    };
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("courses")
    .update({ status: raw })
    .eq("id", id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(COURSES_PATH);
  return { success: true, status: raw };
}
