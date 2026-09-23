"use client";

import { useEffect, useRef, useState } from "react";
import { Film, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/compress-image";
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
import { useFeedPending } from "@/components/feed/optimistic-posts";
import { useTranslation } from "@/components/translation/translation-provider";

interface FeedComposerProps {
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
  "w-full rounded-xl bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input disabled:cursor-not-allowed disabled:opacity-50";

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
  maxMedia = 6,
  placeholder,
  disabled = false,
  className,
}: FeedComposerProps) {
  const { t } = useTranslation();
  const { submitPost, pending, uploadStatus } = useFeedPending();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaItem[]>([]);
  // True while any optimistic post is still being created/uploaded.
  const isPosting = pending.some((p) => p.status === "posting");

  useEffect(() => {
    return () => {
      // Only revoke URLs never handed to the provider (submitted blob URLs
      // are owned by FeedPendingProvider until the post resolves/dismisses).
      for (const item of mediaRef.current) URL.revokeObjectURL(item.url);
    };
  }, []);

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

  function clearComposer() {
    // Blob URLs deliberately NOT revoked here — after a submit they belong
    // to the provider, which revokes them when the post resolves or is
    // dismissed.
    mediaRef.current = [];
    if (bodyRef.current) bodyRef.current.style.height = "";
    setTitle("");
    setBody("");
    setMedia([]);
  }

  function handleFiles(selected: FileList | null) {
    if (!selected || isPosting || disabled) return;

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
      const item: MediaItem = {
        id: mediaId(),
        file,
        kind: isVideo ? "video" : "image",
        url: URL.createObjectURL(file),
      };
      valid.push(item);
      if (!isVideo) {
        // Background compression: preview already shows the original blob URL;
        // swap the queued file for the downscaled WebP when ready. Uploads fall
        // back to the original on failure/timeout — never blocked.
        void compressImageFile(file).then((compressed) => {
          if (compressed === file) return;
          mediaRef.current = mediaRef.current.map((m) =>
            m.id === item.id ? { ...m, file: compressed } : m,
          );
          setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, file: compressed } : m)));
        });
      }
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
    if (!hasText || isPosting || disabled) return;
    setError(null);

    // Hand the post to FeedPendingProvider: it renders an optimistic card
    // immediately (blob preview URLs) and runs createFeedPost + media
    // uploads in the background. The composer clears without blocking.
    submitPost({
      title: title.trim(),
      body: body.trim(),
      media: media.map((m) => ({ file: m.file, kind: m.kind, url: m.url })),
    });
    clearComposer();
  }

  const canPost = Boolean(title.trim() || body.trim()) && !disabled;
  const kindLabel = (kind: FeedMediaKind) => (kind === "video" ? "video" : "image");

  return (
    <div
      className={cn(
        "rounded-2xl card-surface p-5 shadow-card backdrop-blur-xl sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="shrink-0 text-accent-400" />
        <h3 className="text-sm font-medium text-ink-300">
          {t("feed.composerHeadline")}
        </h3>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-400">
          <span className="flex-1">{error}</span>
          {!isPosting ? (
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label={t("feed.composerDismissError")}
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
                  placeholder={t("feed.composerHeadlinePlaceholder")}
                  maxLength={MAX_TITLE_LENGTH}
                  disabled={isPosting || disabled}
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
            placeholder={placeholder ?? t("feed.composePlaceholder")}
            rows={3}
            maxLength={MAX_BODY_LENGTH}
            disabled={isPosting || disabled}
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
                  "group relative overflow-hidden rounded-xl bg-surface",
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
                  disabled={isPosting || disabled}
                  aria-label={`Remove ${kindLabel(item.kind)} ${i + 1}`}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-3 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:pointer-events-none disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4">
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
          disabled={isPosting || disabled || media.length >= maxMedia}
          className="inline-flex min-h-[44px] items-center gap-1.5 py-2 text-sm text-ink-400 transition-colors hover:text-accent-400 disabled:pointer-events-none disabled:opacity-40"
          title={t("feed.composerMediaTitle")}
        >
          <ImagePlus size={16} />
          {t("feed.composerAddMedia")}
          {media.length > 0 ? (
            <span className="rounded-full bg-surface px-1.5 py-0.5 text-[0.68rem] font-medium text-ink-400">
              {media.length}/{maxMedia}
            </span>
          ) : null}
        </button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!canPost || isPosting}
        >
          {isPosting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {uploadStatus && uploadStatus.total > 1
                ? `Uploading ${uploadStatus.index}/${uploadStatus.total}`
                : t("feed.composerSubmitting")}
            </>
          ) : (
            <>
              <Send size={14} />
              {t("feed.composerSubmit")}
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