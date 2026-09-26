"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { labSchema, labContentSchema, labAnswerInputSchema, labAnswerKeySchema, labSubmittedAnswersSchema } from "@/lib/validations/lab.schema";
import type { LabAnswerKey, LabContent } from "@/lib/validations/lab.schema";
import { gradeSubmission, hashFlag, questionBlocksOf, validateSubmittedAnswers } from "@/lib/labs/grading";
import { getLabsAuthContext } from "@/lib/labs/authorization";
import { safeRemoveStorageObjects } from "@/lib/storage-cleanup";

const LABS_PATH = "/academy/labs";

const MAX_LAB_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

const ZIP_EXTENSIONS = new Set(["zip"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "txt"]);
const THUMBNAIL_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

const CONTENT_TYPES: Record<string, string> = {
  zip: "application/zip",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

// Instructor, creator, core_team_member, or platform admin can create and
// manage their own labs. Takes an explicit userId (the caller must already
// have it from supabase.auth.getUser()) rather than deriving it from
// auth.uid() inside an RPC -- that path was found to be unreliable in the
// server/RSC context. See lib/labs/authorization.ts for the full reasoning.
//
// Single-check convenience wrapper around getLabsAuthContext(). Call sites
// that need BOTH this and isPlatformAdmin() for the same user in the same
// request should call getLabsAuthContext() directly once instead of using
// both wrappers -- see updateLab/deleteLab/uploadLabVersionFile/
// createLabVersion for why (each used to fetch this context twice).
async function isLabCreator(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const ctx = await getLabsAuthContext(supabase, userId);
  return ctx.canCreateLab;
}

// Platform admins can manage any lab, not just ones they created themselves
// -- core_team_member/instructor/creator intentionally do NOT get this,
// only isLabCreator's narrower "can create/manage own labs" access. Kept
// separate from isLabCreator so the ownership-override checks below stay a
// single, explicit condition. Same single-check-only caveat as above.
async function isPlatformAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const ctx = await getLabsAuthContext(supabase, userId);
  return ctx.isPlatformAdmin;
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
  // These two reads are independent (neither depends on the other's
  // result), so they're fetched concurrently. On the common "first pass"
  // path both are needed anyway; on a later resubmit-after-passing path
  // `existing` alone was enough and the lab-title read turns out unused --
  // a small amount of wasted work traded for lower latency on the common
  // path.
  const [{ data: existing }, { data: lab }] = await Promise.all([
    admin
      .from("activities")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "completed_lab")
      .contains("metadata", { lab_id: labId })
      .limit(1)
      .maybeSingle(),
    admin.from("labs").select("title").eq("id", labId).maybeSingle(),
  ]);

  if (existing) return;

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

/**
 * Uploads a lab thumbnail (upsert) and stamps a cache-busting query param
 * onto the stored URL, then persists that URL onto the lab row. Shared by
 * createLab/updateLab, which previously duplicated this upload + cache-bust
 * + update sequence verbatim.
 *
 * Deliberately does NOT include the extension check: createLab/updateLab
 * abort the whole action on an invalid extension (`return { error }`) but
 * only produce a soft warning if the upload or the URL save fails (the lab
 * itself still saves successfully). Folding the extension check in here
 * would have blurred that distinction, so callers validate the extension
 * themselves and only reach this helper once it's known good. `stage`
 * tells the caller which half failed, since createLab/updateLab each
 * phrase their warning text around that ("could not be uploaded" vs
 * "could not be saved").
 */
