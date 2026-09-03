"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, Download, AlertCircle, Loader2, Image as ImageIcon, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChatFileSize } from "@/lib/chat-media";
import type { ChatAttachmentForMessage } from "@/data/chat";
import { getStickerById } from "@/lib/stickers/catalog";

interface ChatAttachmentProps {
  attachment: ChatAttachmentForMessage;
  isOwn?: boolean;
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AudioPlayer({ attachment, isOwn }: { attachment: ChatAttachmentForMessage; isOwn?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(attachment.duration_seconds ?? 0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setError(false);
    setLoading(true);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [attachment.signedUrl]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => setError(true));
    }
  };

  const displayDuration = duration > 0 ? duration : attachment.duration_seconds ?? 0;
  const progress = displayDuration > 0 ? Math.min(currentTime / displayDuration, 1) : 0;

  if (!attachment.signedUrl) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2 text-sm text-ink-400">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
        <span>Audio unavailable</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5",
        isOwn ? "bg-black/10" : "bg-surface/70",
        "min-w-[220px] max-w-[260px]",
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          isOwn ? "bg-white text-accent hover:bg-white/90" : "bg-accent text-white hover:bg-accent-glow",
        )}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className={cn("h-1.5 flex-1 overflow-hidden rounded-full", isOwn ? "bg-white/20" : "bg-accent/15")}>
            <div
              className={cn("h-full rounded-full transition-all", isOwn ? "bg-white" : "bg-accent")}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className={cn("text-xs tabular-nums", isOwn ? "text-white/80" : "text-ink-500")}>
            {formatDuration(isPlaying ? currentTime : displayDuration)}
          </span>
        </div>
        {attachment.filename && !attachment.filename.startsWith("voice-message") && (
          <span className={cn("truncate text-[11px]", isOwn ? "text-white/60" : "text-ink-500")}>{attachment.filename}</span>
        )}
      </div>
      {loading && !error && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-400" />}
      {error && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
      <audio
        ref={audioRef}
        src={attachment.signedUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDuration(d);
          setLoading(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}

export function ChatAttachment({ attachment, isOwn }: ChatAttachmentProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const isSticker = attachment.type === "sticker";
  const isAudio = attachment.type === "audio";
  const isGif = attachment.type === "gif";
  const isImage = attachment.type === "image" && attachment.mime_type?.startsWith("image/");

  if (isSticker) {
    const sticker = attachment.external_id ? getStickerById(attachment.external_id) : undefined;
    const meta = (attachment.metadata ?? {}) as { url?: string; packId?: string; name?: string };
    // Prefer catalog URL (authoritative) over metadata to prevent URL injection
    const url = sticker?.url ?? (meta.url && typeof meta.url === "string" && meta.url.startsWith("/stickers/") ? meta.url : null);
    if (!sticker || !url) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2 text-sm text-ink-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>Invalid sticker</span>
        </div>
      );
    }
    return (
      <div className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={sticker.name}
          width={sticker.width}
          height={sticker.height}
          className="h-28 w-28 object-contain drop-shadow-sm sm:h-32 sm:w-32"
          loading="lazy"
        />
      </div>
    );
  }

  if (isGif) {
    const meta = (attachment.metadata ?? {}) as { url?: string; previewUrl?: string; title?: string };
    const rawUrl = meta.url ?? meta.previewUrl;
    const url = rawUrl && (() => {
      try {
        const host = new URL(rawUrl).hostname.toLowerCase();
        const allowed = ["giphy.com", "media.giphy.com", "i.giphy.com", "tenor.com", "media.tenor.com"];
        const ok = allowed.some((h) => host === h || host.endsWith(`.${h}`) || host.endsWith(h));
        return ok ? rawUrl : null;
      } catch {
        return null;
      }
    })();
    if (!url) {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2 text-sm text-ink-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>Invalid GIF</span>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-xl">
        {imgLoading && (
          <div className="flex h-32 w-48 items-center justify-center bg-surface/50">
            <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={meta.title ?? "GIF"}
          className={cn("max-h-64 max-w-[260px] object-cover", imgLoading ? "hidden" : "block")}
          onLoad={() => setImgLoading(false)}
          onError={() => setImgLoading(false)}
          loading="lazy"
        />
      </div>
    );
  }

  if (isAudio) {
    return <AudioPlayer attachment={attachment} isOwn={isOwn} />;
  }

  if (isImage && attachment.signedUrl && !imgError) {
    return (
      <div className="overflow-hidden rounded-xl">
        {imgLoading && (
          <div className="flex h-32 w-48 items-center justify-center bg-surface/50">
            <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
          </div>
        )}
        <a
          href={attachment.signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.signedUrl}
            alt={attachment.filename ?? "Image"}
            className={cn("max-h-64 max-w-[260px] object-cover transition-opacity", imgLoading ? "hidden" : "block", "hover:opacity-90")}
            onLoad={() => setImgLoading(false)}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
          />
        </a>
        {attachment.filename && (
          <div className={cn("flex items-center gap-1.5 px-2 py-1 text-[11px]", isOwn ? "bg-black/10 text-white/70" : "bg-surface/60 text-ink-500")}>
            <ImageIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{attachment.filename}</span>
            {attachment.file_size && (
              <span className="shrink-0 opacity-60">{formatChatFileSize(attachment.file_size)}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isImage && imgError) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface/60 px-3 py-2 text-sm text-ink-400">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
        <span>Failed to load image</span>
        {attachment.filename && <span className="truncate text-xs text-ink-500">{attachment.filename}</span>}
      </div>
    );
  }

  // File card
  const ext = attachment.filename?.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <a
      href={attachment.signedUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
        isOwn ? "bg-black/10 hover:bg-black/15" : "bg-surface/70 hover:bg-surface",
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold", isOwn ? "bg-white/20 text-white" : "bg-accent/10 text-accent")}>
        {ext.slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isOwn ? "text-white" : "text-ink-50")}>{attachment.filename ?? "File"}</p>
        <p className={cn("text-xs", isOwn ? "text-white/60" : "text-ink-500")}>
          {attachment.mime_type ?? "file"} {attachment.file_size ? `• ${formatChatFileSize(attachment.file_size)}` : ""}
        </p>
      </div>
      <Download className={cn("h-4 w-4 shrink-0", isOwn ? "text-white/70" : "text-ink-400")} />
    </a>
  );
}

export function QueuedAttachmentCard({
  file,
  previewUrl,
  onRemove,
  status,
  error,
  onRetry,
}: {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
  status: "queued" | "uploading" | "error";
  error?: string;
  onRetry?: () => void;
}) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="relative flex w-28 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="relative h-20 w-full overflow-hidden bg-void-900/30">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-6 w-6 text-ink-400" />
          </div>
        )}
        {status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-void-900/50">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-void-900/80 text-white backdrop-blur hover:bg-red-500"
          aria-label="Remove attachment"
        >
          ×
        </button>
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-[11px] font-medium text-ink-50">{file.name}</p>
        <p className="text-[10px] text-ink-500">{formatChatFileSize(file.size)}</p>
        {status === "error" && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">{error ?? "Upload failed"}</span>
            {onRetry && (
              <button type="button" onClick={onRetry} className="ml-auto font-semibold underline">
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
