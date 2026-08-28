"use client";

import { useState } from "react";
import { FileText, ImagePlus, ListChecks, Type, Flag, Lightbulb, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Draft block shapes ──────────────────────────────────────────────────
// Local editing state only. serializeDraftBlocks() below converts this
// into the exact { content, answerInput } shape createLabVersion expects
// (matching lib/validations/lab.schema.ts). Keeping the two shapes
// separate here mirrors the backend split between learner-safe content
// and the instructor-only answer key.

interface DraftInstructions {
  uid: string;
  kind: "instructions";
  body: string;
}

interface DraftEvidenceItem {
  uid: string;
  url: string;
  caption: string;
}

interface DraftEvidence {
  uid: string;
  kind: "evidence";
  items: DraftEvidenceItem[];
}

interface DraftOption {
  uid: string;
  text: string;
  correct: boolean;
}

interface DraftQcm {
  uid: string;
  kind: "qcm";
  prompt: string;
  multiSelect: boolean;
  options: DraftOption[];
  hints: string[];
}

interface DraftTextAnswer {
  uid: string;
  kind: "text_answer";
  prompt: string;
  matchMode: "exact" | "exact_ci" | "contains";
  accepted: string[];
  manualOnly: boolean;
  hints: string[];
}

interface DraftFlag {
  uid: string;
  kind: "flag";
  prompt: string;
  expectedFlag: string;
  caseSensitive: boolean;
  hints: string[];
}

export type DraftBlock = DraftInstructions | DraftEvidence | DraftQcm | DraftTextAnswer | DraftFlag;

let uidCounter = 0;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${uidCounter}`;
}

export function emptyInstructions(): DraftInstructions {
  return { uid: nextUid("blk"), kind: "instructions", body: "" };
}
export function emptyEvidence(): DraftEvidence {
  return { uid: nextUid("blk"), kind: "evidence", items: [{ uid: nextUid("ev"), url: "", caption: "" }] };
}
export function emptyQcm(): DraftQcm {
  return {
    uid: nextUid("q"),
    kind: "qcm",
    prompt: "",
    multiSelect: false,
    options: [
      { uid: nextUid("o"), text: "", correct: false },
      { uid: nextUid("o"), text: "", correct: false },
    ],
    hints: [],
  };
}
export function emptyTextAnswer(): DraftTextAnswer {
  return { uid: nextUid("q"), kind: "text_answer", prompt: "", matchMode: "exact_ci", accepted: [""], manualOnly: false, hints: [] };
}
export function emptyFlag(): DraftFlag {
  return { uid: nextUid("q"), kind: "flag", prompt: "", expectedFlag: "", caseSensitive: false, hints: [] };
}

// ── Serialization: draft state -> { content, answerInput } ─────────────
// Matches labContentSchema / labAnswerInputSchema exactly. A question is
// only included in answerInput when it actually has a usable key (a
// checked QCM option, at least one accepted text answer, or a non-empty
// flag) -- a question left without one is simply left out of answerInput,
// which is precisely what makes it "manual grading" server-side.

export function serializeDraftBlocks(blocks: DraftBlock[]): {
  content: { blocks: unknown[] };
  answerInput: Record<string, unknown>;
} {
  const contentBlocks: unknown[] = [];
  const answerInput: Record<string, unknown> = {};

  for (const block of blocks) {
    if (block.kind === "instructions") {
      if (!block.body.trim()) continue;
      contentBlocks.push({ id: block.uid, type: "instructions", body: block.body.trim() });
    } else if (block.kind === "evidence") {
      const items = block.items.filter((i) => i.url.trim()).map((i) => ({
        url: i.url.trim(),
        ...(i.caption.trim() ? { caption: i.caption.trim() } : {}),
      }));
      if (items.length === 0) continue;
      contentBlocks.push({ id: block.uid, type: "evidence", items });
    } else if (block.kind === "qcm") {
      if (!block.prompt.trim()) continue;
      const options = block.options.filter((o) => o.text.trim());
      if (options.length < 2) continue;
      contentBlocks.push({
        id: block.uid,
        type: "question",
        question_type: "qcm",
        prompt: block.prompt.trim(),
        multi_select: block.multiSelect,
        options: options.map((o) => ({ id: o.uid, text: o.text.trim() })),
        ...(block.hints.filter(Boolean).length > 0
          ? { hints: block.hints.filter(Boolean).map((h, i) => ({ id: `${block.uid}-h${i}`, text: h })) }
          : {}),
      });
      const correctIds = options.filter((o) => o.correct).map((o) => o.uid);
      if (correctIds.length > 0) {
        answerInput[block.uid] = { question_type: "qcm", correct_option_ids: correctIds };
      }
    } else if (block.kind === "text_answer") {
      if (!block.prompt.trim()) continue;
      contentBlocks.push({
        id: block.uid,
        type: "question",
        question_type: "text_answer",
        prompt: block.prompt.trim(),
        ...(block.hints.filter(Boolean).length > 0
          ? { hints: block.hints.filter(Boolean).map((h, i) => ({ id: `${block.uid}-h${i}`, text: h })) }
          : {}),
      });
      const accepted = block.accepted.map((a) => a.trim()).filter(Boolean);
      if (!block.manualOnly && accepted.length > 0) {
        answerInput[block.uid] = { question_type: "text_answer", match_mode: block.matchMode, accepted };
      }
    } else if (block.kind === "flag") {
      if (!block.prompt.trim()) continue;
      contentBlocks.push({
        id: block.uid,
        type: "question",
        question_type: "flag",
        prompt: block.prompt.trim(),
        case_sensitive: block.caseSensitive,
        ...(block.hints.filter(Boolean).length > 0
          ? { hints: block.hints.filter(Boolean).map((h, i) => ({ id: `${block.uid}-h${i}`, text: h })) }
          : {}),
      });
      if (block.expectedFlag.trim()) {
        answerInput[block.uid] = { question_type: "flag", expected_flag: block.expectedFlag.trim() };
      }
    }
  }

  return { content: { blocks: contentBlocks }, answerInput };
}

// ── Hydration: existing LabContent -> draft state ───────────────────────
// Used when opening the Edit dialog for a lab that already has a version.
// Generates fresh uids rather than reusing the stored block/option ids --
// reusing them could collide with ids the nextUid() counter hands out to
// newly-added blocks later in the same session, which would break the
// uniqueness labContentSchema requires. Block ids aren't meant to be
// stable across versions anyway. Correct answers/flags are deliberately
// left blank -- answer_key is never sent to the client, so there is
// nothing to pre-fill there; the instructor must re-specify them when
// authoring a new version, which the dialog calls out explicitly.
export function hydrateDraftBlocks(content: { blocks: unknown[] } | null | undefined): DraftBlock[] {
  if (!content || !Array.isArray(content.blocks)) return [];

  return content.blocks
    .map((raw): DraftBlock | null => {
      const b = raw as Record<string, any>;
      if (b.type === "instructions") {
        return { uid: nextUid("blk"), kind: "instructions", body: b.body ?? "" };
      }
      if (b.type === "evidence") {
        const items = Array.isArray(b.items) ? b.items : [];
        return {
          uid: nextUid("blk"),
          kind: "evidence",
          items:
            items.length > 0
              ? items.map((i: any) => ({ uid: nextUid("ev"), url: i.url ?? "", caption: i.caption ?? "" }))
              : [{ uid: nextUid("ev"), url: "", caption: "" }],
        };
      }
      if (b.type === "question" && b.question_type === "qcm") {
        const options = Array.isArray(b.options) ? b.options : [];
        return {
          uid: nextUid("q"),
          kind: "qcm",
          prompt: b.prompt ?? "",
          multiSelect: Boolean(b.multi_select),
          options: options.map((o: any) => ({ uid: nextUid("o"), text: o.text ?? "", correct: false })),
          hints: Array.isArray(b.hints) ? b.hints.map((h: any) => h.text ?? "") : [],
        };
      }
      if (b.type === "question" && b.question_type === "text_answer") {
        return {
          uid: nextUid("q"),
          kind: "text_answer",
          prompt: b.prompt ?? "",
          matchMode: "exact_ci",
          accepted: [""],
          manualOnly: true,
          hints: Array.isArray(b.hints) ? b.hints.map((h: any) => h.text ?? "") : [],
        };
      }
      if (b.type === "question" && b.question_type === "flag") {
        return {
          uid: nextUid("q"),
          kind: "flag",
          prompt: b.prompt ?? "",
          expectedFlag: "",
          caseSensitive: Boolean(b.case_sensitive),
          hints: Array.isArray(b.hints) ? b.hints.map((h: any) => h.text ?? "") : [],
        };
      }
      return null;
    })
    .filter((b): b is DraftBlock => b !== null);
}

const cardClass = "rounded-xl border border-border-strong bg-surface p-4";
const smallInputClass =
  "w-full rounded-lg bg-surface-hover px-3 py-2 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:ring-1 focus:ring-accent-400/40";
const smallLabelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500";

interface LabContentEditorProps {
  blocks: DraftBlock[];
  onChange: (blocks: DraftBlock[]) => void;
}

export function LabContentEditor({ blocks, onChange }: LabContentEditorProps) {
  function update(uid: string, patch: (block: DraftBlock) => DraftBlock) {
    onChange(blocks.map((b) => (b.uid === uid ? patch(b) : b)));
  }
  function remove(uid: string) {
    onChange(blocks.filter((b) => b.uid !== uid));
  }
  function add(block: DraftBlock) {
    onChange([...blocks, block]);
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong bg-surface px-4 py-6 text-center text-sm text-ink-500">
          No content yet. Add instructions, evidence, or a question below to build this lab.
        </p>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <BlockCard key={block.uid} index={index} block={block} onChange={(b) => update(block.uid, () => b)} onRemove={() => remove(block.uid)} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <AddButton icon={FileText} label="Instructions" onClick={() => add(emptyInstructions())} />
        <AddButton icon={ImagePlus} label="Evidence" onClick={() => add(emptyEvidence())} />
        <AddButton icon={ListChecks} label="QCM question" onClick={() => add(emptyQcm())} />
        <AddButton icon={Type} label="Text-answer question" onClick={() => add(emptyTextAnswer())} />
        <AddButton icon={Flag} label="Flag question" onClick={() => add(emptyFlag())} />
      </div>
    </div>
  );
}

function AddButton({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3 py-1.5 text-xs font-medium text-ink-400 transition-all duration-200 hover:border-accent-400/50 hover:text-accent-300"
    >
      <Plus size={13} />
      <Icon size={13} />
      {label}
    </button>
  );
}

function BlockCard({
  index,
  block,
  onChange,
  onRemove,
}: {
  index: number;
  block: DraftBlock;
  onChange: (block: DraftBlock) => void;
  onRemove: () => void;
}) {
  const kindLabel: Record<DraftBlock["kind"], string> = {
    instructions: "Instructions",
    evidence: "Evidence",
    qcm: "QCM question",
    text_answer: "Text-answer question",
    flag: "Flag question",
  };

  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <GripVertical size={13} className="text-ink-700" />
          {index + 1}. {kindLabel[block.kind]}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${kindLabel[block.kind]} block`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {block.kind === "instructions" ? <InstructionsEditor block={block} onChange={onChange} /> : null}
      {block.kind === "evidence" ? <EvidenceEditor block={block} onChange={onChange} /> : null}
      {block.kind === "qcm" ? <QcmEditor block={block} onChange={onChange} /> : null}
      {block.kind === "text_answer" ? <TextAnswerEditor block={block} onChange={onChange} /> : null}
      {block.kind === "flag" ? <FlagEditor block={block} onChange={onChange} /> : null}
    </div>
  );
}

