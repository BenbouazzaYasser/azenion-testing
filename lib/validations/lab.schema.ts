import { z } from "zod";

export const LAB_CATEGORIES = [
  "Programming",
  "Web Development",
  "Backend",
  "Frontend",
  "Full Stack",
  "Data Science",
  "Machine Learning",
  "DevOps",
  "Cybersecurity",
  "Cloud",
  "Mobile",
  "Other",
] as const;

export const LAB_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

// The Lab "shape" (osint | linux | coding | ...), independent of
// LAB_CATEGORIES (subject domain, e.g. Cybersecurity/Programming above).
// Deliberately not a DB check constraint -- new types ship by adding a
// value here, no migration required.
export const LAB_TYPES = ["osint", "linux", "coding"] as const;

export type LabCategory = (typeof LAB_CATEGORIES)[number];
export type LabDifficulty = (typeof LAB_DIFFICULTIES)[number];
export type LabType = (typeof LAB_TYPES)[number];

export const labSchema = z.object({
  id: z.string().uuid("Invalid lab id"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be 5000 characters or less")
    .optional()
    .default(""),
  category: z.enum(LAB_CATEGORIES),
  difficulty: z.enum(LAB_DIFFICULTIES),
  estimated_duration_minutes: z
    .number()
    .int("Duration must be a whole number")
    .min(0, "Duration must be 0 or greater")
    .max(10000, "Duration must be 10000 minutes or less")
    .optional()
    .default(0),
  tags: z
    .array(z.string().trim().max(30, "Each tag must be 30 characters or less"))
    .max(10, "Maximum of 10 tags")
    .optional(),
  is_published: z.boolean().optional().default(false),
  // Nullable/optional: existing Labs predate this column, and not every
  // Lab is expected to declare a type immediately.
  type: z.enum(LAB_TYPES).nullable().optional(),
});

export type LabInput = z.infer<typeof labSchema>;

// ── Structured Lab content ──────────────────────────────────────────────
// A lab_versions.content value is `{ blocks: LabContentBlock[] }`. Blocks
// are learner-safe by construction -- no correct-answer data ever lives
// here. See lib/labs/grading.ts for how this is graded, and
// academy-labs.actions.ts for how it's authored/read.

const MAX_BLOCKS = 50;
const MAX_OPTIONS_PER_QUESTION = 12;
const MAX_HINTS_PER_QUESTION = 5;
const MAX_EVIDENCE_ITEMS = 20;

// Block/option/hint ids are referenced by answer keys and submissions, so
// they're restricted to a safe, predictable character set.
const blockIdSchema = z
  .string()
  .trim()
  .min(1, "Id is required")
  .max(64, "Id must be 64 characters or less")
  .regex(/^[a-zA-Z0-9_-]+$/, "Id may only contain letters, numbers, - and _");

const hintSchema = z.object({
  id: blockIdSchema,
  text: z.string().trim().min(1).max(500),
});

const instructionsBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("instructions"),
  body: z.string().trim().min(1, "Instructions body is required").max(20000),
});

const evidenceItemSchema = z.object({
  url: z.string().trim().url("Evidence item must be a valid URL").max(2000),
  caption: z.string().trim().max(300).optional(),
});

const evidenceBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("evidence"),
  items: z.array(evidenceItemSchema).min(1).max(MAX_EVIDENCE_ITEMS),
});

const qcmOptionSchema = z.object({
  id: blockIdSchema,
  text: z.string().trim().min(1).max(300),
});

const qcmQuestionBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("question"),
  question_type: z.literal("qcm"),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(qcmOptionSchema).min(2, "QCM needs at least 2 options").max(MAX_OPTIONS_PER_QUESTION),
  multi_select: z.boolean().default(false),
  hints: z.array(hintSchema).max(MAX_HINTS_PER_QUESTION).optional(),
});

const textAnswerQuestionBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("question"),
  question_type: z.literal("text_answer"),
  prompt: z.string().trim().min(1).max(2000),
  hints: z.array(hintSchema).max(MAX_HINTS_PER_QUESTION).optional(),
});

const flagQuestionBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("question"),
  question_type: z.literal("flag"),
  prompt: z.string().trim().min(1).max(2000),
  flag_format_hint: z.string().trim().max(200).optional(),
  case_sensitive: z.boolean().default(false),
  hints: z.array(hintSchema).max(MAX_HINTS_PER_QUESTION).optional(),
});

// Not a discriminatedUnion: qcm/text_answer/flag all share type:"question",
// so "type" alone can't discriminate them (discriminatedUnion requires a
// distinct literal per member). question_type discriminates within
// questions instead; a plain union resolves the outer type unambiguously
// since instructions/evidence/question are themselves distinct literals.
const questionBlockSchema = z.union([
  qcmQuestionBlockSchema,
  textAnswerQuestionBlockSchema,
  flagQuestionBlockSchema,
]);

const contentBlockSchema = z.union([instructionsBlockSchema, evidenceBlockSchema, questionBlockSchema]);

export const labContentSchema = z
  .object({
    blocks: z.array(contentBlockSchema).min(1, "At least one block is required").max(MAX_BLOCKS),
  })
  .refine(
    (data) => {
      const ids = data.blocks.map((b) => b.id);
      return new Set(ids).size === ids.length;
    },
    { message: "Block ids must be unique within a lab version" },
  );

export type LabContentBlock = z.infer<typeof contentBlockSchema>;
export type LabQuestionBlock = z.infer<typeof questionBlockSchema>;
export type LabContent = z.infer<typeof labContentSchema>;

