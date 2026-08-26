"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { labSchema } from "@/lib/validations/lab.schema";

const LABS_PATH = "/academy/labs";

const MAX_LAB_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

const ZIP_EXTENSIONS = new Set(["zip"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "txt"]);
const THUMBNAIL_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

const CONTENT_TYPES: Record<string, string> = {
  zip: "application/zip",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
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

async function isLabCreator(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if user is a platform admin
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (isPlatformAdmin) return true;

  // Check if user has instructor or creator platform role
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const rows = (data as Array<{ roles: { name: string } | { name: string }[] | null }> | null) ?? [];
  return rows.some((row) => {
    const r = row.roles as unknown as { name: string } | { name: string }[] | null;
    if (!r) return false;
    const names = Array.isArray(r) ? r.map((x) => x.name) : [r.name];
    return names.includes("instructor") || names.includes("creator");
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

export async function createLab(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isLabCreator(supabase))) {
    return { error: "Not authorized - instructor or creator role required" };
  }

  const raw = {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    category: (formData.get("category") as string) ?? "",
    difficulty: (formData.get("difficulty") as string) ?? undefined,
    estimated_duration_minutes: parseInt((formData.get("estimated_duration_minutes") as string) ?? "0"),
    tags: parseTags((formData.get("tags") as string) ?? null),
    is_published: (formData.get("is_published") as string) === "true",
  };

  const parsed = labSchema.omit({ id: true }).safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const admin = createAdminClient();

  // Create the lab
  const { data: lab, error: labError } = await admin
    .from("labs")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
      estimated_duration_minutes: parsed.data.estimated_duration_minutes || null,
      tags: parsed.data.tags ?? null,
      is_published: parsed.data.is_published,
      published_at: parsed.data.is_published ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (labError || !lab?.id) {
    return { error: labError?.message ?? "Failed to create lab" };
  }

  // Handle thumbnail upload if provided
  const thumbnail = formData.get("thumbnail") as File | null;
  if (thumbnail && thumbnail.size > 0) {
    if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
      return { error: "Thumbnail too large. Maximum size is 5MB" };
    }
    const thumbExt = fileExtension(thumbnail.name);
    if (!THUMBNAIL_EXTENSIONS.has(thumbExt)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, GIF, or AVIF image." };
    }
    const thumbnailPath = `labs/${lab.id}/thumbnail.${thumbExt}`;
    const { error: thumbError } = await admin.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: CONTENT_TYPES[thumbExt] ?? thumbnail.type,
        upsert: true,
      });

    if (!thumbError) {
      const {
        data: { publicUrl: thumbUrl },
      } = admin.storage.from("course-files").getPublicUrl(thumbnailPath);
      await admin.from("labs").update({ thumbnail_url: thumbUrl }).eq("id", lab.id);
    }
  }

  revalidatePath(LABS_PATH);
  return { success: true, lab_id: lab.id };
}

export async function updateLab(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isLabCreator(supabase))) {
    return { error: "Not authorized - instructor or creator role required" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing lab id" };
  }

  // Check that user is the creator
  const admin = createAdminClient();
  const { data: existingLab } = await admin
    .from("labs")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();

  if (!existingLab || existingLab.created_by !== user.id) {
    return { error: "Not authorized - you can only edit your own labs" };
  }

  const raw = {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    category: (formData.get("category") as string) ?? "",
    difficulty: (formData.get("difficulty") as string) ?? undefined,
    estimated_duration_minutes: parseInt((formData.get("estimated_duration_minutes") as string) ?? "0"),
    tags: parseTags((formData.get("tags") as string) ?? null),
    is_published: (formData.get("is_published") as string) === "true",
  };

  const parsed = labSchema.omit({ id: true }).safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error: updateError } = await admin
    .from("labs")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
      estimated_duration_minutes: parsed.data.estimated_duration_minutes || null,
      tags: parsed.data.tags ?? null,
      is_published: parsed.data.is_published,
      published_at: parsed.data.is_published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return { error: updateError.message };
  }

  // Handle thumbnail update if provided
  const thumbnail = formData.get("thumbnail") as File | null;
  if (thumbnail && thumbnail.size > 0) {
    if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
      return { error: "Thumbnail too large. Maximum size is 5MB" };
    }
    const thumbExt = fileExtension(thumbnail.name);
    if (!THUMBNAIL_EXTENSIONS.has(thumbExt)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, GIF, or AVIF image." };
    }
    const thumbnailPath = `labs/${id}/thumbnail.${thumbExt}`;
    const { error: thumbError } = await admin.storage
      .from("course-files")
      .upload(thumbnailPath, thumbnail, {
        contentType: CONTENT_TYPES[thumbExt] ?? thumbnail.type,
        upsert: true,
      });

    if (!thumbError) {
      const {
        data: { publicUrl: thumbUrl },
      } = admin.storage.from("course-files").getPublicUrl(thumbnailPath);
      await admin.from("labs").update({ thumbnail_url: thumbUrl }).eq("id", id);
    }
  }

  revalidatePath(LABS_PATH);
  return { success: true };
}