async function uploadLabThumbnail(
  admin: ReturnType<typeof createAdminClient>,
  labId: string,
  thumbnail: File,
  thumbExt: string,
): Promise<{ url: string } | { error: string; stage: "upload" | "save" }> {
  const thumbnailPath = `labs/${labId}/thumbnail.${thumbExt}`;
  const { error: thumbError } = await admin.storage
    .from("course-files")
    .upload(thumbnailPath, thumbnail, {
      contentType: CONTENT_TYPES[thumbExt] ?? thumbnail.type,
      upsert: true,
    });

  if (thumbError) {
    return { error: thumbError.message, stage: "upload" };
  }

  const {
    data: { publicUrl: thumbUrl },
  } = admin.storage.from("course-files").getPublicUrl(thumbnailPath);

  // Cache-bust: this path is stable and gets overwritten (upsert) on every
  // future edit, so without a varying query param, browsers and any CDN in
  // front of Supabase Storage would keep serving whatever they cached for
  // this exact URL -- including a cached "missing" response from before the
  // file existed, or a stale older image after a later re-upload. The
  // stored URL, not just the storage path, must change whenever the
  // underlying file changes.
  const cacheBustedUrl = `${thumbUrl}?v=${Date.now()}`;

  const { error: urlUpdateError } = await admin
    .from("labs")
    .update({ thumbnail_url: cacheBustedUrl })
    .eq("id", labId);

  if (urlUpdateError) {
    return { error: urlUpdateError.message, stage: "save" };
  }

  return { url: cacheBustedUrl };
}

export async function createLab(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!(await isLabCreator(supabase, user.id))) {
    return { error: "Not authorized - instructor, creator, core team, or admin role required" };
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
  let thumbnailWarning: string | undefined;
  if (thumbnail && thumbnail.size > 0) {
    if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
      return { error: "Thumbnail too large. Maximum size is 5MB" };
    }
    const thumbExt = fileExtension(thumbnail.name);
    if (!THUMBNAIL_EXTENSIONS.has(thumbExt)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, or AVIF image." };
    }
    const result = await uploadLabThumbnail(admin, lab.id, thumbnail, thumbExt);
    if ("error" in result) {
      const verb = result.stage === "upload" ? "uploaded" : "saved";
      thumbnailWarning = `Lab created, but the thumbnail could not be ${verb}: ${result.error}`;
    }
  }

  revalidatePath(LABS_PATH);
  return { success: true, lab_id: lab.id, ...(thumbnailWarning ? { warning: thumbnailWarning } : {}) };
}

export async function updateLab(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Fetched once and reused below for the ownership-override check, instead
  // of isLabCreator() then isPlatformAdmin() as two separate calls -- both
  // resolve through the same getLabsAuthContext() lookup, so calling it
  // twice for one request was a redundant round trip.
  const authCtx = await getLabsAuthContext(supabase, user.id);
  if (!authCtx.canCreateLab) {
    return { error: "Not authorized - instructor, creator, core team, or admin role required" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing lab id" };
  }

  // Validated before the update below, since ownership is now enforced
  // directly in that update's WHERE clause rather than via a separate
  // lookup first -- see the comment there for why this also means
  // "Invalid input" can now surface before an ownership problem would,
  // where previously ownership was always checked first.
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

  // Ownership is enforced directly in this update's WHERE clause instead of
  // a separate SELECT beforehand: non-admins can only match a row they
  // created, platform admins can match by id alone. This trades away
  // telling "Lab not found" apart from "not your lab" -- both now come back
  // as no matched row, reported as one combined message below -- in
  // exchange for skipping the extra read every previous version of this
  // function did first.
  let updateQuery = admin
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

  if (!authCtx.isPlatformAdmin) {
    updateQuery = updateQuery.eq("created_by", user.id);
  }

  const { data: updatedRows, error: updateError } = await updateQuery.select("id");

  if (updateError) {
    return { error: updateError.message };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { error: "Lab not found, or you don't have permission to edit it" };
  }

  // Handle thumbnail update if provided
  const thumbnail = formData.get("thumbnail") as File | null;
  let thumbnailWarning: string | undefined;
  if (thumbnail && thumbnail.size > 0) {
    if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
      return { error: "Thumbnail too large. Maximum size is 5MB" };
    }
    const thumbExt = fileExtension(thumbnail.name);
    if (!THUMBNAIL_EXTENSIONS.has(thumbExt)) {
      return { error: "Invalid thumbnail type. Use a JPG, PNG, WEBP, or AVIF image." };
    }
    const result = await uploadLabThumbnail(admin, id, thumbnail, thumbExt);
    if ("error" in result) {
      const verb = result.stage === "upload" ? "uploaded" : "saved";
      thumbnailWarning = `Lab updated, but the thumbnail could not be ${verb}: ${result.error}`;
    }
  }

  revalidatePath(LABS_PATH);
  return { success: true, ...(thumbnailWarning ? { warning: thumbnailWarning } : {}) };
}

