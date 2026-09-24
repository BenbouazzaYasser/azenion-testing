"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Code2, ImagePlus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { createCourse } from "@/actions/academy-courses.actions";
import { useDialogFocus, useDialogOpen } from "@/lib/use-dialog-focus";
import {
  COURSE_CATEGORIES,
  COURSE_DIFFICULTIES,
  type CourseContentType,
} from "@/lib/validations/course.schema";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

export function CourseCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState<CourseContentType>("html_css");
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState("");
  const [fileName, setFileName] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const { mounted } = useDialogOpen(open, () => setOpen(false));

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("");
    setContentType("html_css");
    setDuration("");
    setDifficulty("");
    setTags("");
    setFileName("");
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Please choose a category");
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a course file to upload");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("description", description);
      fd.set("category", category);
      fd.set("content_type", contentType);
      fd.set("duration", duration);
      if (difficulty) fd.set("difficulty", difficulty);
      if (tags.trim()) fd.set("tags", tags);
      fd.set("file", file);
      const thumbnail = thumbnailInputRef.current?.files?.[0];
      if (thumbnail) fd.set("thumbnail", thumbnail);

      const result = await createCourse(fd);

      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
      toast.success("Course uploaded.");
      router.refresh();
    });
  }

  const acceptAttr =
    contentType === "pdf" ? ".pdf,application/pdf" : ".zip,.html,.htm,.css,.js,.mjs";

  return (
    <>
      <Button variant="primary" size="default" onClick={() => setOpen(true)}>
        <Plus size={15} />
        Add Course
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
              role="dialog"
              aria-modal="true"
              aria-label="Create course"
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
                className="relative z-10 flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "scale(1)" : "scale(0.95)",
                }}
              >
                <div className="flex items-start justify-between border-b border-border px-5 py-5 sm:px-8">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-50">Add Course</h2>
                    <p className="mt-1 text-sm text-ink-400">
                      Create a new course in the Academy catalog.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                  {error ? (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <FormField label="Course title" htmlFor="course-title" required>
                      <input
                        id="course-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={200}
                        placeholder="e.g. HTML & CSS Fundamentals"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField
                      label="Description"
                      htmlFor="course-description"
                      helper={`${description.length}/5000`}
                    >
                      <textarea
                        id="course-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={5000}
                        rows={3}
                        placeholder="What will students learn?"
                        className={`${inputClass} resize-none`}
                      />
                    </FormField>

                    <FormField label="Category" htmlFor="course-category" required>
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
                    </FormField>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField label="Duration" htmlFor="course-duration">
                        <input
                          id="course-duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          maxLength={50}
                          placeholder="e.g. 6 weeks, 2 hours"
                          className={inputClass}
                        />
                      </FormField>

                      <FormField label="Difficulty" htmlFor="course-difficulty">
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
                      </FormField>
                    </div>

                    <FormField
                      label="Tags"
                      htmlFor="course-tags"
                      helper="Comma-separated, up to 10 tags."
                    >
                      <input
                        id="course-tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        maxLength={300}
                        placeholder="e.g. HTML, CSS, Responsive"
                        className={inputClass}
                      />
                    </FormField>

                    <div className="rounded-xl border border-accent-400/30 bg-accent/[0.06] px-4 py-3 text-sm text-accent-200">
                      Courses are created as drafts and are only visible to
                      managers. Publish them from the catalog once they&apos;re ready.
                    </div>

                    <fieldset>
                      <legend className="mb-1.5 block text-sm font-medium text-ink-200">Content type</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            {
                              value: "html_css",
                               label: "HTML/CSS/JS Course",
                               hint: ".zip, .html, .css, or .js",
                              icon: Code2,
                            },
                            {
                              value: "pdf",
                              label: "PDF",
                              hint: ".pdf",
                              icon: FileText,
                            },
                          ] as const
                        ).map((option) => {
                          const Icon = option.icon;
                          const selected = contentType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setContentType(option.value)}
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ease-premium cursor-pointer",
                                selected
                                  ? "border-accent-400/60 bg-accent/[0.08] shadow-input"
                                  : "border-border-strong text-ink-400 hover:border-accent-400/40 hover:text-ink-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
                                  selected
                                    ? "border-accent-400/50 bg-accent/10 text-accent-300"
                                    : "border-border-strong bg-surface text-ink-400"
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span>
                                <span className="block text-sm font-medium text-ink-50">
                                  {option.label}
                                </span>
                                <span className="block text-xs text-ink-500">
                                  {option.hint}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-ink-200">Course file</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptAttr}
                        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface px-5 py-8 text-ink-500 transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.03] hover:text-ink-300"
                      >
                        {contentType === "pdf" ? (
                          <FileText size={24} />
                        ) : (
                          <Code2 size={24} />
                        )}
                        <span className="text-sm">
                           {fileName || `Upload ${contentType === "pdf" ? "PDF" : "HTML/CSS/JS"} file`}
                        </span>
                      </button>
                    </div>

                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-ink-200">Thumbnail</span>
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
                          <span className="text-sm">
                            {thumbnailFile?.name || "Choose a thumbnail image"}
                          </span>
                        </button>
                        {thumbnailPreview ? (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbnailPreview}
                              alt="Thumbnail preview"
                              className="h-16 w-16 shrink-0 rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setThumbnailFile(null);
                                if (thumbnailInputRef.current)
                                  thumbnailInputRef.current.value = "";
                              }}
                              className="text-xs font-medium text-red-300 underline-offset-2 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
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
                        {isPending ? "Creating..." : "Create Course"}
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
