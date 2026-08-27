// Pure, side-effect-free grading logic for structured Lab questions
// (QCM / text-answer / flag). Kept separate from academy-labs.actions.ts
// (a "use server" file, which may only export async functions) so this
// logic stays easy to read and unit test in isolation. All server-side
// authorization, database access, and Activities integration live in the
// actions file -- this module never talks to Supabase or the network.

import type {
  LabAnswerKey,
  LabAnswerKeyEntry,
  LabContentBlock,
  LabQuestionBlock,
  LabSubmittedAnswers,
  LabSubmittedAnswerEntry,
} from "@/lib/validations/lab.schema";

// ── Flag hashing ─────────────────────────────────────────────────────────
// Flags are never stored or compared in plaintext. The same normalization
// + hash function is used both when an instructor authors a flag
// (academy-labs.actions.ts transforms their plaintext input into a hash
// before it's stored) and when a learner submits one, so the two sides
// always agree.

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeFlag(raw: string, caseSensitive: boolean): string {
  const trimmed = raw.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

export async function hashFlag(raw: string, caseSensitive: boolean): Promise<string> {
  return `sha256:${await sha256Hex(normalizeFlag(raw, caseSensitive))}`;
}

// ── Text-answer matching ─────────────────────────────────────────────────

function textAnswerCorrect(
  submitted: string,
  accepted: string[],
  matchMode: "exact" | "exact_ci" | "contains",
): boolean {
  const s = submitted.trim();
  return accepted.some((raw) => {
    const a = raw.trim();
    switch (matchMode) {
      case "exact":
        return s === a;
      case "exact_ci":
        return s.toLowerCase() === a.toLowerCase();
      case "contains":
        return s.toLowerCase().includes(a.toLowerCase());
      default:
        return false;
    }
  });
}

// ── QCM matching ──────────────────────────────────────────────────────────

function qcmCorrect(submittedIds: string[], correctIds: string[], multiSelect: boolean): boolean {
  if (!multiSelect && submittedIds.length !== 1) return false;
  const a = new Set(submittedIds);
  const b = new Set(correctIds);
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

// ── Submission structural validation ────────────────────────────────────
// Cross-checks the learner's submitted answers against the actual question
// blocks for this lab version: unknown question ids, type mismatches,
// unknown option ids, and single-select violations are all rejected here
// before any grading happens.

export function validateSubmittedAnswers(
  questionBlocks: LabQuestionBlock[],
  submitted: LabSubmittedAnswers,
): { ok: true } | { ok: false; error: string } {
  const blocksById = new Map(questionBlocks.map((b) => [b.id, b]));

  for (const [qid, answer] of Object.entries(submitted)) {
    const block = blocksById.get(qid);
    if (!block) {
      return { ok: false, error: `Unknown question id: ${qid}` };
    }
    if (block.question_type !== answer.question_type) {
      return { ok: false, error: `Answer type mismatch for question ${qid}` };
    }
    if (block.question_type === "qcm" && answer.question_type === "qcm") {
      if (!block.multi_select && answer.option_ids.length !== 1) {
        return { ok: false, error: `Question ${qid} only accepts a single option` };
      }
      const validOptionIds = new Set(block.options.map((o) => o.id));
      for (const oid of answer.option_ids) {
        if (!validOptionIds.has(oid)) {
          return { ok: false, error: `Invalid option id for question ${qid}` };
        }
      }
    }
  }

  return { ok: true };
}

// ── Grading orchestration ───────────────────────────────────────────────

export interface QuestionGradeResult {
  question_id: string;
  question_type: "qcm" | "text_answer" | "flag";
  graded: "auto" | "manual_pending";
  correct: boolean | null;
}

export interface GradeSummary {
  results: QuestionGradeResult[];
  allAutoGraded: boolean;
  autoCorrectCount: number;
  autoGradableCount: number;
}

/**
 * Grades every question block against the stored answer key and the
 * learner's submitted answers. A question with no answer_key entry is
 * always treated as requiring manual instructor review, regardless of its
 * type -- this is what allows "not every Lab needs automatic grading" at
 * the per-question level.
 */
export async function gradeSubmission(
  questionBlocks: LabQuestionBlock[],
  answerKey: LabAnswerKey,
  submitted: LabSubmittedAnswers,
): Promise<GradeSummary> {
  const results: QuestionGradeResult[] = [];
  let allAutoGraded = true;
  let autoCorrectCount = 0;
  let autoGradableCount = 0;

  for (const block of questionBlocks) {
    const key: LabAnswerKeyEntry | undefined = answerKey[block.id];

    if (!key) {
      allAutoGraded = false;
      results.push({
        question_id: block.id,
        question_type: block.question_type,
        graded: "manual_pending",
        correct: null,
      });
      continue;
    }

    autoGradableCount += 1;

    const answer: LabSubmittedAnswerEntry | undefined = submitted[block.id];
    let correct = false;

    if (!answer) {
      // Auto-gradable question left unanswered -- counts as incorrect.
      correct = false;
    } else if (block.question_type === "qcm" && key.question_type === "qcm" && answer.question_type === "qcm") {
      correct = qcmCorrect(answer.option_ids, key.correct_option_ids, block.multi_select);
    } else if (
      block.question_type === "text_answer" &&
      key.question_type === "text_answer" &&
      answer.question_type === "text_answer"
    ) {
      correct = textAnswerCorrect(answer.text, key.accepted, key.match_mode);
    } else if (block.question_type === "flag" && key.question_type === "flag" && answer.question_type === "flag") {
      const hash = await hashFlag(answer.flag, block.case_sensitive);
      correct = hash === key.flag_hash;
    } else {
      // Stored answer_key doesn't match this question's type -- treat as
      // incorrect rather than throwing, and still count it as "auto"
      // since a definitive (negative) determination was made.
      correct = false;
    }

    if (correct) autoCorrectCount += 1;
    results.push({
      question_id: block.id,
      question_type: block.question_type,
      graded: "auto",
      correct,
    });
  }

  return { results, allAutoGraded, autoCorrectCount, autoGradableCount };
}

export function questionBlocksOf(blocks: LabContentBlock[]): LabQuestionBlock[] {
  return blocks.filter((b): b is LabQuestionBlock => b.type === "question");
}
