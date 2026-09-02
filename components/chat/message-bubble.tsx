"use client";

import { useState } from "react";
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
  attachments?: ChatAttachmentForMessage[];
}

export function MessageBubble({
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
  attachments = [],
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);
  const [showMenu, setShowMenu] = useState(false);

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
    setShowMenu(false);
    if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div className={cn("group flex items-start gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
      {showAvatar ? (
        sender_avatar ? (
          <img
            src={sender_avatar}
            alt=""
            className="mt-2.5 h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="mt-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-[11px] font-semibold text-white">
            {sender_name?.[0]?.toUpperCase() ?? "U"}
          </span>
        )
      ) : (
        <span aria-hidden className="w-8 shrink-0" />
      )}

      <div className={cn("relative max-w-[75%]", isOwn ? "items-end" : "items-start")}>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="w-full rounded-xl border border-accent-400/50 bg-surface px-3 py-2.5 text-sm text-ink-50 outline-none ring-1 ring-accent-400/30 focus:ring-2"
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
          <div
            tabIndex={0}
            role="group"
            aria-label={`Message from ${sender_name ?? "unknown sender"}`}
            onClick={() => onSelect?.(id)}
            onFocus={() => onSelect?.(id)}
            onDoubleClick={() => onToggleActions?.(id)}
            className={cn(
              "cursor-pointer rounded-2xl px-3.5 py-2 text-sm leading-relaxed backdrop-blur-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2",
              isOwn
                ? "rounded-br-none border border-accent-300/25 bg-gradient-to-br from-accent to-accent-glow text-white shadow-[0_10px_28px_-12px_rgba(40,40,255,0.55)] focus-visible:ring-accent-300/40"
                : "rounded-bl-none bg-surface/80 text-ink-50 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.7)] focus-visible:ring-accent-400/40",
            )}
          >
            {attachments.length > 0 && (
              <div className="mb-1 flex flex-col gap-2">
                {attachments.map((att) => (
                  <ChatAttachment key={att.id} attachment={att} isOwn={isOwn} />
                ))}
              </div>
            )}
            {content.trim().length > 0 && <p className="whitespace-pre-wrap break-words">{content}</p>}
            <div
              aria-hidden={!active}
              className="grid transition-[grid-template-rows] duration-200 ease-premium"
              style={{ gridTemplateRows: active ? "1fr" : "0fr" }}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "flex justify-end pt-1.5 transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0",
                  )}
                >
                  {created_at && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium leading-none tracking-wide",
                        isOwn ? "text-white/70" : "text-ink-500",
                      )}
                    >
                      {edited_at && <span className="opacity-80">edited&nbsp;&bull;&nbsp;</span>}
                      {formatTime(created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isOwn && status && !isEditing && (
          <div className="mt-[5px] flex justify-end pr-1">
            <MessageStatus
              status={status}
              avatarUrl={statusAvatarUrl}
              avatarName={statusAvatarName}
              className={cn(status === "seen" ? "" : "text-ink-400")}
            />
          </div>
        )}

        {isOwn && !isEditing && (
          <div
            className={cn(
              "absolute right-0 -top-[40px] z-20 flex items-center gap-0.5 rounded-full bg-void-900/95 p-1 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.8)] backdrop-blur transition-all duration-200 ease-premium",
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
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition-colors duration-200 ease-premium hover:bg-surface-hover hover:text-accent-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete message"
              title="Delete"
              onClick={handleDelete}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition-colors duration-200 ease-premium hover:bg-red-400/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
