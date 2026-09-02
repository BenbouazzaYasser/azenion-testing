"use client";

import { useState } from "react";
import { FileText, Download, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChatFileSize } from "@/lib/chat-media";
import type { ChatAttachmentForMessage } from "@/data/chat";

interface ChatAttachmentProps {
  attachment: ChatAttachmentForMessage;
  isOwn?: boolean;
}

export function ChatAttachment({ attachment, isOwn }: ChatAttachmentProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const isImage = attachment.type === "image" && attachment.mime_type?.startsWith("image/");

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
