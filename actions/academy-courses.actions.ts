"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { courseSchema } from "@/lib/validations/course.schema";

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

function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

async function isCourseManager(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);
  const rows = (data as Array<{ roles: { name: string } | { name: string }[] | null }> | null) ?? [];
  return rows.some((row) => {
    const r = row.roles as unknown as { name: string } | { name: string }[] | null;
    if (!r) return false;
    return Array.isArray(r) ? r.some((x) => x.name === "core_team_member") : r.name === "core_team_member";
  });
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

  if (!(await isCourseManager(supabase))) {
    return { error: "Not authorized - core team only" };
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

  if (!allowedExts.has(ext)) {
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
      contentType: CONTENT_TYPES[ext] ?? (file.type || "application/octet-stream"),
      upsert: false,
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
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    await admin.storage.from("course-files").remove([objectPath]);
    return { error: insertError?.message ?? "Failed to create course" };
  }

  const thumbnail = formData.get("thumbnail") as File | null;
  if (thumbnail && thumbnail.size > 0) {
    if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
      return { error: "Thumbnail too large. Maximum size is 5MB" };
    }
    const thumbExt = fileExtension(thumbnail.name);
    if (!THUMBNAIL_EXTENSIONS.has(thumbExt)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, GIF, or AVIF image." };
    }
    const thumbnailPath = `courses/${inserted.id}/thumbnail.${thumbExt}`;
    const { error: thumbError } = await admin.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: thumbnail.type || `image/${thumbExt === "jpg" ? "jpeg" : thumbExt}`,
        upsert: true,
      });

    if (!thumbError) {
      const {
        data: { publicUrl: thumbUrl },
      } = admin.storage.from("course-files").getPublicUrl(thumbnailPath);
      await admin.from("courses").update({ thumbnail: thumbUrl }).eq("id", inserted.id);
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
    await admin.storage.from("course-files").remove(objectsToRemove);
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

  if (!(await isCourseManager(supabase))) {
    return { error: "Not authorized - core team only" };
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

  const thumbnail = formData.get("thumbnail") as File | null;
  const removeThumbnail = formData.get("remove_thumbnail") === "true";
  const hasNewThumbnail = thumbnail && thumbnail.size > 0;

  if (hasNewThumbnail && thumbnail.size > MAX_THUMBNAIL_SIZE) {
    return { error: "Thumbnail too large. Maximum size is 5MB" };
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
    if (!THUMBNAIL_EXTENSIONS.has(ext)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, GIF, or AVIF image." };
    }

    thumbnailPath = `courses/${parsed.data.id}/thumbnail.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: thumbnail.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
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
        await admin.storage.from("course-files").remove([oldThumbPath]);
      }
    }
  }

  const { error: updateError } = await admin
    .from("courses")
    .update(patch)
    .eq("id", parsed.data.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}
