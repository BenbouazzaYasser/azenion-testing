"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate, formatDistanceToNow } from "@/lib/date";
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
    }
  };

  const handleDelete = async () => {
    await deleteMessage(id);
    setShowMenu(false);
  };

  return (
    <div className={cn("group flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
      {sender_avatar ? (
        <img
          src={sender_avatar}
          alt=""
          className="mt-1 h-8 w-8 shrink-0 rounded-full border border-white/[0.12] object-cover"
        />
      ) : (
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-gradient-to-br from-accent-500 to-accent-400 text-[11px] font-semibold text-white">
          {sender_name?.[0]?.toUpperCase() ?? "U"}
        </span>
      )}

      <div className={cn("max-w-[75%]", isOwn ? "items-end" : "items-start")}>
        {!isOwn && sender_name && (
          <p className="mb-1 px-1 text-[11px] font-medium text-ink-500">
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
              className="w-full rounded-xl border border-accent-400/50 bg-white/[0.04] px-3 py-2.5 text-sm text-ink-50 outline-none ring-1 ring-accent-400/30"
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
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-card backdrop-blur-xl transition-all duration-200",
              isOwn
                ? "rounded-br-md bg-accent/[0.15] border border-accent-400/20 text-ink-50"
                : "rounded-bl-md border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] text-ink-200",
            )}
          >
            <p className="whitespace-pre-wrap break-words">{content}</p>
            <div className={cn("mt-1 flex items-center gap-2", isOwn ? "justify-end" : "justify-start")}>
              {edited_at && (
                <span className="text-[10px] text-ink-600">(edited)</span>
              )}
              {created_at && (
                <span className="text-[10px] text-ink-600">
                  {formatDistanceToNow(new Date(created_at))}
                </span>
              )}
            </div>
          </div>
        )}

        {isOwn && !isEditing && (
          <div className="mt-1 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => {
                setEditText(content);
                setIsEditing(true);
              }}
              className="text-[10px] text-ink-600 transition-colors hover:text-ink-200"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-[10px] text-ink-600 transition-colors hover:text-red-400"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
