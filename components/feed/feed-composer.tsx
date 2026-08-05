"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_ASSET_TYPES,
  MAX_ASSET_SIZE,
} from "@/lib/validations/project.schema";
import {
  createFeedPost,
  uploadFeedPostImage,
} from "@/actions/feed.actions";

interface FeedComposerProps {
  onPosted?: (postId: string) => void;
  maxImages?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;
const MAX_PREVIEW_HEIGHT = 320;

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input disabled:cursor-not-allowed disabled:opacity-50";

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_PREVIEW_HEIGHT)}px`;
}

export function FeedComposer({
  onPosted,
  maxImages = 6,
  placeholder = "Share an update with Azenion\u2026",
  disabled = false,
  className,
}: FeedComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const previewsRef = useRef<string[]>([]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<{
    index: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  const uploadProgress =
    uploadStep && uploadStep.total > 1
      ? Math.max(0, (uploadStep.index - 1) / uploadStep.total)
      : 0;

  function addAccepted(accepted: File[]) {
    const urls = accepted.map((f) => URL.createObjectURL(f));
    previewsRef.current = [...previewsRef.current, ...urls];
    setPreviews((prev) => [...prev, ...urls]);
    setFiles((prev) => [...prev, ...accepted]);
  }

  function removeImage(index: number) {
    const url = previews[index];
    if (url) URL.revokeObjectURL(url);
    previewsRef.current = previewsRef.current.filter((_, i) => i !== index);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    for (const url of previewsRef.current) URL.revokeObjectURL(url);
    previewsRef.current = [];
    if (bodyRef.current) bodyRef.current.style.height = "";
    setTitle("");
    setBody("");
    setFiles([]);
    setPreviews([]);
  }

  function handleFiles(selected: FileList | null) {
    if (!selected || submitting || disabled) return;

    let message: string | null = null;
    const valid: File[] = [];
    for (const file of Array.from(selected)) {
      if (!ALLOWED_ASSET_TYPES.includes(file.type)) {
        message = `"${file.name}" isn't a PNG, JPEG, or WebP image.`;
        continue;
      }
      if (file.size > MAX_ASSET_SIZE) {
        message = `"${file.name}" exceeds the 2MB limit.`;
        continue;
      }
      valid.push(file);
    }

    const remaining = maxImages - previews.length;
    if (valid.length > remaining) {
      message = message ?? `You can attach up to ${maxImages} images.`;
    }
    const accepted = valid.slice(0, Math.max(remaining, 0));

    if (accepted.length > 0) {
      addAccepted(accepted);
      setError(null);
    }
    if (message) setError(message);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    const hasText = Boolean(title.trim() || body.trim());
    if (!hasText || submitting || disabled) return;
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("body", body.trim());

      const created = await createFeedPost(fd);
      if (created && "error" in created && created.error) {
        setError(created.error);
        return;
      }
      const postId = "id" in created ? created.id : null;
      if (!postId) {
        setError("Something went wrong while posting. Please try again.");
        return;
      }

      for (let i = 0; i < files.length; i++) {
        setUploadStep({ index: i + 1, total: files.length });
        const imgFd = new FormData();
        imgFd.set("post_id", postId);
        imgFd.set("image", files[i]!);
        const uploaded = await uploadFeedPostImage(imgFd);
        if (uploaded && "error" in uploaded && uploaded.error) {
          setError(uploaded.error);
          break;
        }
      }

      reset();
      onPosted?.(postId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
      setUploadStep(null);
    }
  }

  const canPost = Boolean(title.trim() || body.trim()) && !disabled;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-card backdrop-blur-xl sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="shrink-0 text-accent-400" />
        <h3 className="text-sm font-medium text-ink-300">
          Share something with Azenion
        </h3>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-400">
          <span className="flex-1">{error}</span>
          {!submitting ? (
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="shrink-0 text-rose-400/70 transition-colors hover:text-rose-300"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Headline (optional)\u2026"
          maxLength={MAX_TITLE_LENGTH}
          disabled={submitting || disabled}
          className={inputClass}
        />

        <div className="relative">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              autosize(e.target);
            }}
            placeholder={placeholder}
            rows={3}
            maxLength={MAX_BODY_LENGTH}
            disabled={submitting || disabled}
            className={cn(inputClass, "resize-none leading-relaxed")}
          />
          {body.length > 0 ? (
            <span className="pointer-events-none absolute bottom-2.5 right-3 text-[0.68rem] font-medium tabular-nums text-ink-600">
              {body.length}/{MAX_BODY_LENGTH}
            </span>
          ) : null}
        </div>

        {previews.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              previews.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {previews.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border-strong bg-white/[0.03]",
                  previews.length === 1 ? "aspect-[16/10]" : "aspect-[4/3]",
                )}
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.03]"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  disabled={submitting || disabled}
                  aria-label={`Remove image ${i + 1}`}
                  className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:pointer-events-none disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {uploadStep && uploadStep.total > 1 && submitting ? (
        <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent transition-[width] duration-300 ease-premium"
            style={{ width: `${uploadProgress * 100}%` }}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-strong/50 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || disabled || previews.length >= maxImages}
          className="inline-flex h-9 items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-accent-400 disabled:pointer-events-none disabled:opacity-40"
          title="PNG, JPEG, or WebP \u2014 up to 2MB each"
        >
          <ImagePlus size={16} />
          Add images
          {previews.length > 0 ? (
            <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[0.68rem] font-medium text-ink-400">
              {previews.length}/{maxImages}
            </span>
          ) : null}
        </button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!canPost || submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {uploadStep
                ? uploadStep.total > 1
                  ? `Uploading ${uploadStep.index}/${uploadStep.total}`
                  : "Uploading image\u2026"
                : "Posting\u2026"}
            </>
          ) : (
            <>
              <Send size={14} />
              Post
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
