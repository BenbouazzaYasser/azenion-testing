"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { X, Eye, EyeOff, FileText, Image as ImageIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatChatFileSize } from "@/lib/chat-media";
import { useUploadProgress } from "@/components/chat/chat-upload";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
  _spoiler?: boolean;
  _tags?: string[];
}

interface AttachmentPreviewBarProps {
  imageQueue: QueuedFile[];
  fileQueue: QueuedFile[];
  activeAttachmentId: string | null;
  maxAttachments: number;
  onRemoveImage: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  onSetActive: (id: string) => void;
  onToggleSpoiler: (id: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onRetry: (id: string) => void;
  disabled?: boolean;
}

function SpoilerToggle({ 
  isSpoiler, 
  onToggle, 
  disabled 
}: { 
  isSpoiler: boolean; 
  onToggle: () => void; 
  disabled?: boolean 
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
        isSpoiler 
          ? "bg-accent/10 text-accent hover:bg-accent/20" 
          : "bg-surface/50 text-ink-400 hover:bg-surface hover:text-ink-50",
        "disabled:opacity-40 disabled:cursor-not-allowed"
      )}
      title={isSpoiler ? "Remove spoiler" : "Mark as spoiler"}
      aria-label={isSpoiler ? "Remove spoiler" : "Mark as spoiler"}
      aria-pressed={isSpoiler}
    >
      {isSpoiler ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </button>
  );
}

// Memoized leaf: progress is read from the fine-grained store, so a progress
// tick re-renders only this thumbnail. Handlers are id-based and stable, so
// the memo survives parent renders (e.g. typing while uploading).
const ImageThumbnail = memo(function ImageThumbnail({
  file,
  isActive,
  onActivate,
  onRemove,
  onToggleSpoiler,
  onRetry,
  disabled,
}: {
  file: QueuedFile;
  isActive: boolean;
  onActivate: (id: string) => void;
  onRemove: (e: React.MouseEvent, id: string) => void;
  onToggleSpoiler: (id: string) => void;
  onRetry: (id: string) => void;
  disabled?: boolean;
}) {
  const progress = useUploadProgress(file.id);
  const error = file.error;
  const tags = file._tags ?? [];
  const isSpoiler = file._spoiler ?? false;
  return (
    <div
      className={cn(
        "relative flex-shrink-0 flex-col items-center rounded-xl border-2 overflow-hidden transition-all",
        isActive 
          ? "border-accent-400 ring-2 ring-accent/20"
          : "border-border hover:border-accent-400/30",
        isSpoiler ? "opacity-60" : ""
      )}
      onClick={() => onActivate(file.id)}
      title={file.file.name}
    >
      <div className="relative h-20 w-28 overflow-hidden bg-scrim/30">
        {file.previewUrl ? (
          <img 
            src={file.previewUrl} 
            alt={file.file.name} 
            className="h-full w-full object-cover transition-opacity"
            style={isSpoiler ? { filter: "blur(8px)" } : undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-ink-400" />
          </div>
        )}
        {isSpoiler && (
          <div className="absolute inset-0 flex items-center justify-center bg-scrim/50">
            <EyeOff className="h-5 w-5 text-white/70" />
          </div>
        )}
        {file.status === "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-scrim/60 p-2">
            <div className="h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-accent transition-all duration-150"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums text-white">{progress}%</span>
          </div>
        )}
        {file.status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-scrim/70 p-1">
            <span className="max-w-full truncate px-1 text-[10px] text-red-400" title={error ?? "Upload failed"}>
              {error ?? "Failed"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(file.id);
              }}
              className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-accent-500"
            >
              Retry
            </button>
          </div>
        )}
        {tags.length > 0 && (
          <div className="absolute bottom-1 right-1 flex gap-0.5">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="h-3.5 px-1.5 text-[9px] font-medium rounded bg-accent/90 text-white/90">{tag}</span>
            ))}
            {tags.length > 2 && (
              <span className="h-3.5 px-1.5 text-[9px] font-medium rounded bg-ink-500/50 text-white/70">+{tags.length - 2}</span>
            )}
          </div>
        )}
        <SpoilerToggle 
          isSpoiler={isSpoiler} 
          onToggle={() => onToggleSpoiler(file.id)}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        onClick={(e) => onRemove(e, file.id)}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-scrim/80 text-white backdrop-blur hover:bg-red-500 transition-colors"
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});

const FileChip = memo(function FileChip({
  file,
  isActive,
  onActivate,
  onRemove,
  onRetry,
  disabled,
}: {
  file: QueuedFile;
  isActive: boolean;
  onActivate: (id: string) => void;
  onRemove: (e: React.MouseEvent, id: string) => void;
  onRetry: (id: string) => void;
  disabled?: boolean;
}) {
  const error = file.error;
  const tags = file._tags ?? [];
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all",
        isActive 
          ? "border-accent-400 bg-accent/5 ring-2 ring-accent/20"
          : "border-border bg-surface hover:border-accent-400/30"
      )}
      onClick={() => onActivate(file.id)}
      title={`${file.file.name} — ${formatChatFileSize(file.file.size)}`}
    >
      <FileText className={cn("h-4 w-4 shrink-0", isActive ? "text-accent" : "text-ink-400")} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isActive ? "text-ink-50" : "text-ink-400")}>{file.file.name}</p>
        <p className={cn("truncate text-[11px]", isActive ? "text-white/60" : "text-ink-500")}>{formatChatFileSize(file.file.size)}</p>
      </div>
      {tags.length > 0 && (
        <span className="flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
          <Tag className="h-2.5 w-2.5" />
          {tags.length === 1 ? tags[0] : `${tags.length} tags`}
        </span>
      )}
      {file.status === "error" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry(file.id);
          }}
          title={error ?? "Upload failed"}
          className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-accent-500"
        >
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={(e) => onRemove(e, file.id)}
        className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors", isActive ? "text-white hover:bg-red-500" : "text-ink-400 hover:text-red-500 hover:bg-red-500/10")}
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});

