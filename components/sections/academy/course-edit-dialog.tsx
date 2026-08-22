"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCourse } from "@/actions/academy-courses.actions";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { COURSE_CATEGORIES, COURSE_DIFFICULTIES, type CourseRow } from "@/lib/validations/course.schema";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

export function CourseEditDialog({ course }: { course: CourseRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [category, setCategory] = useState(course.category);
  const [duration, setDuration] = useState(course.duration ?? "");
  const [difficulty, setDifficulty] = useState(course.difficulty ?? "");
  const [tags, setTags] = useState(course.tags?.join(", ") ?? "");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  function resetForm() {
    setTitle(course.title);
    setDescription(course.description ?? "");
    setCategory(course.category);
    setDuration(course.duration ?? "");
    setDifficulty(course.difficulty ?? "");
    setTags(course.tags?.join(", ") ?? "");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setRemoveThumbnail(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Please choose a category");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", course.id);
      fd.set("title", title);
      fd.set("description", description);
      fd.set("category", category);
      fd.set("duration", duration);
      if (difficulty) fd.set("difficulty", difficulty);
      if (tags.trim()) fd.set("tags", tags);
      const thumbnail = fileInputRef.current?.files?.[0];
      if (thumbnail) fd.set("thumbnail", thumbnail);
      if (removeThumbnail) fd.set("remove_thumbnail", "true");

      const result = await updateCourse(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
      toast.success("Course updated.");
      router.refresh();
    });
  }

  const previewThumbnail = thumbnailPreview;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        aria-label="Edit course"
        title="Edit course"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-300"
      >
        <Pencil size={13} />
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Edit course"
            >
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
                className="relative z-10 flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-8 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Edit Course</h2>
                    <p className="mt-1 text-sm text-ink-400">
                      Update the title, description, category, or thumbnail.
                    </p>
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
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="course-title" className={labelClass}>
                        Course title
                      </label>
                      <input
                        id="course-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="course-description" className={labelClass}>
                        Description
                      </label>
                      <textarea
                        id="course-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={5000}
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">
                        {description.length}/5000
                      </p>
                    </div>

                    <div>
                      <label htmlFor="course-category" className={labelClass}>
                        Category
                      </label>
                      <div className="relative">
                        <select
                          id="course-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          required
                          className={cn(inputClass, "cursor-pointer appearance-none pr-10")}
                        >
                          <option value="">Select a category</option>
                          {COURSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="course-duration" className={labelClass}>
                          Duration
                        </label>
                        <input
                          id="course-duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          maxLength={50}
                          placeholder="e.g. 6 weeks, 2 hours"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="course-difficulty" className={labelClass}>
                          Difficulty
                        </label>
                        <div className="relative">
                          <select
                            id="course-difficulty"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className={cn(
                              inputClass,
                              "cursor-pointer appearance-none pr-10",
                              !difficulty && "text-ink-600",
                            )}
                          >
                            <option value="">Select difficulty</option>
                            {COURSE_DIFFICULTIES.map((d) => (
                              <option key={d} value={d} className="capitalize">
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="course-tags" className={labelClass}>
                        Tags
                      </label>
                      <input
                        id="course-tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        maxLength={300}
                        placeholder="e.g. HTML, CSS, Responsive"
                        className={inputClass}
                      />
                      <p className="mt-1.5 text-xs text-ink-500">
                        Comma-separated, up to 10 tags.
                      </p>
                    </div>

                    <div>
                      <label className={labelClass}>Thumbnail</label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={(e) => {
                            setThumbnailFile(e.target.files?.[0] ?? null);
                            setRemoveThumbnail(false);
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-1 items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface px-5 py-5 text-ink-500 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.03] hover:text-ink-300"
                        >
                          <ImagePlus size={22} />
                          <span className="text-sm">
                            {thumbnailFile?.name || "Choose a thumbnail image"}
                          </span>
                        </button>
                        {previewThumbnail ? (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewThumbnail}
                              alt="New thumbnail preview"
                              className="h-16 w-16 shrink-0 rounded-lg border border-border-strong object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setThumbnailFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="text-xs font-medium text-red-300 underline-offset-2 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : course.thumbnail && !removeThumbnail ? (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={course.thumbnail}
                              alt="Current thumbnail"
                              className="h-16 w-16 shrink-0 rounded-lg border border-border-strong object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setRemoveThumbnail(true)}
                              className="text-xs font-medium text-red-300 underline-offset-2 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {removeThumbnail ? (
                        <p className="mt-2 text-xs text-ink-500">
                          The current thumbnail will be removed.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setOpen(false);
                          resetForm();
                        }}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}