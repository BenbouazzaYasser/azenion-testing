"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatTime } from "@/lib/date";
import { editMessage, deleteMessage } from "@/actions/chat.actions";

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
  active?: boolean;
  onSelect?: (id: string) => void;
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
  active = false,
  onSelect,
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
      {isGrouped ? (
        <span aria-hidden className="w-8 shrink-0" />
      ) : sender_avatar ? (
        <img
          src={sender_avatar}
          alt=""
          className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-border-strong/[0.12] object-cover"
        />
      ) : (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-[11px] font-semibold text-white">
          {sender_name?.[0]?.toUpperCase() ?? "U"}
        </span>
      )}

      <div className={cn("max-w-[75%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && !isGrouped && sender_name && (
          <p className="mb-1 px-0.5 text-xs font-medium text-ink-400">
            {sender_name}
          </p>
        )}

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
                className="rounded-lg border border-border-strong px-3 py-1 text-xs font-medium text-ink-400 transition-colors hover:text-ink-50"
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
            className={cn(
              "cursor-pointer rounded-2xl px-4 py-2.5 text-sm leading-relaxed backdrop-blur-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2",
              isOwn
                ? "rounded-br-md border border-accent-300/25 bg-gradient-to-br from-accent to-accent-glow text-white shadow-[0_10px_28px_-12px_rgba(40,40,255,0.55)] focus-visible:ring-accent-300/40"
                : "rounded-bl-md border border-border-strong bg-[linear-gradient(135deg,rgb(var(--surface)/0.5),rgb(var(--surface)/0.3))] text-ink-300 shadow-[0_8px_20px_-14px_rgba(0,0,0,0.85)] focus-visible:ring-accent-400/40",
            )}
          >
            <p className="whitespace-pre-wrap break-words">{content}</p>
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
                        "text-[10px] font-medium leading-none tracking-wide",
                        isOwn ? "text-white/70" : "text-ink-600",
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

        {isOwn && !isEditing && (
          <div
            className={cn(
              "mt-1 flex justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100",
              isGrouped && "mb-2",
            )}
          >
            <button
              type="button"
              aria-label="Edit message"
              onClick={() => {
                setEditText(content);
                setIsEditing(true);
              }}
              className="inline-flex min-h-9 items-center rounded-md px-2 py-0.5 text-[10px] font-medium text-ink-600 transition-colors duration-200 ease-premium hover:bg-surface-hover hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
            >
              Edit
            </button>
            <button
              type="button"
              aria-label="Delete message"
              onClick={handleDelete}
              className="inline-flex min-h-9 items-center rounded-md px-2 py-0.5 text-[10px] font-medium text-ink-600 transition-colors duration-200 ease-premium hover:bg-red-400/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