function TagComposer({ 
  activeFile, 
  onAddTag, 
  onRemoveTag, 
  maxTags = 3,
  disabled 
}: { 
  activeFile: QueuedFile | null; 
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  maxTags?: number;
  disabled?: boolean;
}) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const tags = activeFile?._tags || [];
  const isAtLimit = tags.length >= maxTags;

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowInput(false);
      }
    }
    if (showInput) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInput]);

  if (!activeFile) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onAddTag(inputValue.trim());
      setInputValue("");
      setShowInput(false);
    } else if (e.key === "Escape") {
      setShowInput(false);
      setInputValue("");
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onAddTag(inputValue.trim());
      setInputValue("");
      setShowInput(false);
    }
  };

  return (
    <div className="flex items-center gap-2" ref={popoverRef}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              disabled={disabled}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-accent/20 transition-colors disabled:opacity-40"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>

      {!isAtLimit && !disabled && (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          disabled={tags.length >= maxTags}
          className="flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-sm font-medium text-ink-400 hover:border-accent-400/50 hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Add tag</span>
        </button>
      )}

      {showInput && (
        <div className="relative flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
            placeholder="Tag name"
            maxLength={20}
            className="h-7 w-32 rounded-full border border-border bg-surface px-3 py-0.5 text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="flex h-7 items-center justify-center rounded-full bg-accent px-2.5 text-white text-sm font-medium hover:bg-accent-500 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

// Memoized so draft-text keystrokes / unrelated parent renders skip the whole
// bar (its props are stable refs + stable handlers); thumbnails/chips are
// memoized leaves on top of that.
export const AttachmentPreviewBar = memo(function AttachmentPreviewBar({
  imageQueue,
  fileQueue,
  activeAttachmentId,
  maxAttachments,
  onRemoveImage,
  onRemoveFile,
  onClearAll,
  onSetActive,
  onToggleSpoiler,
  onAddTag,
  onRemoveTag,
  onRetry,
  disabled = false,
}: AttachmentPreviewBarProps) {
  const totalQueued = imageQueue.length + fileQueue.length;
  const allAttachments = [...imageQueue, ...fileQueue];

  const handleActivate = useCallback((id: string) => onSetActive(id), [onSetActive]);
  const handleRemoveImage = useCallback(
    (_e: React.MouseEvent, id: string) => onRemoveImage(id),
    [onRemoveImage],
  );
  const handleRemoveFile = useCallback(
    (_e: React.MouseEvent, id: string) => onRemoveFile(id),
    [onRemoveFile],
  );
  const handleToggleSpoiler = useCallback((id: string) => onToggleSpoiler(id), [onToggleSpoiler]);
  const handleRetry = useCallback((id: string) => onRetry(id), [onRetry]);

  if (totalQueued === 0) {
    return null;
  }

  const activeFile = allAttachments.find((f) => f.id === activeAttachmentId) ?? null;

  return (
    <div className="relative flex flex-col gap-2 w-full max-w-xl mx-auto px-2">
      {/* Image queue thumbnails */}
      <div className="flex items-start gap-2 overflow-x-auto pb-1 pr-2" role="list" aria-label="Image attachments">
        {imageQueue.map((file) => (
          <ImageThumbnail
            key={file.id}
            file={file}
            isActive={activeAttachmentId === file.id}
            onActivate={handleActivate}
            onRemove={handleRemoveImage}
            onToggleSpoiler={handleToggleSpoiler}
            onRetry={handleRetry}
            disabled={disabled}
          />
        ))}
        {fileQueue.map((file) => (
          <FileChip
            key={file.id}
            file={file}
            isActive={activeAttachmentId === file.id}
            onActivate={handleActivate}
            onRemove={handleRemoveFile}
            onRetry={handleRetry}
            disabled={disabled}
          />
        ))}
        {totalQueued > 1 && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled}
            className={cn(
              "flex-shrink-0 flex h-20 w-28 items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/50 text-sm font-medium text-ink-400 transition-colors hover:border-accent-400/50 hover:text-accent-400 hover:bg-accent/5 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Tag composer for active attachment */}
      <TagComposer
        activeFile={activeFile}
        onAddTag={(tag) => {
          if (activeFile) onAddTag(activeFile.id, tag);
        }}
        onRemoveTag={(tag) => {
          if (activeFile) onRemoveTag(activeFile.id, tag);
        }}
        maxTags={3}
        disabled={disabled}
      />

      {/* Attachment count indicator */}
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>{totalQueued} / {maxAttachments} attachments</span>
        {totalQueued >= maxAttachments && (
          <span className="text-accent font-medium">Limit reached</span>
        )}
      </div>
    </div>
  );
});