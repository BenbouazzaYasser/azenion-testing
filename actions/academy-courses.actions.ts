"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { courseSchema } from "@/lib/validations/course.schema";

const COURSES_PATH = "/academy/courses";

const MAX_COURSE_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

const PDF_EXTENSIONS = new Set(["pdf"]);
const HTML_CSS_EXTENSIONS = new Set(["zip", "html", "htm", "css"]);

const THUMBNAIL_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

// Content-Type by extension so the browser renders (not downloads) HTML/CSS
// course files served from storage. `File.type` is frequently empty for
// .html/.css and falls back to application/octet-stream, which makes Supabase
// serve the file as a download instead of rendering it.
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
};

function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

<<<<<<< HEAD
async function isCoreTeamMember(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_core_team_member");
=======
async function isCourseManager(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_course_manager");
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
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

<<<<<<< HEAD
  if (!(await isCoreTeamMember())) {
    return { error: "Only core team members or creators can upload courses" };
=======
  if (!(await isCourseManager())) {
    return { error: "Only course managers or creators can upload courses" };
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
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
          : "Invalid file type. Use a .zip, .html, or .css file for HTML/CSS courses.",
    };
  }

  const objectPath = `courses/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
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
  } = supabase.storage.from("course-files").getPublicUrl(objectPath);

  const { data: inserted, error: insertError } = await supabase
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
    await supabase.storage.from("course-files").remove([objectPath]);
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
    const { error: thumbError } = await supabase.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: thumbnail.type || `image/${thumbExt === "jpg" ? "jpeg" : thumbExt}`,
        upsert: true,
      });

    if (!thumbError) {
      const {
        data: { publicUrl: thumbUrl },
      } = supabase.storage.from("course-files").getPublicUrl(thumbnailPath);
      await supabase.from("courses").update({ thumbnail: thumbUrl }).eq("id", inserted.id);
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

<<<<<<< HEAD
  if (!(await isCoreTeamMember())) {
    return { error: "Only core team members or creators can delete courses" };
=======
  if (!(await isCourseManager())) {
    return { error: "Only course managers or creators can delete courses" };
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing course id" };
  }

  const { data: course } = await supabase
    .from("courses")
    .select("file_path, thumbnail")
    .eq("id", id)
    .maybeSingle();

  const { error: deleteError } = await supabase.from("courses").delete().eq("id", id);

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
    await supabase.storage.from("course-files").remove(objectsToRemove);
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

<<<<<<< HEAD
  if (!(await isCoreTeamMember())) {
    return { error: "Only core team members or creators can edit courses" };
=======
  if (!(await isCourseManager())) {
    return { error: "Only course managers or creators can edit courses" };
>>>>>>> 1602953abf04ad8ff52e495c6074a1ca86fa00d5
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

  const { data: existing } = await supabase
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

    const { error: uploadError } = await supabase.storage
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
    } = supabase.storage.from("course-files").getPublicUrl(thumbnailPath);
    patch.thumbnail = publicUrl;
  } else if (removeThumbnail) {
    patch.thumbnail = null;
  }

  const { error: updateError } = await supabase
    .from("courses")
    .update(patch)
    .eq("id", parsed.data.id);

  if (updateError) {
    if (thumbnailPath) {
      await supabase.storage.from("course-files").remove([thumbnailPath]);
    }
    return { error: updateError.message };
  }

  const oldObjectPath = existing?.thumbnail?.split("/course-files/")[1];
  const thumbnailReplacedOrRemoved = hasNewThumbnail || removeThumbnail;

  if (oldObjectPath && thumbnailReplacedOrRemoved) {
    await supabase.storage.from("course-files").remove([oldObjectPath]);
  }

  revalidatePath(COURSES_PATH);
  return { success: true };
}