export async function deleteLab(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // See updateLab: fetched once and reused below instead of calling
  // isLabCreator() then isPlatformAdmin() separately.
  const authCtx = await getLabsAuthContext(supabase, user.id);
  if (!authCtx.canCreateLab) {
    return { error: "Not authorized - instructor, creator, core team, or admin role required" };
  }

  const id = (formData.get("id") as string) ?? "";

  if (!id) {
    return { error: "Missing lab id" };
  }

  const admin = createAdminClient();

  // Ownership is enforced directly in this SELECT's WHERE clause, same
  // trade as updateLab: non-admins only match a row they created, so a lab
  // that exists but isn't theirs comes back indistinguishable from one that
  // doesn't exist at all, and both report the one combined message below.
  // (Unlike updateLab this doesn't save a round trip -- thumbnail_url is
  // needed either way for the storage cleanup further down -- it's purely
  // about not having a separate ownership branch to keep in sync with the
  // query.)
  let existingQuery = admin.from("labs").select("created_by, thumbnail_url").eq("id", id);
  if (!authCtx.isPlatformAdmin) {
    existingQuery = existingQuery.eq("created_by", user.id);
  }
  const { data: existingLab } = await existingQuery.maybeSingle();

  if (!existingLab) {
    return { error: "Lab not found, or you don't have permission to delete it" };
  }

  // Collect version file URLs before deleting the lab row -- they hold the
  // storage object paths for instructions/starter code/tests/solution/resources.
  //
  // Intentionally sequential, NOT run concurrently with the delete below:
  // if lab_versions has an ON DELETE CASCADE FK to labs, a delete running
  // in parallel with this read could remove the version rows before this
  // SELECT captures their file URLs, orphaning the underlying storage
  // objects. The read must fully complete first.
  const { data: versions } = await admin
    .from("lab_versions")
    .select(
      "instructions_url, starter_code_url, test_file_url, solution_url, resources_url",
    )
    .eq("lab_id", id);

  const { error: deleteError } = await admin.from("labs").delete().eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const versionFileColumns = [
    "instructions_url",
    "starter_code_url",
    "test_file_url",
    "solution_url",
    "resources_url",
  ] as const;

  const objectsToRemove: string[] = [];
  if (existingLab.thumbnail_url) {
    // thumbnail_url carries a cache-busting "?v=..." query string (see
    // createLab/updateLab) -- strip it before treating this as a literal
    // storage object path, or removal would silently no-op against a path
    // that doesn't exist and orphan the real file.
    const thumbPath = existingLab.thumbnail_url.split("/course-files/")[1]?.split("?")[0];
    if (thumbPath) objectsToRemove.push(thumbPath);
  }

  for (const version of versions ?? []) {
    for (const column of versionFileColumns) {
      const url = version[column];
      if (!url) continue;
      const objectPath = url.split("/course-files/")[1]?.split("?")[0];
      if (objectPath) objectsToRemove.push(objectPath);
    }
  }

  if (objectsToRemove.length > 0) {
    await safeRemoveStorageObjects(admin, "course-files", objectsToRemove);
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

  // See updateLab: fetched once and reused below instead of calling
  // isLabCreator() then isPlatformAdmin() separately.
  const authCtx = await getLabsAuthContext(supabase, user.id);
  if (!authCtx.canCreateLab) {
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

  // Check that user is the lab creator, or a platform admin managing on
  // behalf of another creator
  const admin = createAdminClient();
  const { data: lab } = await admin
    .from("labs")
    .select("created_by")
    .eq("id", labId)
    .maybeSingle();

  if (!lab) {
    return { error: "Lab not found" };
  }

  if (lab.created_by !== user.id && !authCtx.isPlatformAdmin) {
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

  // See updateLab: fetched once and reused below instead of calling
  // isLabCreator() then isPlatformAdmin() separately.
  const authCtx = await getLabsAuthContext(supabase, user.id);
  if (!authCtx.canCreateLab) {
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

  // Check that user is the lab creator, or a platform admin managing on
  // behalf of another creator, and get the next version number
  const admin = createAdminClient();
  const { data: lab } = await admin
    .from("labs")
    .select("created_by")
    .eq("id", labId)
    .maybeSingle();

  if (!lab) {
    return { error: "Lab not found" };
  }

  if (lab.created_by !== user.id && !authCtx.isPlatformAdmin) {
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

  // NOTE: this stays sequential, after the content/answer-key processing
  // above. It's tempting to kick this query off earlier so it overlaps
  // with that processing (which can involve several awaited hashFlag calls),
  // but supabase-js's query builders are lazy thenables -- the request only
  // fires once something actually calls `.then()`/awaits it, so simply
  // assigning the builder to a variable now and awaiting it later would NOT
  // achieve any real concurrency. Doing this properly needs an explicit
  // Promise.resolve(...) wrap to force eager execution, which felt like
  // more cleverness than this file should carry silently -- flagging it as
  // a possible follow-up rather than shipping it unverified.
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

  // The publish check and the latest-version lookup are independent reads
  // (neither depends on the other's result) -- fetched concurrently rather
  // than one after the other. If the lab turns out unpublished, the fetched
  // version data is simply discarded below; nothing is returned to the
  // caller either way.
  const [{ data: lab }, { data: latestVersion }] = await Promise.all([
    admin.from("labs").select("id, is_published").eq("id", labId).maybeSingle(),
    admin
      .from("lab_versions")
      .select("id")
      .eq("lab_id", labId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!lab || !lab.is_published) {
    return { error: "Lab not found or not published" };
  }

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
    console.error("submitLabSolution: failed to save submission", submissionError);
    return { error: "Something went wrong while saving your submission. Please try again." };
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

  // Fetched concurrently: the version row carries no access decision by
  // itself -- it's simply left out of the response below if the lab turns
  // out to be inaccessible -- so there's no reason to wait for the lab read
  // to finish before starting this one.
  const [{ data: lab }, { data: version }] = await Promise.all([
    admin
      .from("labs")
      .select(
        "id, title, description, category, difficulty, type, estimated_duration_minutes, tags, thumbnail_url, is_published, published_at, created_by, created_at, updated_at",
      )
      .eq("id", labId)
      .maybeSingle(),
    // Explicit column list -- answer_key is deliberately never selected here.
    admin
      .from("lab_versions")
      .select(
        "id, lab_id, version_number, instructions_url, starter_code_url, test_file_url, solution_url, resources_url, content, created_by, created_at",
      )
      .eq("lab_id", labId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!lab) {
    return { error: "Lab not found" };
  }

  if (!lab.is_published) {
    if (!user) {
      return { error: "Lab not found" };
    }
    const isOwner = lab.created_by === user.id;
    if (!isOwner && !(await isPlatformAdmin(supabase, user.id))) {
      return { error: "Lab not found" };
    }
  }

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

  // Same reasoning as getLabWithContent: the version row (including
  // answer_key -- the only place in this file that selects it, and it
  // never leaves this function) is only used after the publish check
  // passes below, but fetching it concurrently rather than after costs
  // nothing extra on the common path and saves a round trip.
  const [{ data: lab }, { data: version }] = await Promise.all([
    admin.from("labs").select("id, is_published").eq("id", labId).maybeSingle(),
    admin
      .from("lab_versions")
      .select("id, content, answer_key")
      .eq("lab_id", labId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!lab || !lab.is_published) {
    return { error: "Lab not found or not published" };
  }

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
    console.error("submitLabAnswers: failed to save submission", submissionError);
    return { error: "Something went wrong while saving your submission. Please try again." };
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
  if (!isOwnLab && !(await isPlatformAdmin(supabase, user.id))) {
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

  // Whoever can create/manage labs can link them to courses (covers
  // core_team_member, instructor, creator, and platform admin). Previously
  // this also OR'd in the is_course_manager() RPC result, but that RPC is
  // unparameterized and relies on the same unreliable auth.uid() default
  // that caused the platform-admin detection bug -- canCreateLab already
  // covers every role is_course_manager() would have added here (creator,
  // core_team_member, admin), so it's dropped rather than duplicated.
  const canManageLab = await isLabCreator(supabase, user.id);
  if (!canManageLab) {
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

  const canManageLab = await isLabCreator(supabase, user.id);
  if (!canManageLab) {
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