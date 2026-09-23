"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FileText, Download, AlertCircle, Loader2, Image as ImageIcon, Play, Pause, RefreshCw } from "lucide-react";
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
        "min-w-0 w-full max-w-[260px] sm:w-auto sm:min-w-[220px]",
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
  const [imgRatio, setImgRatio] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isSticker = attachment.type === "sticker";
  const isAudio = attachment.type === "audio";
  const isGif = attachment.type === "gif";
  const isImage = attachment.type === "image" && attachment.mime_type?.startsWith("image/");

  if (isSticker) {
    const sticker = attachment.external_id ? getStickerById(attachment.external_id) : undefined;
    const meta = (attachment.metadata ?? {}) as { url?: string; packId?: string; name?: string };
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
        const allowed = ["giphy.com", "tenor.com"];
        const ok = allowed.some((h) => host === h || host.endsWith(`.${h}`));
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
          className={cn("max-h-64 max-w-full object-cover", imgLoading ? "hidden" : "block")}
          onLoad={() => setImgLoading(false)}
          onError={() => setImgLoading(false)}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  if (isAudio) {
    return <AudioPlayer key={attachment.signedUrl} attachment={attachment} isOwn={isOwn} />;
  }

  if (isImage && attachment.signedUrl && !imgError) {
    // Supabase private-bucket URLs (signed, blob, data) render with a plain
    // <img>: they bypass the Next Image optimizer, which cannot fetch them
    // (short-lived signatures defeat its cache, and its SSRF guard rejects
    // NAT64-synthesized upstream IPs with a 400). The browser fetches the
    // signed URL directly; img-src already allows https://*.supabase.co.
    const directFetch =
      attachment.signedUrl.startsWith("blob:") ||
      attachment.signedUrl.startsWith("data:") ||
      attachment.signedUrl.includes(".supabase.co/");
    if (directFetch) {
      const meta = attachment.metadata as { spoiler?: boolean; tags?: string[] } | null;
      const isSpoiler = meta?.spoiler === true;
      return (
        <div className="max-w-[260px] overflow-hidden rounded-xl">
          {imgLoading && (
            <div className="flex h-32 w-48 max-w-full items-center justify-center bg-surface/50">
              <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.signedUrl}
            alt={attachment.filename ?? "Image"}
            loading="eager"
            decoding="async"
            className={cn("max-h-64 w-full object-cover", imgLoading && "hidden")}
            style={isSpoiler ? { filter: "blur(8px)" } : undefined}
            onLoad={() => setImgLoading(false)}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
          />
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
    return (
      <div className="max-w-[260px] overflow-hidden rounded-xl">
        <div className="relative w-full">
          {/* Always render the image container; never hide it. Use loading="eager"
              to ensure the image starts loading even if initially off-screen. */}
          <a
            href={attachment.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-full"
            style={imgRatio ? { aspectRatio: imgRatio, maxHeight: 256 } : undefined}
          >
            <Image
              ref={imgRef as unknown as React.Ref<HTMLImageElement>}
              src={attachment.signedUrl}
              alt={attachment.filename ?? "Image"}
              fill
              sizes="260px"
              loading="eager"
              className={cn("object-cover transition-opacity", imgLoading ? "opacity-0" : "opacity-100 hover:opacity-90")}
              onLoad={() => {
                const el = imgRef.current;
                if (el && el.naturalWidth > 0 && el.naturalHeight > 0) {
                  setImgRatio(`${el.naturalWidth} / ${el.naturalHeight}`);
                }
                setImgLoading(false);
              }}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
            />
            {/* Loading spinner as overlay, not by hiding the container */}
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
                <Loader2 className="h-5 w-5 animate-spin text-ink-400" />
              </div>
            )}
          </a>
        </div>
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
  progress = 0,
  error,
  onRetry,
}: {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
  status: "queued" | "uploading" | "success" | "error";
  progress?: number;
  error?: string;
  onRetry?: () => void;
}) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="relative flex w-36 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="relative h-24 w-full overflow-hidden bg-void-900/30">
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-8 w-8 text-ink-400" />
          </div>
        )}
        {status === "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-void-900/60 p-2 backdrop-blur-[2px]">
            <Loader2 className="h-5 w-5 animate-spin text-white mb-1.5" />
            <div className="h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-accent transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <span className="mt-1 text-[10px] font-medium text-white tabular-nums">{progress}%</span>
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-void-900/80 text-white backdrop-blur hover:bg-red-500 transition-colors"
          aria-label="Remove attachment"
        >
          <span aria-hidden className="text-sm leading-none">&times;</span>
        </button>
      </div>
      <div className="p-2">
        <p className="truncate text-[11px] font-medium text-ink-50" title={file.name}>{file.name}</p>
        <p className="text-[10px] text-ink-500">{formatChatFileSize(file.size)}</p>
        {status === "error" && (
          <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-red-400">
            <div className="flex items-center gap-1 min-w-0">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="truncate" title={error ?? "Upload failed"}>{error ?? "Failed"}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-0.5 shrink-0 font-semibold text-accent hover:underline ml-1"
                title="Retry upload"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