function InstructionsEditor({ block, onChange }: { block: DraftInstructions; onChange: (b: DraftBlock) => void }) {
  return (
    <textarea
      value={block.body}
      onChange={(e) => onChange({ ...block, body: e.target.value })}
      rows={4}
      maxLength={20000}
      placeholder="What should the learner do or know before answering?"
      aria-label="Instructions text"
      className={cn(smallInputClass, "resize-none")}
    />
  );
}

function EvidenceEditor({ block, onChange }: { block: DraftEvidence; onChange: (b: DraftBlock) => void }) {
  function updateItem(uid: string, patch: Partial<DraftEvidenceItem>) {
    onChange({ ...block, items: block.items.map((i) => (i.uid === uid ? { ...i, ...patch } : i)) });
  }
  function removeItem(uid: string) {
    onChange({ ...block, items: block.items.filter((i) => i.uid !== uid) });
  }
  function addItem() {
    onChange({ ...block, items: [...block.items, { uid: nextUid("ev"), url: "", caption: "" }] });
  }

  return (
    <div className="space-y-2">
      {block.items.map((item) => (
        <div key={item.uid} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={item.url}
            onChange={(e) => updateItem(item.uid, { url: e.target.value })}
            placeholder="https://... (image or resource URL)"
            aria-label="Evidence URL"
            className={cn(smallInputClass, "sm:flex-1")}
          />
          <input
            value={item.caption}
            onChange={(e) => updateItem(item.uid, { caption: e.target.value })}
            placeholder="Caption (optional)"
            aria-label="Evidence caption"
            className={cn(smallInputClass, "sm:w-48")}
          />
          {block.items.length > 1 ? (
            <button
              type="button"
              onClick={() => removeItem(item.uid)}
              aria-label="Remove evidence item"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>
      ))}
      <button type="button" onClick={addItem} className="text-xs font-medium text-accent-300 hover:underline">
        + Add another item
      </button>
    </div>
  );
}

function HintsEditor({ hints, onChange }: { hints: string[]; onChange: (hints: string[]) => void }) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <span className={smallLabelClass}>
        <Lightbulb size={11} className="mr-1 inline" />
        Hints (optional, click-to-reveal for the learner)
      </span>
      <div className="space-y-1.5">
        {hints.map((hint, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={hint}
              onChange={(e) => onChange(hints.map((h, hi) => (hi === i ? e.target.value : h)))}
              placeholder={`Hint ${i + 1}`}
              aria-label={`Hint ${i + 1}`}
              className={cn(smallInputClass, "flex-1")}
            />
            <button
              type="button"
              onClick={() => onChange(hints.filter((_, hi) => hi !== i))}
              aria-label="Remove hint"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...hints, ""])} className="text-xs font-medium text-accent-300 hover:underline">
          + Add hint
        </button>
      </div>
    </div>
  );
}

