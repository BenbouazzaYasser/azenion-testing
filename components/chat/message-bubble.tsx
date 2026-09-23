"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatTime } from "@/lib/date";
import { editMessage, deleteMessage } from "@/actions/chat.actions";
import { MessageStatus, type MessageStatusKind } from "@/components/chat/message-status";
import { ChatAttachment } from "@/components/chat/chat-attachment";
import type { ChatAttachmentForMessage } from "@/data/chat";

interface MessageBubbleProps {
  id: string;
  content: string;
  created_at: string | null;
  edited_at: string | null;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  isOwn: boolean;
  isGrouped?: boolean;
  showAvatar?: boolean;
  status?: MessageStatusKind | null;
  statusAvatarUrl?: string | null;
  statusAvatarName?: string | null;
  active?: boolean;
  showActions?: boolean;
  onSelect?: (id: string) => void;
  onToggleActions?: (id: string) => void;
  /** Called after a successful local delete so the parent can drop the message. */
  onDeleted?: (id: string) => void;
  attachments?: ChatAttachmentForMessage[];
}

function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const withoutWs = trimmed.replace(/\s/g, "");
  if (withoutWs.length === 0) return false;
  if (withoutWs.length > 30) return false;
  if (/[a-zA-Z0-9]/.test(trimmed)) return false;
  const hasEmoji = /\p{Extended_Pictographic}/u.test(withoutWs);
  if (!hasEmoji) return false;
  const emojiOnlyRegex = /^[\p{Emoji}\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u;
  return emojiOnlyRegex.test(trimmed);
}

// Haven-style flat message row: avatar on the first message of a run,
// name + time header on the first of a group, plain text body — no bubbles.
export const MessageBubble = memo(function MessageBubble({
  id,
  content,
  created_at,
  edited_at,
  sender_id,
  sender_name,
  sender_avatar,
  isOwn,
  isGrouped = false,
  showAvatar = true,
  status = null,
  statusAvatarUrl = null,
  statusAvatarName = null,
  active = false,
  showActions = false,
  onSelect,
  onToggleActions,
  onDeleted,
  attachments = [],
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);

  const handleEdit = async () => {
    if (!editText.trim() || editText === content) {
      setIsEditing(false);
      return;
    }
    const result = await editMessage(id, editText);
    if (!result.error) {
      setIsEditing(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    const result = await deleteMessage(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      onDeleted?.(id);
    }
  };

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`Message from ${sender_name ?? "unknown sender"}`}
      onClick={() => onSelect?.(id)}
      onFocus={() => onSelect?.(id)}
      onDoubleClick={() => onToggleActions?.(id)}
      className={cn(
        "group relative flex items-start gap-3 rounded-lg px-3 py-0.5 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/40",
        "hover:bg-surface/40",
        active && "bg-surface/40",
      )}
    >
      <div className="w-10 shrink-0 pt-1.5">
        {showAvatar ? (
          sender_avatar ? (
            <Image
              src={sender_avatar}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-xs font-semibold text-white">
              {sender_name?.[0]?.toUpperCase() ?? "U"}
            </span>
          )
        ) : null}
      </div>

      <div className="min-w-0 flex-1 pb-0.5">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 pt-1">
            <span
              className={cn(
                "truncate text-sm font-semibold leading-tight",
                isOwn ? "text-accent-300" : "text-ink-100",
              )}
            >
              {sender_name ?? "Unknown"}
            </span>
            {/* suppressHydrationWarning: formatTime is locale-TZ dependent; server renders UTC. */}
            <span suppressHydrationWarning className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium leading-tight text-ink-600">
              {created_at ? formatTime(created_at) : null}
              {edited_at ? <span className="italic">(edited)</span> : null}
            </span>
          </div>
        )}

        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2 py-1">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="w-full rounded-lg border border-accent-400/50 bg-surface px-3 py-2 text-sm text-ink-50 outline-none ring-1 ring-accent-400/30 focus:ring-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-glow"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditText(content);
                }}
                className="rounded-lg px-3 py-1 text-xs font-medium text-ink-400 transition-colors hover:text-ink-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          (() => {
            const emojiOnly = isEmojiOnly(content) && attachments.length === 0;
            const graphemeCount = emojiOnly ? Array.from(content.trim().replace(/\s/g, "")).length : 0;
            const emojiSize = graphemeCount <= 3 ? "text-4xl" : graphemeCount <= 6 ? "text-3xl" : "text-2xl";
            return (
              <div className="mt-0.5 min-w-0">
                {attachments.length > 0 && (
                  <div className="mb-1 flex flex-col gap-2">
                    {attachments.map((att) => (
                      <ChatAttachment key={att.id} attachment={att} isOwn={isOwn} />
                    ))}
                  </div>
                )}
                {content.trim().length > 0 && (
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words text-sm leading-relaxed",
                      emojiOnly
                        ? `${emojiSize} leading-none`
                        : isOwn
                          ? "text-ink-100"
                          : "text-ink-200",
                    )}
                  >
                    {content}
                    {isGrouped && created_at ? (
                      <span suppressHydrationWarning className="ml-2 inline-block align-baseline text-[10px] font-medium text-ink-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {formatTime(created_at)}
                      </span>
                    ) : null}
                  </p>
                )}
                {isOwn && status ? (
                  <span className="mt-[3px] flex items-center text-ink-500">
                    <MessageStatus
                      status={status}
                      avatarUrl={statusAvatarUrl}
                      avatarName={statusAvatarName}
                      className={cn(status === "seen" ? "" : "h-3.5 w-3.5 text-ink-500")}
                    />
                  </span>
                ) : null}
              </div>
            );
          })()
        )}
      </div>

      {isOwn && !isEditing && (
        <div
          className={cn(
            "absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-void-900/95 p-1 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.8)] backdrop-blur transition-all duration-200 ease-premium",
            "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
            showActions
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-95 opacity-0",
          )}
        >
          <button
            type="button"
            aria-label="Edit message"
            title="Edit"
            onClick={() => {
              setEditText(content);
              setIsEditing(true);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors duration-200 ease-premium hover:bg-surface-hover hover:text-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Delete message"
            title="Delete"
            onClick={handleDelete}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors duration-200 ease-premium hover:bg-red-400/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
})