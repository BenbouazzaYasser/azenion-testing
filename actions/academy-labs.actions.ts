"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { labSchema, labContentSchema, labAnswerInputSchema, labAnswerKeySchema, labSubmittedAnswersSchema } from "@/lib/validations/lab.schema";
import type { LabAnswerKey, LabContent } from "@/lib/validations/lab.schema";
import { gradeSubmission, hashFlag, questionBlocksOf, validateSubmittedAnswers } from "@/lib/labs/grading";

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

  // Check if user is a platform admin. has_platform_role('platform_admin')
  // is used instead of the raw is_platform_admin() RPC because this
  // platform recognizes admins two ways -- a row in public.platform_admins,
  // or the 'platform_admin' role in user_roles (the latter being what
  // /admin/roles actually grants) -- and has_platform_role() already ORs
  // both together.
  const { data: isPlatformAdminRole } = await supabase.rpc("has_platform_role", { p_role_name: "platform_admin" });
  if (isPlatformAdminRole) return true;

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

// Platform admins can manage any lab, not just ones they created themselves.
// Kept separate from isLabCreator (which gates create/instructor-or-creator
// access) so the ownership checks below stay a single, explicit condition.
// Uses has_platform_role('platform_admin') rather than the raw
// is_platform_admin() RPC so both admin representations (the
// public.platform_admins table and the 'platform_admin' role in
// user_roles) are recognized -- see isLabCreator() above for the same
// reasoning.
async function isPlatformAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data } = await supabase.rpc("has_platform_role", { p_role_name: "platform_admin" });
  return Boolean(data);
}