// ── Answer input (instructor-authored, plaintext) ───────────────────────
// What an instructor submits when authoring a version's answer key. Flags
// are plaintext here only in transit from the instructor's own request --
// academy-labs.actions.ts hashes them server-side before anything is
// persisted; this shape is never stored or returned as-is.

const qcmAnswerInputSchema = z.object({
  question_type: z.literal("qcm"),
  correct_option_ids: z.array(blockIdSchema).min(1).max(MAX_OPTIONS_PER_QUESTION),
});

const textAnswerAnswerInputSchema = z.object({
  question_type: z.literal("text_answer"),
  match_mode: z.enum(["exact", "exact_ci", "contains"]),
  accepted: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
});

const flagAnswerInputSchema = z.object({
  question_type: z.literal("flag"),
  expected_flag: z.string().trim().min(1).max(300),
});

export const labAnswerInputSchema = z.record(
  z.string(),
  z.union([qcmAnswerInputSchema, textAnswerAnswerInputSchema, flagAnswerInputSchema]),
);

export type LabAnswerInput = z.infer<typeof labAnswerInputSchema>;

// ── Answer key (stored, server-computed) ────────────────────────────────
// What's actually persisted to lab_versions.answer_key. Flags carry only a
// hash. Not every question needs an entry -- an absent entry means that
// question requires manual instructor grading (see lib/labs/grading.ts).

const qcmAnswerKeyEntrySchema = z.object({
  question_type: z.literal("qcm"),
  correct_option_ids: z.array(z.string()),
});

const textAnswerAnswerKeyEntrySchema = z.object({
  question_type: z.literal("text_answer"),
  match_mode: z.enum(["exact", "exact_ci", "contains"]),
  accepted: z.array(z.string()),
});

const flagAnswerKeyEntrySchema = z.object({
  question_type: z.literal("flag"),
  flag_hash: z.string(),
});

const answerKeyEntrySchema = z.union([
  qcmAnswerKeyEntrySchema,
  textAnswerAnswerKeyEntrySchema,
  flagAnswerKeyEntrySchema,
]);

export const labAnswerKeySchema = z.record(z.string(), answerKeyEntrySchema);

export type LabAnswerKeyEntry = z.infer<typeof answerKeyEntrySchema>;
export type LabAnswerKey = z.infer<typeof labAnswerKeySchema>;

// ── Submitted answers (learner-authored, untrusted) ─────────────────────
// What a learner posts to submitLabAnswers. Structural validation only --
// cross-checking against the actual question ids/types for a given lab
// version happens in lib/labs/grading.ts (validateSubmittedAnswers), since
// that requires the version's content, not just the shape of the answers.

const qcmSubmittedAnswerSchema = z.object({
  question_type: z.literal("qcm"),
  option_ids: z.array(z.string().trim().min(1).max(64)).min(1).max(MAX_OPTIONS_PER_QUESTION),
});

const textAnswerSubmittedAnswerSchema = z.object({
  question_type: z.literal("text_answer"),
  text: z.string().trim().min(1).max(1000),
});

const flagSubmittedAnswerSchema = z.object({
  question_type: z.literal("flag"),
  flag: z.string().trim().min(1).max(300),
});

const submittedAnswerEntrySchema = z.union([
  qcmSubmittedAnswerSchema,
  textAnswerSubmittedAnswerSchema,
  flagSubmittedAnswerSchema,
]);

export const labSubmittedAnswersSchema = z
  .record(z.string(), submittedAnswerEntrySchema)
  .refine((data) => Object.keys(data).length <= MAX_BLOCKS, {
    message: "Too many answers submitted",
  });

export type LabSubmittedAnswerEntry = z.infer<typeof submittedAnswerEntrySchema>;
export type LabSubmittedAnswers = z.infer<typeof labSubmittedAnswersSchema>;

export interface LabRow {
  id: string;
  title: string;
  description: string | null;
  category: LabCategory;
  difficulty: LabDifficulty;
  type: LabType | null;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  is_published: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Learner/client-facing shape of a lab version. `answer_key` is
// intentionally NOT part of this interface -- it must never be read on
// the public/learner Lab-fetch path (enforced at the DB layer too, via a
// column-level REVOKE for anon/authenticated). Server-side grading code
// that legitimately needs answer_key should select it explicitly through
// the service-role client rather than relying on this type.
export interface LabVersionRow {
  id: string;
  lab_id: string;
  version_number: number;
  instructions_url: string | null;
  starter_code_url: string | null;
  test_file_url: string | null;
  solution_url: string | null;
  resources_url: string | null;
  // Structured lab content (instructions/evidence/question blocks).
  // Older versions predate this column and will have `content: null`.
  content: LabContent | null;
  created_by: string;
  created_at: string;
}

export interface LabSubmissionRow {
  id: string;
  lab_id: string;
  user_id: string;
  lab_version_id: string;
  status: "in_progress" | "submitted" | "passed" | "failed";
  submission_url: string | null;
  // Structured per-question learner answers, keyed to match the
  // corresponding lab_versions.content question block ids.
  answers: LabSubmittedAnswers | null;
  test_results: Record<string, any> | null;
  feedback_url: string | null;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Many-to-many Course <-> Lab link. No progress/unlock fields by design.
export interface CourseLabRow {
  course_id: string;
  lab_id: string;
  added_by: string | null;
  created_at: string;
}
