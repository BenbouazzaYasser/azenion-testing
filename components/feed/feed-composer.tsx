"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  formatFileSize,
  isVideoMimeType,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  type FeedMediaKind,
} from "@/lib/validations/media.schema";
import {
  createFeedPost,
  uploadFeedPostMedia,
} from "@/actions/feed.actions";

interface FeedComposerProps {
  onPosted?: (postId: string) => void;
  maxMedia?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface MediaItem {
  id: string;
  file: File;
  kind: FeedMediaKind;
  url: string;
  duration?: number;
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

function mediaId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FeedComposer({
  onPosted,
  maxMedia = 6,
  placeholder = "Share an update with Azenion\u2026",
  disabled = false,
  className,
}: FeedComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<{
    index: number;
    total: number;
  } | null>(null);

  const mediaRef = useRef<MediaItem[]>([]);

  useEffect(() => {
    return () => {
      for (const item of mediaRef.current) URL.revokeObjectURL(item.url);
    };
  }, []);

  const uploadProgress =
    uploadStep && uploadStep.total > 1
      ? Math.max(0, (uploadStep.index - 1) / uploadStep.total)
      : 0;

  function addAccepted(accepted: MediaItem[]) {
    mediaRef.current = [...mediaRef.current, ...accepted];
    setMedia((prev) => [...prev, ...accepted]);
  }

  function removeMedia(index: number) {
    const item = media[index];
    if (item) URL.revokeObjectURL(item.url);
    mediaRef.current = mediaRef.current.filter((_, i) => i !== index);
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    for (const item of mediaRef.current) URL.revokeObjectURL(item.url);
    mediaRef.current = [];
    if (bodyRef.current) bodyRef.current.style.height = "";
    setTitle("");
    setBody("");
    setMedia([]);
  }

  function handleFiles(selected: FileList | null) {
    if (!selected || submitting || disabled) return;

    let message: string | null = null;
    const valid: MediaItem[] = [];
    for (const file of Array.from(selected)) {
      const isVideo = isVideoMimeType(file.type);
      if (!isVideo && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
        message = `"${file.name}" isn't a supported image or video. Use PNG, JPEG, WebP, MP4, WebM, or MOV.`;
        continue;
      }
      if (isVideo) {
        if (file.size > MAX_VIDEO_SIZE) {
          message = `"${file.name}" exceeds the 50MB video limit.`;
          continue;
        }
      } else if (file.size > MAX_IMAGE_SIZE) {
        message = `"${file.name}" exceeds the 2MB image limit.`;
        continue;
      }
      valid.push({
        id: mediaId(),
        file,
        kind: isVideo ? "video" : "image",
        url: URL.createObjectURL(file),
      });
    }

    const remaining = maxMedia - media.length;
    if (valid.length > remaining) {
      message = message ?? `You can attach up to ${maxMedia} images or videos.`;
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

      for (let i = 0; i < media.length; i++) {
        const item = media[i]!;
        setUploadStep({ index: i + 1, total: media.length });
        const mediaFd = new FormData();
        mediaFd.set("post_id", postId);
        mediaFd.set("file", item.file);
        mediaFd.set("kind", item.kind);
        const uploaded = await uploadFeedPostMedia(mediaFd);
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
  const kindLabel = (kind: FeedMediaKind) => (kind === "video" ? "video" : "image");

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

        {media.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              media.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {media.map((item, i) => (
              <div
                key={item.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border-strong bg-white/[0.03]",
                  media.length === 1 ? "aspect-[16/10]" : "aspect-[4/3]",
                )}
              >
                {item.kind === "video" ? (
                  <PlayerPreview
                    item={item}
                    onDuration={(seconds) =>
                      setMedia((prev) =>
                        prev.map((m) =>
                          m.id === item.id ? { ...m, duration: seconds } : m,
                        ),
                      )
                    }
                  />
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.03]"
                  />
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-[11px] text-white/90">
                  <Film size={11} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                  {item.duration ? (
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatVideoDuration(item.duration)}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-white/60">
                    {formatFileSize(item.file.size)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  disabled={submitting || disabled}
                  aria-label={`Remove ${kindLabel(item.kind)} ${i + 1}`}
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
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || disabled || media.length >= maxMedia}
          className="inline-flex h-9 items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-accent-400 disabled:pointer-events-none disabled:opacity-40"
          title="Images (PNG, JPEG, WebP up to 2MB) or videos (MP4, WebM, MOV up to 50MB)"
        >
          <ImagePlus size={16} />
          Add media
          {media.length > 0 ? (
            <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[0.68rem] font-medium text-ink-400">
              {media.length}/{maxMedia}
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
                  : "Uploading media\u2026"
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

function PlayerPreview({
  item,
  onDuration,
}: {
  item: MediaItem;
  onDuration: (seconds: number) => void;
}) {
  function handleMetadata(event: React.SyntheticEvent<HTMLVideoElement>) {
    if (Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0) {
      onDuration(event.currentTarget.duration);
    }
  }

  return (
    <video
      src={item.url}
      muted
      controls
      preload="metadata"
      playsInline
      onLoadedMetadata={handleMetadata}
      className="h-full w-full bg-black/40 object-contain"
    />
  );
}