// PostgREST embeds (e.g. `labs(created_by)`) come back as either a single
// object or an array depending on how the relationship is inferred, since
// this codebase doesn't use generated Supabase types. Matches the same
// defensive pattern already used in isLabCreator() above for user_roles.
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// Records a `completed_lab` activity the first time a user passes a given
// lab, reusing the existing Activities system (public.activities) exactly
// like every other completion/event in the platform. Idempotent: if the
// user already has a completed_lab activity for this lab (e.g. they
// resubmit and pass again later), no duplicate is created.
async function recordLabCompletionActivity(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  labId: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("activities")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "completed_lab")
    .contains("metadata", { lab_id: labId })
    .limit(1)
    .maybeSingle();

  if (existing) return;

  const { data: lab } = await admin.from("labs").select("title").eq("id", labId).maybeSingle();

  await admin.from("activities").insert({
    user_id: userId,
    type: "completed_lab",
    metadata: { lab_id: labId, lab_title: lab?.title ?? null },
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
    type: (formData.get("type") as string) || null,
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
      type: parsed.data.type ?? null,
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

  // Check that user is the creator, or a platform admin managing on behalf
  // of another creator
  const admin = createAdminClient();
  const { data: existingLab } = await admin
    .from("labs")
    .select("created_by")
    .eq("id", id)
    .maybeSingle();

  if (!existingLab) {
    return { error: "Lab not found" };
  }

  if (existingLab.created_by !== user.id && !(await isPlatformAdmin(supabase))) {
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
    type: (formData.get("type") as string) || null,
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
      type: parsed.data.type ?? null,
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

  // Check that user is the creator, or a platform admin managing on behalf
  // of another creator
  const { data: existingLab } = await admin
    .from("labs")
    .select("created_by, thumbnail_url")
    .eq("id", id)
    .maybeSingle();

  if (!existingLab) {
    return { error: "Lab not found" };
  }

  if (existingLab.created_by !== user.id && !(await isPlatformAdmin(supabase))) {
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
  // Structured content is optional: omitting it entirely preserves the
  // original file-based Lab version behavior exactly.
  const contentRaw = (formData.get("content") as string) ?? null;
  const answerInputRaw = (formData.get("answer_input") as string) ?? null;

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

  let content: LabContent | null = null;
  let answerKey: LabAnswerKey | null = null;

  if (contentRaw) {
    let parsedContentJson: unknown;
    try {
      parsedContentJson = JSON.parse(contentRaw);
    } catch {
      return { error: "Invalid content JSON" };
    }

    const contentResult = labContentSchema.safeParse(parsedContentJson);
    if (!contentResult.success) {
      return { error: contentResult.error.issues[0]?.message ?? "Invalid lab content" };
    }
    content = contentResult.data;

    const questionBlocks = questionBlocksOf(content.blocks);
    const questionIds = new Set(questionBlocks.map((b) => b.id));

    let answerInput: Record<string, any> = {};
    if (answerInputRaw) {
      let parsedAnswerInputJson: unknown;
      try {
        parsedAnswerInputJson = JSON.parse(answerInputRaw);
      } catch {
        return { error: "Invalid answer_input JSON" };
      }
      const answerInputResult = labAnswerInputSchema.safeParse(parsedAnswerInputJson);
      if (!answerInputResult.success) {
        return { error: answerInputResult.error.issues[0]?.message ?? "Invalid answer input" };
      }
      answerInput = answerInputResult.data;
    }

    // Every answer_input key must reference a real question block in this
    // same content payload; orphaned keys are rejected rather than
    // silently stored.
    for (const qid of Object.keys(answerInput)) {
      if (!questionIds.has(qid)) {
        return { error: `answer_input references unknown question id: ${qid}` };
      }
    }

    // Transform plaintext answer input into the stored answer_key. Flags
    // are hashed here, server-side -- the plaintext expected_flag never
    // reaches storage or any response. A question with no corresponding
    // answer_input entry simply has no answer_key entry, which means it
    // requires manual instructor grading (see lib/labs/grading.ts).
    const transformedAnswerKey: LabAnswerKey = {};
    for (const block of questionBlocks) {
      const input = answerInput[block.id];
      if (!input) continue;

      if (block.question_type === "qcm" && input.question_type === "qcm") {
        const validOptionIds = new Set(block.options.map((o) => o.id));
        for (const oid of input.correct_option_ids as string[]) {
          if (!validOptionIds.has(oid)) {
            return { error: `Question ${block.id}: correct_option_ids references an unknown option` };
          }
        }
        transformedAnswerKey[block.id] = {
          question_type: "qcm",
          correct_option_ids: input.correct_option_ids,
        };
      } else if (block.question_type === "text_answer" && input.question_type === "text_answer") {
        transformedAnswerKey[block.id] = {
          question_type: "text_answer",
          match_mode: input.match_mode,
          accepted: input.accepted,
        };
      } else if (block.question_type === "flag" && input.question_type === "flag") {
        transformedAnswerKey[block.id] = {
          question_type: "flag",
          flag_hash: await hashFlag(input.expected_flag, block.case_sensitive),
        };
      } else {
        return { error: `Question ${block.id}: answer_input type does not match question type` };
      }
    }

    const answerKeyValidation = labAnswerKeySchema.safeParse(transformedAnswerKey);
    if (!answerKeyValidation.success) {
      return { error: "Failed to build a valid answer key from the provided input" };
    }
    answerKey = answerKeyValidation.data;
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
      content,
      answer_key: answerKey,
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

// ── Public Lab retrieval ─────────────────────────────────────────────────

/**
 * Learner-facing retrieval of a Lab and its current (latest) version.
 *
 * Respects the same access rules as the existing `labs` RLS policies:
 * published labs are visible to anyone, unpublished labs are visible only
 * to their creator or a platform admin previewing them. Unpublished labs
 * are reported as "not found" rather than "not authorized" to avoid
 * revealing their existence to users who can't see them.
 *
 * The returned version explicitly excludes `answer_key` -- it is never
 * selected here, regardless of who is asking.
 */
export async function getLabWithContent(labId: string) {
  if (!labId) {
    return { error: "Missing lab_id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: lab } = await admin
    .from("labs")
    .select(
      "id, title, description, category, difficulty, type, estimated_duration_minutes, tags, thumbnail_url, is_published, published_at, created_by, created_at, updated_at",
    )
    .eq("id", labId)
    .maybeSingle();

  if (!lab) {
    return { error: "Lab not found" };
  }

  if (!lab.is_published) {
    if (!user) {
      return { error: "Lab not found" };
    }
    const isOwner = lab.created_by === user.id;
    if (!isOwner && !(await isPlatformAdmin(supabase))) {
      return { error: "Lab not found" };
    }
  }

  // Explicit column list -- answer_key is deliberately never selected here.
  const { data: version } = await admin
    .from("lab_versions")
    .select(
      "id, lab_id, version_number, instructions_url, starter_code_url, test_file_url, solution_url, resources_url, content, created_by, created_at",
    )
    .eq("lab_id", labId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Defensive re-validation: if stored content is somehow malformed (e.g.
  // edited outside the app), fail closed to null rather than return a
  // shape the frontend doesn't expect.
  let safeContent: LabContent | null = null;
  if (version?.content) {
    const parsed = labContentSchema.safeParse(version.content);
    safeContent = parsed.success ? parsed.data : null;
  }

  return {
    success: true,
    lab,
    version: version
      ? {
          id: version.id,
          lab_id: version.lab_id,
          version_number: version.version_number,
          instructions_url: version.instructions_url,
          starter_code_url: version.starter_code_url,
          test_file_url: version.test_file_url,
          solution_url: version.solution_url,
          resources_url: version.resources_url,
          content: safeContent,
          created_by: version.created_by,
          created_at: version.created_at,
        }
      : null,
  };
}

// ── Structured Lab submission ────────────────────────────────────────────

/**
 * Submits and grades a learner's answers for a structured (question-based)
 * Lab version. All grading happens here, server-side, using the
 * service-role client -- the client never receives the answer key and the
 * server never trusts a client-supplied grading result.
 */
export async function submitLabAnswers(labId: string, answers: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!labId) {
    return { error: "Missing lab_id" };
  }

  const admin = createAdminClient();

  // Verify the lab is available to the user (published labs only -- same
  // rule as the existing submitLabSolution).
  const { data: lab } = await admin.from("labs").select("id, is_published").eq("id", labId).maybeSingle();

  if (!lab || !lab.is_published) {
    return { error: "Lab not found or not published" };
  }

  // Retrieve the current version INCLUDING answer_key -- this is the only
  // place in the file that selects answer_key, and it never leaves this
  // function.
  const { data: version } = await admin
    .from("lab_versions")
    .select("id, content, answer_key")
    .eq("lab_id", labId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version) {
    return { error: "Lab has no versions" };
  }

  if (!version.content) {
    return { error: "This lab does not use structured answers. Use submitLabSolution instead." };
  }

  const contentParsed = labContentSchema.safeParse(version.content);
  if (!contentParsed.success) {
    return { error: "Lab content is invalid and cannot be graded right now" };
  }

  const questionBlocks = questionBlocksOf(contentParsed.data.blocks);
  if (questionBlocks.length === 0) {
    return { error: "This lab has no gradable questions" };
  }

  const answersParsed = labSubmittedAnswersSchema.safeParse(answers);
  if (!answersParsed.success) {
    return { error: "Invalid answer submission" };
  }

  const structuralCheck = validateSubmittedAnswers(questionBlocks, answersParsed.data);
  if (!structuralCheck.ok) {
    return { error: structuralCheck.error };
  }

  // answer_key may be null (version author hasn't provided one yet) or,
  // in principle, hand-edited to something malformed -- parse defensively
  // and fail safe (treat as "no key", i.e. everything manual) rather than
  // throw or mis-grade.
  const answerKeyParsed = labAnswerKeySchema.safeParse(version.answer_key ?? {});
  const answerKey: LabAnswerKey = answerKeyParsed.success ? answerKeyParsed.data : {};

  const { results, allAutoGraded, autoCorrectCount, autoGradableCount } = await gradeSubmission(
    questionBlocks,
    answerKey,
    answersParsed.data,
  );

  const testResults = {
    total_questions: questionBlocks.length,
    auto_gradable: autoGradableCount,
    auto_correct: autoCorrectCount,
    per_question: results,
    graded_at: new Date().toISOString(),
  };

  let status: "submitted" | "passed" | "failed";
  let score: number | null;

  if (allAutoGraded) {
    // allAutoGraded + autoGradableCount === 0 can't happen here: it would
    // require zero question blocks, already rejected above.
    const isPassing = autoCorrectCount === autoGradableCount;
    status = isPassing ? "passed" : "failed";
    score = Math.round((autoCorrectCount / autoGradableCount) * 100);
  } else {
    // One or more questions need manual review -- never mark as passed or
    // failed yet, regardless of how the auto-graded portion looks.
    status = "submitted";
    score = autoGradableCount > 0 ? Math.round((autoCorrectCount / autoGradableCount) * 100) : null;
  }

  const { error: submissionError } = await admin.from("lab_submissions").upsert(
    {
      lab_id: labId,
      user_id: user.id,
      lab_version_id: version.id,
      answers: answersParsed.data,
      test_results: testResults,
      score,
      status,
      submitted_at: new Date().toISOString(),
      evaluated_at: allAutoGraded ? new Date().toISOString() : null,
    },
    { onConflict: "lab_id,user_id" },
  );

  if (submissionError) {
    return { error: submissionError.message };
  }

  if (status === "passed") {
    await recordLabCompletionActivity(admin, user.id, labId);
  }

  revalidatePath(LABS_PATH);
  return { success: true, status, score, test_results: testResults };
}

// ── Instructor manual grading ────────────────────────────────────────────

/**
 * Finalizes a submission that has one or more manually-graded questions.
 * Authorization mirrors the existing "instructors can update submissions
 * (grading)" RLS convention: the lab's own creator, or a platform admin.
 * Only submissions currently awaiting review (`status = 'submitted'`) can
 * be graded this way, so this can't be used to silently overturn an
 * already-finalized automatic result.
 */
export async function gradeLabSubmission(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const submissionId = (formData.get("submission_id") as string) ?? "";
  const decision = (formData.get("decision") as string) ?? "";
  const notes = (formData.get("notes") as string) || null;

  if (!submissionId || (decision !== "passed" && decision !== "failed")) {
    return { error: "Missing or invalid submission_id/decision" };
  }

  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("lab_submissions")
    .select("id, lab_id, user_id, status, test_results, labs(created_by)")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    return { error: "Submission not found" };
  }

  const labInfo = firstOrSelf(submission.labs as { created_by: string } | { created_by: string }[] | null);
  const isOwnLab = labInfo?.created_by === user.id;
  if (!isOwnLab && !(await isPlatformAdmin(supabase))) {
    return { error: "Not authorized to grade this submission" };
  }

  if (submission.status !== "submitted") {
    return { error: "Only submissions awaiting review can be graded" };
  }

  const priorResults = (submission.test_results as Record<string, any>) ?? {};
  const mergedResults = {
    ...priorResults,
    manual_review: {
      decision,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
      notes,
    },
  };

  const autoGradable = typeof priorResults.auto_gradable === "number" ? priorResults.auto_gradable : 0;
  const autoCorrect = typeof priorResults.auto_correct === "number" ? priorResults.auto_correct : 0;
  const score = decision === "passed" ? 100 : autoGradable > 0 ? Math.round((autoCorrect / autoGradable) * 100) : 0;

  const { error: updateError } = await admin
    .from("lab_submissions")
    .update({
      status: decision,
      test_results: mergedResults,
      score,
      evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) {
    return { error: updateError.message };
  }

  if (decision === "passed") {
    await recordLabCompletionActivity(admin, submission.user_id, submission.lab_id);
  }

  revalidatePath(LABS_PATH);
  return { success: true, status: decision };
}

// ── Course <-> Lab linking ───────────────────────────────────────────────
// Uses the new course_labs join table (00106). No course progress or
// unlocking logic is introduced -- this is purely a link/unlink
// relationship, matching the approved architecture.

export async function linkLabToCourse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const courseId = (formData.get("course_id") as string) ?? "";
  const labId = (formData.get("lab_id") as string) ?? "";

  if (!courseId || !labId) {
    return { error: "Missing course_id or lab_id" };
  }

  // Matches the course_labs RLS policy: whoever can already manage courses
  // or manage labs can link them together.
  const { data: isCourseManager } = await supabase.rpc("is_course_manager");
  const canManageLab = await isLabCreator(supabase);
  if (!isCourseManager && !canManageLab) {
    return { error: "Not authorized to link labs to courses" };
  }

  const admin = createAdminClient();

  const [{ data: course }, { data: lab }] = await Promise.all([
    admin.from("courses").select("id").eq("id", courseId).maybeSingle(),
    admin.from("labs").select("id").eq("id", labId).maybeSingle(),
  ]);

  if (!course) return { error: "Course not found" };
  if (!lab) return { error: "Lab not found" };

  const { error } = await admin
    .from("course_labs")
    .upsert({ course_id: courseId, lab_id: labId, added_by: user.id }, { onConflict: "course_id,lab_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LABS_PATH);
  revalidatePath("/academy/courses");
  return { success: true };
}

export async function unlinkLabFromCourse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const courseId = (formData.get("course_id") as string) ?? "";
  const labId = (formData.get("lab_id") as string) ?? "";

  if (!courseId || !labId) {
    return { error: "Missing course_id or lab_id" };
  }

  const { data: isCourseManager } = await supabase.rpc("is_course_manager");
  const canManageLab = await isLabCreator(supabase);
  if (!isCourseManager && !canManageLab) {
    return { error: "Not authorized to unlink labs from courses" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("course_labs").delete().eq("course_id", courseId).eq("lab_id", labId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(LABS_PATH);
  revalidatePath("/academy/courses");
  return { success: true };
}

/** All Labs linked to a given Course. Read access matches the public
 * readability of course_labs plus each embedded row's own RLS. */
export async function getLabsForCourse(courseId: string) {
  if (!courseId) {
    return { error: "Missing course_id" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_labs")
    .select(
      "lab_id, created_at, labs(id, title, description, category, difficulty, type, estimated_duration_minutes, tags, thumbnail_url, is_published, created_by, created_at)",
    )
    .eq("course_id", courseId);

  if (error) {
    return { error: error.message };
  }

  const labs = (data ?? [])
    .map((row) => firstOrSelf(row.labs as Record<string, unknown> | Record<string, unknown>[] | null))
    .filter((lab): lab is Record<string, unknown> => Boolean(lab));

  return { success: true, labs };
}

/** All Courses a given Lab is linked to. */
export async function getCoursesForLab(labId: string) {
  if (!labId) {
    return { error: "Missing lab_id" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_labs")
    .select("course_id, created_at, courses(id, title, description, category, thumbnail, created_by, created_at)")
    .eq("lab_id", labId);

  if (error) {
    return { error: error.message };
  }

  const courses = (data ?? [])
    .map((row) => firstOrSelf(row.courses as Record<string, unknown> | Record<string, unknown>[] | null))
    .filter((course): course is Record<string, unknown> => Boolean(course));

  return { success: true, courses };
}
