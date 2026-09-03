"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Pencil, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateLab,
  createLabVersion,
  getLabWithContent,
  getCoursesForLab,
  linkLabToCourse,
  unlinkLabFromCourse,
} from "@/actions/academy-labs.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { LAB_CATEGORIES, LAB_DIFFICULTIES, LAB_TYPES, type LabRow } from "@/lib/validations/lab.schema";
import { LabContentEditor, serializeDraftBlocks, hydrateDraftBlocks, type DraftBlock } from "./lab-content-editor";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

interface AvailableCourse {
  id: string;
  title: string;
}

export function LabEditDialog({ lab, availableCourses = [] }: { lab: LabRow; availableCourses?: AvailableCourse[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(lab.title);
  const [description, setDescription] = useState(lab.description ?? "");
  const [category, setCategory] = useState<string>(lab.category);
  const [type, setType] = useState(lab.type ?? "");
  const [difficulty, setDifficulty] = useState<string>(lab.difficulty);
  const [duration, setDuration] = useState(lab.estimated_duration_minutes?.toString() ?? "");
  const [tags, setTags] = useState(lab.tags?.join(", ") ?? "");
  const [isPublished, setIsPublished] = useState(lab.is_published);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [publishingVersion, setPublishingVersion] = useState(false);

  const [linkedCourseIds, setLinkedCourseIds] = useState<Set<string>>(new Set());
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [linkPendingId, setLinkPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  // Load the current version's content (learner-safe; answer_key is never
  // part of this response) and the lab's current course links once, the
  // first time the dialog opens.
  useEffect(() => {
    if (!open || contentLoaded) return;
    getLabWithContent(lab.id).then((result) => {
      if (result && "success" in result && result.version?.content) {
        setBlocks(hydrateDraftBlocks(result.version.content));
      }
      setContentLoaded(true);
    });
  }, [open, contentLoaded, lab.id]);

  useEffect(() => {
    if (!open || linksLoaded) return;
    getCoursesForLab(lab.id).then((result) => {
      if (result && "success" in result) {
        setLinkedCourseIds(new Set((result.courses ?? []).map((c) => (c as { id: string }).id)));
      }
      setLinksLoaded(true);
    });
  }, [open, linksLoaded, lab.id]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Please choose a category");
      return;
    }
    if (!difficulty) {
      setError("Please choose a difficulty");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", lab.id);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("category", category);
      fd.set("difficulty", difficulty);
      if (type) fd.set("type", type);
      if (duration) fd.set("estimated_duration_minutes", duration);
      if (tags.trim()) fd.set("tags", tags);
      fd.set("is_published", isPublished ? "true" : "false");
      const thumbnail = thumbnailInputRef.current?.files?.[0];
      if (thumbnail) fd.set("thumbnail", thumbnail);

      const result = await updateLab(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      if (result && "warning" in result && result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Lab updated.");
      }
      router.refresh();
    });
  }

  function handlePublishVersion() {
    const { content, answerInput } = serializeDraftBlocks(blocks);
    if (content.blocks.length === 0) {
      toast.error("Add at least one content block before publishing a version.");
      return;
    }
    setPublishingVersion(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("lab_id", lab.id);
      fd.set("content", JSON.stringify(content));
      if (Object.keys(answerInput).length > 0) {
        fd.set("answer_input", JSON.stringify(answerInput));
      }
      const result = await createLabVersion(fd);
      setPublishingVersion(false);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("New version published.");
      router.refresh();
    });
  }

  function toggleCourseLink(courseId: string, linked: boolean) {
    setLinkPendingId(courseId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("course_id", courseId);
      fd.set("lab_id", lab.id);
      const result = linked ? await unlinkLabFromCourse(fd) : await linkLabToCourse(fd);
      setLinkPendingId(null);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setLinkedCourseIds((prev) => {
        const next = new Set(prev);
        if (linked) next.delete(courseId);
        else next.add(courseId);
        return next;
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit lab"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-300"
      >
        <Pencil size={13} />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true" aria-label="Edit lab">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
                style={{ opacity: mounted ? 1 : 0 }}
                onClick={() => setOpen(false)}
              />

              <div
                ref={dialogFocusRef}
                tabIndex={-1}
                className="relative z-10 flex max-h-[85vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{ opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.95)" }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Edit Lab</h2>
                    <p className="mt-1 text-sm text-ink-400">{lab.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor={`lab-title-${lab.id}`} className={labelClass}>
                        Lab title
                      </label>
                      <input
                        id={`lab-title-${lab.id}`}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor={`lab-description-${lab.id}`} className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id={`lab-description-${lab.id}`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={5000}
                        rows={3}
                        className={cn(inputClass, "resize-none")}
                      />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3">
                      <div>
                        <label htmlFor={`lab-category-${lab.id}`} className={labelClass}>
                          Category
                        </label>
                        <select
                          id={`lab-category-${lab.id}`}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          required
                          className={cn(inputClass, "cursor-pointer appearance-none pr-10")}
                        >
                          {LAB_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`lab-type-${lab.id}`} className={labelClass}>
                          Type
                        </label>
                        <select
                          id={`lab-type-${lab.id}`}
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className={cn(inputClass, "cursor-pointer appearance-none pr-10")}
                        >
                          <option value="">None</option>
                          {LAB_TYPES.map((t) => (
                            <option key={t} value={t} className="capitalize">
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`lab-difficulty-${lab.id}`} className={labelClass}>
                          Difficulty
                        </label>
                        <select
                          id={`lab-difficulty-${lab.id}`}
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          required
                          className={cn(inputClass, "cursor-pointer appearance-none pr-10")}
                        >
                          {LAB_DIFFICULTIES.map((d) => (
                            <option key={d} value={d} className="capitalize">
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`lab-duration-${lab.id}`} className={labelClass}>
                          Estimated duration (minutes)
                        </label>
                        <input
                          id={`lab-duration-${lab.id}`}
                          type="number"
                          min={0}
                          max={10000}
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor={`lab-tags-${lab.id}`} className={labelClass}>
                          Tags
                        </label>
                        <input
                          id={`lab-tags-${lab.id}`}
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          maxLength={300}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Thumbnail</label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="flex flex-1 items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface px-5 py-5 text-ink-500 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.03] hover:text-ink-300"
                        >
                          <ImagePlus size={22} />
                          <span className="text-sm">{thumbnailFile?.name || "Replace thumbnail image"}</span>
                        </button>
                        {thumbnailPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnailPreview} alt="Thumbnail preview" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                        ) : lab.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={lab.thumbnail_url} alt="Current thumbnail" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                        ) : null}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-ink-200">
                      <input
                        type="checkbox"
                        checked={isPublished}
                        onChange={(e) => setIsPublished(e.target.checked)}
                        className="h-4 w-4 rounded border-border-strong bg-surface accent-accent-400"
                      />
                      Published
                    </label>

                    <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                      <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                        {isPending ? "Saving..." : "Save changes"}
                      </Button>
                    </div>
                  </form>

                  <div className="mt-8 border-t border-border pt-6">
                    <label className={labelClass}>Content — publish a new version</label>
                    <p className="mb-4 text-xs text-ink-500">
                      Versions are immutable, so changes here are saved as a new version. Instructions and questions are
                      pre-filled from the current version, but correct answers and flags are never sent back to this app for
                      security reasons — re-enter them if this question should stay auto-graded.
                    </p>
                    {contentLoaded ? (
                      <LabContentEditor blocks={blocks} onChange={setBlocks} />
                    ) : (
                      <p className="text-sm text-ink-500">Loading current content…</p>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button type="button" variant="secondary" size="sm" onClick={handlePublishVersion} disabled={publishingVersion || !contentLoaded}>
                        {publishingVersion ? "Publishing..." : "Publish new version"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-border pt-6">
                    <label className={labelClass}>
                      <Link2 size={13} className="mr-1.5 inline" />
                      Linked courses
                    </label>
                    <p className="mb-4 text-xs text-ink-500">
                      This lab can be linked to any number of courses. Linking doesn&apos;t affect course progress or unlocking.
                    </p>
                    {availableCourses.length === 0 ? (
                      <p className="text-sm text-ink-500">No courses exist yet.</p>
                    ) : !linksLoaded ? (
                      <p className="text-sm text-ink-500">Loading links…</p>
                    ) : (
                      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-border-strong bg-surface p-3">
                        {availableCourses.map((course) => {
                          const linked = linkedCourseIds.has(course.id);
                          return (
                            <label
                              key={course.id}
                              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-200 hover:bg-surface-hover"
                            >
                              <input
                                type="checkbox"
                                checked={linked}
                                disabled={linkPendingId === course.id}
                                onChange={() => toggleCourseLink(course.id, linked)}
                                className="h-4 w-4 rounded border-border-strong bg-surface-hover accent-accent-400"
                              />
                              {course.title}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
