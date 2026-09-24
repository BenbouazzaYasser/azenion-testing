"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Send, Mic, Square, Trash2, Play, Pause, Plus, Smile, Ban, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AttachmentPreviewBar } from "@/components/chat/attachment-preview-bar";
import { RecordingTimer } from "@/components/chat/recording-timer";
import { CHAT_IMAGE_MIMES, CHAT_FILE_MIMES } from "@/lib/chat-media";
import type { UseVoiceRecorderReturn } from "@/hooks/useVoiceRecorder";
import type { GifResult } from "@/lib/gif/provider";
import type { Sticker as StickerType } from "@/lib/stickers/catalog";
import { toast } from "sonner";
import nextDynamic from "next/dynamic";

// Picker menus only render when opened — keep them out of the
// conversation bundle until first use.
const EmojiPicker = nextDynamic(
  () => import("@/components/chat/emoji-picker").then((m) => m.EmojiPicker),
  { ssr: false },
);
const GifPicker = nextDynamic(
  () => import("@/components/chat/gif-picker").then((m) => m.GifPicker),
  { ssr: false },
);
const StickerPicker = nextDynamic(
  () => import("@/components/chat/sticker-picker").then((m) => m.StickerPicker),
  { ssr: false },
);
const AttachmentMenu = nextDynamic(
  () => import("@/components/chat/attachment-menu").then((m) => m.AttachmentMenu),
  { ssr: false },
);

const MAX_ATTACHMENTS = 10;

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
  _spoiler?: boolean;
  _tags?: string[];
}

/**
 * Imperative handle: the parent clears the draft once a send is actually
 * accepted (validation passed) and restores it if a blob/file send fails and
 * needs the typed text back.
 */
export interface ChatComposerHandle {
  clearDraft(): void;
  restoreDraft(text: string): void;
}