export async function deleteLab(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isLabCreator(supabase))) {
    return { error: "Not authorized - instructor or creator role required" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing lab id" };
  }

  const admin = createAdminClient();

  // Check that user is the creator
  const { data: existingLab } = await admin
    .from("labs")
    .select("created_by, thumbnail_url")
    .eq("id", id)
    .maybeSingle();

  if (!existingLab || existingLab.created_by !== user.id) {
    return { error: "Not authorized - you can only delete your own labs" };
  }

  const { error: deleteError } = await admin.from("labs").delete().eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // Clean up storage files
  const objectsToRemove: string[] = [];
  if (existingLab.thumbnail_url) {
    const thumbPath = existingLab.thumbnail_url.split("/course-files/")[1];
    if (thumbPath) objectsToRemove.push(thumbPath);
  }

  if (objectsToRemove.length > 0) {
    await admin.storage.from("course-files").remove(objectsToRemove);
  }

  revalidatePath(LABS_PATH);
  return { success: true };
}

/**
 * Upload or update a lab version file (instructions, starter code, tests, etc.)
 */
export async function uploadLabVersionFile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isLabCreator(supabase))) {
    return { error: "Not authorized" };
  }

  const labId = (formData.get("lab_id") as string) ?? "";
  const fileType = (formData.get("file_type") as string) ?? ""; // 'instructions', 'starter_code', 'tests', 'solution', 'resources'
  const file = formData.get("file") as File | null;

  if (!labId || !fileType || !file || file.size === 0) {
    return { error: "Missing lab_id, file_type, or file" };
  }

  if (file.size > MAX_LAB_FILE_SIZE) {
    return { error: "File too large. Maximum size is 100MB" };
  }

  // Validate file type
  const ext = fileExtension(file.name);
  const allowedTypes: Record<string, Set<string>> = {
    instructions: MARKDOWN_EXTENSIONS,
    starter_code: ZIP_EXTENSIONS,
    tests: ZIP_EXTENSIONS,
    solution: ZIP_EXTENSIONS,
    resources: ZIP_EXTENSIONS,
  };

  if (!allowedTypes[fileType]?.has(ext)) {
    return { error: `Invalid file type for ${fileType}. Allowed: ${Array.from(allowedTypes[fileType] ?? []).join(", ")}` };
  }

  // Check that user is the lab creator
  const admin = createAdminClient();
  const { data: lab } = await admin
    .from("labs")
    .select("created_by")
    .eq("id", labId)
    .maybeSingle();

  if (!lab || lab.created_by !== user.id) {
    return { error: "Not authorized - you can only edit your own labs" };
  }

  // Upload the file
  const objectPath = `labs/${labId}/${fileType}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("course-files")
    .upload(objectPath, file, {
      contentType: CONTENT_TYPES[ext] ?? file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("course-files").getPublicUrl(objectPath);

  return { success: true, file_url: publicUrl };
}

/**
 * Create a new version of a lab with uploaded files
 */
export async function createLabVersion(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isLabCreator(supabase))) {
    return { error: "Not authorized" };
  }

  const labId = (formData.get("lab_id") as string) ?? "";
  const instructionsUrl = (formData.get("instructions_url") as string) ?? null;
  const starterCodeUrl = (formData.get("starter_code_url") as string) ?? null;
  const testFileUrl = (formData.get("test_file_url") as string) ?? null;
  const solutionUrl = (formData.get("solution_url") as string) ?? null;
  const resourcesUrl = (formData.get("resources_url") as string) ?? null;

  if (!labId) {
    return { error: "Missing lab_id" };
  }

  // Check that user is the lab creator and get the next version number
  const admin = createAdminClient();
  const { data: lab } = await admin
    .from("labs")
    .select("created_by")
    .eq("id", labId)
    .maybeSingle();

  if (!lab || lab.created_by !== user.id) {
    return { error: "Not authorized" };
  }

  const { data: latestVersion } = await admin
    .from("lab_versions")
    .select("version_number")
    .eq("lab_id", labId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latestVersion?.version_number ?? 0) + 1;

  // Create the version
  const { error: versionError } = await admin
    .from("lab_versions")
    .insert({
      lab_id: labId,
      version_number: nextVersion,
      instructions_url: instructionsUrl,
      starter_code_url: starterCodeUrl,
      test_file_url: testFileUrl,
      solution_url: solutionUrl,
      resources_url: resourcesUrl,
      created_by: user.id,
    });

  if (versionError) {
    return { error: versionError.message };
  }

  revalidatePath(LABS_PATH);
  return { success: true, version_number: nextVersion };
}

/**
 * Submit a lab solution
 */
export async function submitLabSolution(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const labId = (formData.get("lab_id") as string) ?? "";
  const submissionUrl = (formData.get("submission_url") as string) ?? "";

  if (!labId || !submissionUrl) {
    return { error: "Missing lab_id or submission_url" };
  }

  const admin = createAdminClient();

  // Check that the lab is published
  const { data: lab } = await admin
    .from("labs")
    .select("id, is_published")
    .eq("id", labId)
    .maybeSingle();

  if (!lab || !lab.is_published) {
    return { error: "Lab not found or not published" };
  }

  // Get the latest lab version
  const { data: latestVersion } = await admin
    .from("lab_versions")
    .select("id")
    .eq("lab_id", labId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestVersion) {
    return { error: "Lab has no versions" };
  }

  // Create or update submission
  const { error: submissionError } = await admin
    .from("lab_submissions")
    .upsert(
      {
        lab_id: labId,
        user_id: user.id,
        lab_version_id: latestVersion.id,
        submission_url: submissionUrl,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "lab_id,user_id" }
    );

  if (submissionError) {
    return { error: submissionError.message };
  }

  return { success: true };
}
