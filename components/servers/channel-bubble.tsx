"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatTime } from "@/lib/date";
import { editChannelMessage, deleteChannelMessage } from "@/actions/server.actions";

interface ChannelBubbleProps {
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
}

export function ChannelBubble({
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
}: ChannelBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);

  const handleEdit = async () => {
    if (!editText.trim() || editText === content) {
      setIsEditing(false);
      return;
    }
    const result = await editChannelMessage(id, editText);
    if (!result.error) {
      setIsEditing(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    const result = await deleteChannelMessage(id);
    if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-xl px-3 py-1.5 transition-colors duration-200",
        "hover:bg-surface/50",
        isGrouped ? "" : "mt-3 first:mt-0",
      )}
    >
      <div className="w-9 shrink-0">
        {showAvatar ? (
          sender_avatar ? (
            <img
              src={sender_avatar}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-xs font-semibold text-white">
              {(sender_name?.[0] ?? "?").toUpperCase()}
            </span>
          )
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {!isGrouped && (
          <p className="flex items-baseline gap-2">
            <span className={cn("text-sm font-semibold", isOwn ? "text-accent-300" : "text-ink-100")}>
              {sender_name ?? "Member"}
            </span>
            <span className="text-[10px] font-medium text-ink-600">
              {created_at ? formatTime(created_at) : ""}
            </span>
          </p>
        )}

        {isEditing ? (
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="mt-0.5 w-full rounded-lg bg-surface px-3 py-1.5 text-sm text-ink-50 outline-none focus:ring-2 focus:ring-accent-400/40"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-200">
            {content}
            {edited_at && <span className="ml-1.5 text-[10px] text-ink-600">(edited)</span>}
          </p>
        )}
      </div>

      {isOwn && !isEditing && (
        <div
          className={cn(
            "absolute right-2 top-0 flex items-center gap-0.5 rounded-lg bg-glass p-0.5 opacity-0 shadow-dropdown backdrop-blur-xl transition-opacity",
            "group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <button
            type="button"
            aria-label="Edit message"
            onClick={() => setIsEditing(true)}
            className="rounded-md p-1.5 text-ink-500 hover:bg-surface-hover hover:text-ink-100"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete message"
            onClick={handleDelete}
            className="rounded-md p-1.5 text-ink-500 hover:bg-red-400/10 hover:text-red-300"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