interface ChatComposerProps {
  participantName: string;
  participantUsername: string | null;
  amBlocked: boolean;
  voice: UseVoiceRecorderReturn;
  isSending: boolean;
  imageQueue: QueuedFile[];
  fileQueue: QueuedFile[];
  activeAttachmentId: string | null;
  onSendText: (content: string) => void;
  onSendVoice: () => void;
  onMicClick: () => void;
  onCancelVoice: () => void;
  onDiscardVoice: () => void;
  onGifSelect: (gif: GifResult, content: string) => void;
  onStickerSelect: (sticker: StickerType, content: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onRemoveQueued: (id: string) => void;
  onClearAll: () => void;
  onSetActive: (id: string) => void;
  onToggleSpoiler: (id: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onRetryQueued: (id: string) => void;
}

/**
 * Isolated composer leaf (pillar 4: high-frequency state uncoupled from the
 * message tree). Every draft/picker/preview state lives HERE, so typing
 * re-renders only this leaf — the parent's message list, header, realtime
 * channels and virtualizer never re-render per keystroke.
 */
export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(props, ref) {
    const {
      participantName,
      participantUsername,
      amBlocked,
      voice,
      isSending,
      imageQueue,
      fileQueue,
      activeAttachmentId,
      onSendText,
      onSendVoice,
      onMicClick,
      onCancelVoice,
      onDiscardVoice,
      onGifSelect,
      onStickerSelect,
      onAddFiles,
      onPaste,
      onRemoveQueued,
      onClearAll,
      onSetActive,
      onToggleSpoiler,
      onAddTag,
      onRemoveTag,
      onRetryQueued,
    } = props;

    // High-frequency state lives here, isolated from the conversation tree.
    const [draft, setDraft] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [previewReady, setPreviewReady] = useState(false);

    // When the recorder's blob is consumed/cleared (send, discard, cancel),
    // the preview it referenced is gone — reset playback state so a stale
    // "playing" indicator never leaks into the next recording.
    useEffect(() => {
      if (!voice.blob) {
        setIsPlayingPreview(false);
        setPreviewReady(false);
      }
    }, [voice.blob]);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiContainerRef = useRef<HTMLDivElement>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    useImperativeHandle(ref, () => ({
      clearDraft: () => setDraft(""),
      restoreDraft: (text) => setDraft(text),
    }));

    const closeAllPickers = useCallback(() => {
      setShowEmojiPicker(false);
      setShowGifPicker(false);
      setShowStickerPicker(false);
      setShowAttachmentMenu(false);
    }, []);

    // Close any open picker on outside click or Escape.
    useEffect(() => {
      if (!showEmojiPicker && !showGifPicker && !showStickerPicker && !showAttachmentMenu) return;
      function handleOutside(e: MouseEvent) {
        if (emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
          closeAllPickers();
        }
      }
      function handleEsc(e: KeyboardEvent) {
        if (e.key === "Escape") closeAllPickers();
      }
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleEsc);
      return () => {
        document.removeEventListener("mousedown", handleOutside);
        document.removeEventListener("keydown", handleEsc);
      };
    }, [showEmojiPicker, showGifPicker, showStickerPicker, showAttachmentMenu, closeAllPickers]);

    // Caret-aware emoji insert at the textarea's selection point.
    const insertEmoji = useCallback(
      (emoji: string) => {
        const el = inputRef.current;
        if (!el) {
          setDraft((prev) => prev + emoji);
          return;
        }
        const start = el.selectionStart ?? draft.length;
        const end = el.selectionEnd ?? draft.length;
        setDraft(draft.slice(0, start) + emoji + draft.slice(end));
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + emoji.length;
          try {
            el.setSelectionRange(pos, pos);
          } catch {}
        });
      },
      [draft],
    );

    const stopPreviewAudio = () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };

    const handleCancelVoice = () => {
      stopPreviewAudio();
      setIsPlayingPreview(false);
      onCancelVoice();
    };

    const handleDiscardVoice = () => {
      stopPreviewAudio();
      setIsPlayingPreview(false);
      onDiscardVoice();
    };

    const togglePreviewPlayback = () => {
      const el = previewAudioRef.current;
      if (!el || !voice.previewUrl || !previewReady) return;
      if (isPlayingPreview) {
        el.pause();
      } else {
        el.play().catch(() => toast.error("Could not play preview"));
      }
    };

    const canSend = draft.trim().length > 0 || imageQueue.length > 0 || fileQueue.length > 0;

    const submit = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (isSending) return;
      if (voice.isRecording || voice.blob) return;
      if (!canSend) return;
      const content = draft;
      // Cleared here; the parent restores it via the handle if the send is
      // rejected before being accepted (e.g. a failed blob upload).
      setDraft("");
      onSendText(content);
    };

    const handleMicButton = () => {
      closeAllPickers();
      onMicClick();
    };

    const handleGif = (gif: GifResult) => {
      closeAllPickers();
      onGifSelect(gif, draft);
    };

    const handleSticker = (sticker: StickerType) => {
      closeAllPickers();
      onStickerSelect(sticker, draft);
    };

    return (
      <div className="relative z-10 shrink-0 border-0 bg-[linear-gradient(180deg,rgb(var(--surface)/0.3),rgb(var(--surface)/0.88))] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-4 sm:pt-3 md:backdrop-blur-xl">
        {amBlocked ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-surface/70 px-4 py-3.5 text-center"
          >
            <Ban className="h-4 w-4 shrink-0 text-ink-500" />
            <p className="text-sm text-ink-400">
              You can&apos;t send messages to @{participantUsername ?? participantName} because they blocked
              you.
            </p>
          </div>
        ) : voice.isRecording ? (
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            <RecordingTimer startedAt={voice.startedAt} />
            <span className="text-xs text-ink-500">Recording…</span>
            <Button
              type="button"
              variant="secondary"
              aria-label="Cancel recording"
              onClick={handleCancelVoice}
              className="h-10 w-10 shrink-0 rounded-lg p-0"
            >
              <Trash2 size={16} />
            </Button>
            <Button
              type="button"
              aria-label="Stop recording"
              onClick={() => voice.stop()}
              className="h-10 w-10 shrink-0 rounded-lg p-0"
            >
              <Square size={14} />
            </Button>
          </div>
        ) : voice.blob && voice.previewUrl ? (
          <div className="flex flex-col gap-2">
            {voice.error && <p className="text-xs text-red-400">{voice.error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
                aria-busy={!previewReady}
                disabled={!previewReady}
                onClick={togglePreviewPlayback}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:pointer-events-none disabled:opacity-50"
              >
                {previewReady ? (
                  isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />
                ) : (
                  <Loader2 size={16} className="animate-spin" />
                )}
              </button>
              <div className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink-50">
                Voice message • {Math.floor(voice.duration / 60)}:{String(voice.duration % 60).padStart(2, "0")}{" "}
                • {Math.round(voice.blob.size / 1024)} KB
              </div>
              <audio
                ref={(el) => {
                  previewAudioRef.current = el;
                  if (el) {
                    el.onplay = () => setIsPlayingPreview(true);
                    el.onpause = () => setIsPlayingPreview(false);
                    el.onended = () => setIsPlayingPreview(false);
                  }
                }}
                src={voice.previewUrl}
                preload="auto"
                onCanPlay={() => setPreviewReady(true)}
                onError={() => setPreviewReady(false)}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                aria-label="Discard voice message"
                onClick={handleDiscardVoice}
                className="h-10 w-10 shrink-0 rounded-lg p-0"
              >
                <Trash2 size={16} />
              </Button>
              <Button
                type="button"
                aria-label="Send voice message"
                onClick={onSendVoice}
                disabled={isSending}
                className="h-10 w-10 shrink-0 rounded-lg p-0"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div ref={emojiContainerRef} className="relative">
            {(imageQueue.length > 0 || fileQueue.length > 0) && (
              <div className="mb-3">
                <AttachmentPreviewBar
                  imageQueue={imageQueue}
                  fileQueue={fileQueue}
                  activeAttachmentId={activeAttachmentId}
                  maxAttachments={MAX_ATTACHMENTS}
                  onRemoveImage={onRemoveQueued}
                  onRemoveFile={onRemoveQueued}
                  onClearAll={onClearAll}
                  onSetActive={onSetActive}
                  onToggleSpoiler={onToggleSpoiler}
                  onAddTag={onAddTag}
                  onRemoveTag={onRemoveTag}
                  onRetry={onRetryQueued}
                />
              </div>
            )}
            {voice.error && <p className="mb-2 text-xs text-red-400">{voice.error}</p>}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 z-30 mb-2">
                <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}
            {showGifPicker && (
              <div className="absolute bottom-full left-0 z-30 mb-2 max-w-[calc(100vw-3rem)] sm:left-16">
                <GifPicker onSelect={handleGif} onClose={() => setShowGifPicker(false)} />
              </div>
            )}
            {showStickerPicker && (
              <div className="absolute bottom-full left-0 z-30 mb-2 max-w-[calc(100vw-3rem)] sm:left-32">
                <StickerPicker onSelect={handleSticker} onClose={() => setShowStickerPicker(false)} />
              </div>
            )}
            <form className={cn("flex items-center", showAttachmentMenu ? "gap-0.5 sm:gap-2" : "gap-1.5 sm:gap-2")} onSubmit={submit}>
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept={CHAT_IMAGE_MIMES.join(",")}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    onAddFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={CHAT_FILE_MIMES.join(",")}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    onAddFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              {/* + menu - Messenger compact */}
              <div className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-1 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                    showAttachmentMenu ? "max-w-[220px] opacity-100 sm:max-w-[260px]" : "max-w-0 opacity-0",
                  )}
                  aria-hidden={!showAttachmentMenu}
                >
                  <AttachmentMenu
                    onSelectImages={() => imageInputRef.current?.click()}
                    onSelectFiles={() => fileInputRef.current?.click()}
                    onClose={() => setShowAttachmentMenu(false)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  aria-label={showAttachmentMenu ? "Close attachment menu" : "Open attachment menu"}
                  aria-expanded={showAttachmentMenu}
                  aria-haspopup="menu"
                  onClick={() => {
                    const next = !showAttachmentMenu;
                    setShowAttachmentMenu(next);
                    // Close only the OTHER pickers — closing this one in the
                    // same batch would cancel the open (last update wins).
                    if (next) {
                      setShowEmojiPicker(false);
                      setShowGifPicker(false);
                      setShowStickerPicker(false);
                    }
                  }}
                  disabled={!!voice.blob || voice.isRecording}
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-lg border border-border-strong p-0 transition-colors duration-200 ease-out",
                    showAttachmentMenu
                      ? "bg-accent text-white rotate-45"
                      : "bg-surface text-ink-600 hover:bg-surface-hover hover:text-ink-50",
                  )}
                >
                  <Plus size={18} className={cn("transition-transform duration-300", showAttachmentMenu && "rotate-90")} />
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="default"
                aria-label="Open emoji picker"
                onClick={() => {
                  const next = !showEmojiPicker;
                  setShowEmojiPicker(next);
                  // Same batching rule as the + button above.
                  if (next) {
                    setShowAttachmentMenu(false);
                    setShowGifPicker(false);
                    setShowStickerPicker(false);
                  }
                }}
                disabled={!!voice.blob || voice.isRecording}
                className="h-11 w-11 shrink-0 rounded-lg border border-border-strong p-0 bg-surface text-ink-600 hover:bg-surface-hover hover:text-ink-50 disabled:opacity-50"
              >
                <Smile size={17} />
              </Button>
              <textarea
                ref={inputRef}
                aria-label="Type a message"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPaste={onPaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                disabled={!!voice.blob || voice.isRecording}
                rows={1}
                enterKeyHint="send"
                className="min-w-0 flex-1 resize-none rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-base leading-5 text-ink-50 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-accent-400/40 disabled:opacity-50 max-h-24 overflow-y-auto sm:text-sm"
              />
              {canSend ? (
                <Button type="submit" aria-label="Send message" disabled={isSending} className="h-11 w-11 shrink-0 rounded-lg p-0">
                  <Send size={16} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Record voice message"
                  onClick={handleMicButton}
                  disabled={!voice.isSupported || isSending}
                  className="h-11 w-11 shrink-0 rounded-lg border border-border-strong p-0 bg-surface text-ink-600 hover:bg-surface-hover disabled:opacity-50"
                  title={!voice.isSupported ? "Voice not supported in this browser" : "Record voice message"}
                >
                  <Mic size={17} />
                </Button>
              )}
            </form>
          </div>
        )}
      </div>
    );
  },
);