"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Tag,
  FileText,
  Download,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock3,
  Flag as FlagIcon,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/components/layout/page-hero";
import { submitLabAnswers } from "@/actions/academy-labs.actions";
import type { LabContent, LabQuestionBlock, LabCategory, LabDifficulty, LabType } from "@/lib/validations/lab.schema";
import { labTypeMeta, difficultyClass } from "./lab-type-meta";

// Matches exactly what getLabWithContent() selects and returns -- narrower
// than the full LabRow (e.g. no archived_at, which that action doesn't
// select since it isn't needed on the learner-facing read path).
export interface PlayerLab {
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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerVersion {
  id: string;
  version_number: number;
  instructions_url: string | null;
  starter_code_url: string | null;
  resources_url: string | null;
  content: LabContent | null;
}

export interface PlayerSubmission {
  status: "in_progress" | "submitted" | "passed" | "failed";
  score: number | null;
  test_results: {
    per_question?: { question_id: string; correct: boolean | null; graded: string }[];
  } | null;
}

interface LabPlayerProps {
  lab: PlayerLab;
  version: PlayerVersion | null;
  initialSubmission: PlayerSubmission | null;
  isAuthenticated: boolean;
}

type Answer =
  | { question_type: "qcm"; option_ids: string[] }
  | { question_type: "text_answer"; text: string }
  | { question_type: "flag"; flag: string };

export function LabPlayer({ lab, version, initialSubmission, isAuthenticated }: LabPlayerProps) {
  const router = useRouter();
  const meta = labTypeMeta(lab.type);
  const Icon = meta.icon;

  const blocks = useMemo(() => version?.content?.blocks ?? [], [version]);
  const questionBlocks = useMemo(() => blocks.filter((b): b is LabQuestionBlock => b.type === "question"), [blocks]);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [revealedHints, setRevealedHints] = useState<Set<string>>(new Set());
  const [submission, setSubmission] = useState<PlayerSubmission | null>(initialSubmission);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [validationError, setValidationError] = useState<string | null>(null);

  const perQuestionResult = useMemo(() => {
    const map = new Map<string, { correct: boolean | null; graded: string }>();
    for (const r of submission?.test_results?.per_question ?? []) {
      map.set(r.question_id, { correct: r.correct, graded: r.graded });
    }
    return map;
  }, [submission]);

  function toggleHint(id: string) {
    setRevealedHints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setQcmAnswer(block: Extract<LabQuestionBlock, { question_type: "qcm" }>, optionId: string) {
    setAnswers((prev) => {
      const current = prev[block.id];
      const currentIds = current?.question_type === "qcm" ? current.option_ids : [];
      let nextIds: string[];
      if (block.multi_select) {
        nextIds = currentIds.includes(optionId) ? currentIds.filter((i) => i !== optionId) : [...currentIds, optionId];
      } else {
        nextIds = [optionId];
      }
      return { ...prev, [block.id]: { question_type: "qcm", option_ids: nextIds } };
    });
  }

  function setTextAnswer(id: string, text: string) {
    setAnswers((prev) => ({ ...prev, [id]: { question_type: "text_answer", text } }));
  }

  function setFlagAnswer(id: string, flag: string) {
    setAnswers((prev) => ({ ...prev, [id]: { question_type: "flag", flag } }));
  }

  function handleSubmit() {
    setValidationError(null);
    setSubmitError(null);

    // Client-side completeness check for a good UX -- the server remains
    // the sole source of truth for correctness and never trusts this.
    const unanswered = questionBlocks.filter((q) => {
      const a = answers[q.id];
      if (!a) return true;
      if (a.question_type === "qcm") return a.option_ids.length === 0;
      if (a.question_type === "text_answer") return a.text.trim().length === 0;
      if (a.question_type === "flag") return a.flag.trim().length === 0;
      return true;
    });
    if (unanswered.length > 0) {
      setValidationError(`Please answer all ${questionBlocks.length} questions before submitting.`);
      return;
    }

    startTransition(async () => {
      const result = await submitLabAnswers(lab.id, answers);
      if (!result) return;
      if ("error" in result) {
        if (result.error) setSubmitError(result.error);
        return;
      }
      setSubmission({ status: result.status, score: result.score, test_results: result.test_results });
      router.refresh();
    });
  }

  const alreadyPassed = submission?.status === "passed";
  const awaitingReview = submission?.status === "submitted";
  const previouslyFailed = submission?.status === "failed";

  return (
    <>
      <PageHero variant="academy" slug="academy" atmosphere={false}>
        <Reveal>
          <Link
            href="/academy/labs"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500 transition-colors hover:text-accent-300"
          >
            <ArrowLeft size={13} />
            All Labs
          </Link>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-6 flex justify-center">
            <span className={cn("flex h-16 w-16 items-center justify-center rounded-2xl border shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]", meta.iconClass)}>
              <Icon size={28} />
            </span>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mt-6 text-balance text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-ink-50 sm:text-[2.75rem]">
            {lab.title}
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-400">{meta.label}</span>
            <span className="rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1 text-xs font-medium text-accent-300">{lab.category}</span>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", difficultyClass(lab.difficulty))}>{lab.difficulty}</span>
            {lab.estimated_duration_minutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-400">
                <Clock size={12} />
                {lab.estimated_duration_minutes} min
              </span>
            ) : null}
          </div>
        </Reveal>

        {lab.description ? (
          <Reveal delay={180}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-[1.02rem] leading-relaxed text-ink-400">{lab.description}</p>
          </Reveal>
        ) : null}

        {lab.tags && lab.tags.length > 0 ? (
          <Reveal delay={220}>
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {lab.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[11px] text-ink-500">
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>
        ) : null}
      </PageHero>

      <section className="relative pb-24 pt-4 sm:pb-28">
        <div className="mx-auto max-w-[720px] px-5 sm:px-8">
          {alreadyPassed ? (
            <Reveal>
              <StatusBanner
                icon={CheckCircle2}
                tone="success"
                title="Completed"
                message="You've already passed this lab. You can review it below, and resubmit any time if you want to try again."
                score={submission?.score ?? null}
              />
            </Reveal>
          ) : awaitingReview ? (
            <Reveal>
              <StatusBanner
                icon={Clock3}
                tone="pending"
                title="Submission received"
                message="Your lab is awaiting instructor review. You'll be notified once it's graded."
              />
            </Reveal>
          ) : previouslyFailed ? (
            <Reveal>
              <StatusBanner
                icon={XCircle}
                tone="failed"
                title="Not passed yet"
                message="Some answers weren't correct. Review the feedback below and try again whenever you're ready."
                score={submission?.score ?? null}
              />
            </Reveal>
          ) : null}

          {!version ? (
            <Reveal delay={80}>
              <div className="mt-8 rounded-2xl card-surface-soft px-6 py-10 text-center shadow-card backdrop-blur-xl">
                <p className="text-sm text-ink-400">This lab doesn&apos;t have published content yet. Check back soon.</p>
              </div>
            </Reveal>
          ) : (
            <>
              <div className="mt-8 space-y-5">
                {blocks.map((block, i) => (
                  <Reveal key={block.id} delay={80 + i * 40}>
                    {block.type === "instructions" ? <InstructionsBlock body={block.body} /> : null}
                    {block.type === "evidence" ? <EvidenceBlock items={block.items} /> : null}
                    {block.type === "question" ? (
                      <QuestionBlockView
                        block={block}
                        answer={answers[block.id]}
                        onQcmToggle={(optionId) => setQcmAnswer(block as Extract<LabQuestionBlock, { question_type: "qcm" }>, optionId)}
                        onTextChange={(text) => setTextAnswer(block.id, text)}
                        onFlagChange={(flag) => setFlagAnswer(block.id, flag)}
                        hintsRevealed={revealedHints}
                        onToggleHint={toggleHint}
                        result={perQuestionResult.get(block.id) ?? null}
                        showResult={Boolean(submission)}
                      />
                    ) : null}
                  </Reveal>
                ))}
              </div>

              <ResourcesSection version={version} />

              {questionBlocks.length > 0 ? (
                <Reveal delay={80 + blocks.length * 40}>
                  <div className="mt-8 rounded-2xl card-surface-soft p-6 shadow-card backdrop-blur-xl">
                    {!isAuthenticated ? (
                      <p className="text-center text-sm text-ink-400">
                        <Link href="/login" className="font-medium text-accent-300 hover:underline">
                          Sign in
                        </Link>{" "}
                        to submit your answers.
                      </p>
                    ) : (
                      <>
                        {validationError ? (
                          <p role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                            {validationError}
                          </p>
                        ) : null}
                        {submitError ? (
                          <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {submitError}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isPending}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-medium text-white shadow-glow-sm transition-all duration-300 ease-premium hover:bg-accent-glow hover:shadow-glow disabled:pointer-events-none disabled:opacity-50"
                        >
                          {isPending ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit answers"
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </Reveal>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function StatusBanner({
  icon: Icon,
  tone,
  title,
  message,
  score,
}: {
  icon: typeof CheckCircle2;
  tone: "success" | "pending" | "failed";
  title: string;
  message: string;
  score?: number | null;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "pending"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-5 py-4", toneClass)}>
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{title}</p>
          {typeof score === "number" ? <span className="text-sm font-semibold tabular-nums">{score}%</span> : null}
        </div>
        <p className="mt-0.5 text-sm text-ink-300">{message}</p>
      </div>
    </div>
  );
}

function InstructionsBlock({ body }: { body: string }) {
  return (
    <div className="rounded-2xl card-surface-soft p-6 shadow-card backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        <FileText size={13} />
        Instructions
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-200">{body}</p>
    </div>
  );
}

function EvidenceBlock({ items }: { items: { url: string; caption?: string }[] }) {
  return (
    <div className="rounded-2xl card-surface-soft p-6 shadow-card backdrop-blur-xl">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Evidence</div>
      <div className={cn("grid gap-4", items.length > 1 ? "sm:grid-cols-2" : "")}>
        {items.map((item, i) => (
          <figure key={i} className="overflow-hidden rounded-xl border border-border-strong bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.caption ?? "Evidence item"} className="w-full object-contain" />
            {item.caption ? (
              <figcaption className="border-t border-border px-3 py-2 text-xs text-ink-400">{item.caption}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  );
}

function ResourcesSection({ version }: { version: PlayerVersion }) {
  // Only learner-facing files: instructions, starter code, general
  // resources. solution_url / test_file_url are never even passed down
  // from the server component, so there's nothing to filter out here --
  // this section simply can't render them.
  const items = [
    version.instructions_url ? { label: "Instructions", url: version.instructions_url } : null,
    version.starter_code_url ? { label: "Starter files", url: version.starter_code_url } : null,
    version.resources_url ? { label: "Resources", url: version.resources_url } : null,
  ].filter((i): i is { label: string; url: string } => i !== null);

  if (items.length === 0) return null;

  return (
    <Reveal>
      <div className="mt-5 rounded-2xl card-surface-soft p-6 shadow-card backdrop-blur-xl">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Resources</div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 py-2 text-xs font-medium text-ink-300 transition-colors hover:border-accent-400/40 hover:text-accent-300"
            >
              <Download size={12} />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function QuestionBlockView({
  block,
  answer,
  onQcmToggle,
  onTextChange,
  onFlagChange,
  hintsRevealed,
  onToggleHint,
  result,
  showResult,
}: {
  block: LabQuestionBlock;
  answer: Answer | undefined;
  onQcmToggle: (optionId: string) => void;
  onTextChange: (text: string) => void;
  onFlagChange: (flag: string) => void;
  hintsRevealed: Set<string>;
  onToggleHint: (id: string) => void;
  result: { correct: boolean | null; graded: string } | null;
  showResult: boolean;
}) {
  return (
    <fieldset className="rounded-2xl card-surface-soft p-6 shadow-card backdrop-blur-xl">
      <legend className="flex w-full items-start justify-between gap-3 pb-3 text-[0.95rem] font-medium text-ink-50">
        <span>{block.prompt}</span>
        {showResult && result ? <ResultBadge result={result} /> : null}
      </legend>

      {block.question_type === "qcm" ? (
        <div className="space-y-2">
          {block.options.map((option) => {
            const selected = answer?.question_type === "qcm" && answer.option_ids.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                  selected ? "border-accent-400/60 bg-accent/[0.08] text-ink-50" : "border-border-strong text-ink-300 hover:border-accent-400/30",
                )}
              >
                <input
                  type={block.multi_select ? "checkbox" : "radio"}
                  name={block.id}
                  checked={Boolean(selected)}
                  onChange={() => onQcmToggle(option.id)}
                  className="h-4 w-4 shrink-0 accent-accent-400"
                />
                {option.text}
              </label>
            );
          })}
        </div>
      ) : null}

      {block.question_type === "text_answer" ? (
        <input
          type="text"
          value={answer?.question_type === "text_answer" ? answer.text : ""}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Your answer"
          aria-label={block.prompt}
          className="w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input"
        />
      ) : null}

      {block.question_type === "flag" ? (
        <div>
          <div className="relative">
            <FlagIcon size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              value={answer?.question_type === "flag" ? answer.flag : ""}
              onChange={(e) => onFlagChange(e.target.value)}
              placeholder={block.flag_format_hint || "AZN{...}"}
              aria-label={block.prompt}
              className="w-full rounded-xl bg-surface py-3 pl-11 pr-4 font-mono text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input"
            />
          </div>
          {!block.case_sensitive ? <p className="mt-1.5 text-xs text-ink-600">Not case-sensitive.</p> : null}
        </div>
      ) : null}

      {block.hints && block.hints.length > 0 ? (
        <div className="mt-4 space-y-1.5 border-t border-border pt-3">
          {block.hints.map((hint) => {
            const revealed = hintsRevealed.has(hint.id);
            return (
              <div key={hint.id}>
                <button
                  type="button"
                  onClick={() => onToggleHint(hint.id)}
                  aria-expanded={revealed}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-accent-300"
                >
                  <Lightbulb size={12} />
                  {revealed ? "Hide hint" : "Show hint"}
                </button>
                {revealed ? <p className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-xs text-ink-300">{hint.text}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

function ResultBadge({ result }: { result: { correct: boolean | null; graded: string } }) {
  if (result.graded === "manual_pending") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
        <Clock3 size={11} />
        Pending review
      </span>
    );
  }
  if (result.correct) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
        <CheckCircle2 size={11} />
        Correct
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
      <XCircle size={11} />
      Incorrect
    </span>
  );
}