function QcmEditor({ block, onChange }: { block: DraftQcm; onChange: (b: DraftBlock) => void }) {
  function updateOption(uid: string, patch: Partial<DraftOption>) {
    let options = block.options.map((o) => (o.uid === uid ? { ...o, ...patch } : o));
    if (patch.correct && !block.multiSelect) {
      options = options.map((o) => (o.uid === uid ? o : { ...o, correct: false }));
    }
    onChange({ ...block, options });
  }
  function removeOption(uid: string) {
    onChange({ ...block, options: block.options.filter((o) => o.uid !== uid) });
  }
  function addOption() {
    onChange({ ...block, options: [...block.options, { uid: nextUid("o"), text: "", correct: false }] });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={smallLabelClass}>Question</label>
        <input
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          placeholder="e.g. Which port is exposed on the target host?"
          aria-label="QCM question prompt"
          className={smallInputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-400">
        <input
          type="checkbox"
          checked={block.multiSelect}
          onChange={(e) =>
            onChange({
              ...block,
              multiSelect: e.target.checked,
              options: block.options.map((o) => ({ ...o, correct: e.target.checked ? o.correct : false })),
            })
          }
          className="h-3.5 w-3.5 rounded border-border-strong bg-surface-hover accent-accent-400"
        />
        Allow multiple correct options
      </label>

      <div className="space-y-1.5">
        <span className={smallLabelClass}>Options — check the correct answer{block.multiSelect ? "s" : ""}</span>
        {block.options.map((option) => (
          <div key={option.uid} className="flex items-center gap-2">
            <input
              type={block.multiSelect ? "checkbox" : "radio"}
              name={`qcm-correct-${block.uid}`}
              checked={option.correct}
              onChange={(e) => updateOption(option.uid, { correct: e.target.checked || !block.multiSelect })}
              aria-label={`Mark "${option.text || "this option"}" as correct`}
              className="h-4 w-4 shrink-0 accent-accent-400"
            />
            <input
              value={option.text}
              onChange={(e) => updateOption(option.uid, { text: e.target.value })}
              placeholder="Option text"
              aria-label="Option text"
              className={cn(smallInputClass, "flex-1")}
            />
            {block.options.length > 2 ? (
              <button
                type="button"
                onClick={() => removeOption(option.uid)}
                aria-label="Remove option"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
        ))}
        {block.options.length < 12 ? (
          <button type="button" onClick={addOption} className="text-xs font-medium text-accent-300 hover:underline">
            + Add option
          </button>
        ) : null}
      </div>

      <HintsEditor hints={block.hints} onChange={(hints) => onChange({ ...block, hints })} />
    </div>
  );
}

function TextAnswerEditor({ block, onChange }: { block: DraftTextAnswer; onChange: (b: DraftBlock) => void }) {
  function updateAccepted(index: number, value: string) {
    onChange({ ...block, accepted: block.accepted.map((a, i) => (i === index ? value : a)) });
  }
  return (
    <div className="space-y-3">
      <div>
        <label className={smallLabelClass}>Question</label>
        <input
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          placeholder="e.g. What username was found in the metadata?"
          aria-label="Text-answer question prompt"
          className={smallInputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-400">
        <input
          type="checkbox"
          checked={block.manualOnly}
          onChange={(e) => onChange({ ...block, manualOnly: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-border-strong bg-surface-hover accent-accent-400"
        />
        Grade this one manually (no automatic answer matching)
      </label>

      {!block.manualOnly ? (
        <>
          <div>
            <label className={smallLabelClass}>Matching</label>
            <select
              value={block.matchMode}
              onChange={(e) => onChange({ ...block, matchMode: e.target.value as DraftTextAnswer["matchMode"] })}
              className={cn(smallInputClass, "cursor-pointer")}
            >
              <option value="exact_ci">Exact match (ignore case)</option>
              <option value="exact">Exact match (case-sensitive)</option>
              <option value="contains">Answer contains this text</option>
            </select>
          </div>
          <div>
            <span className={smallLabelClass}>Accepted answers</span>
            <div className="space-y-1.5">
              {block.accepted.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={a}
                    onChange={(e) => updateAccepted(i, e.target.value)}
                    placeholder="Accepted answer"
                    aria-label={`Accepted answer ${i + 1}`}
                    className={cn(smallInputClass, "flex-1")}
                  />
                  {block.accepted.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onChange({ ...block, accepted: block.accepted.filter((_, ai) => ai !== i) })}
                      aria-label="Remove accepted answer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => onChange({ ...block, accepted: [...block.accepted, ""] })}
                className="text-xs font-medium text-accent-300 hover:underline"
              >
                + Add accepted answer
              </button>
            </div>
          </div>
        </>
      ) : null}

      <HintsEditor hints={block.hints} onChange={(hints) => onChange({ ...block, hints })} />
    </div>
  );
}

function FlagEditor({ block, onChange }: { block: DraftFlag; onChange: (b: DraftBlock) => void }) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="space-y-3">
      <div>
        <label className={smallLabelClass}>Question</label>
        <input
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          placeholder="e.g. Submit the flag found on the target."
          aria-label="Flag question prompt"
          className={smallInputClass}
        />
      </div>

      <div>
        <label className={smallLabelClass}>Expected flag</label>
        <div className="relative">
          <input
            type={reveal ? "text" : "password"}
            value={block.expectedFlag}
            onChange={(e) => onChange({ ...block, expectedFlag: e.target.value })}
            placeholder="AZN{...}"
            aria-label="Expected flag"
            className={cn(smallInputClass, "pr-16 font-mono")}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-500 hover:text-ink-200"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-600">Stored as a hash — never shown to learners or in this app after saving.</p>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-400">
        <input
          type="checkbox"
          checked={block.caseSensitive}
          onChange={(e) => onChange({ ...block, caseSensitive: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-border-strong bg-surface-hover accent-accent-400"
        />
        Case-sensitive
      </label>

      <HintsEditor hints={block.hints} onChange={(hints) => onChange({ ...block, hints })} />
    </div>
  );
}
