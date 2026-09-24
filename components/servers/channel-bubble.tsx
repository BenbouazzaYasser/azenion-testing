"use client";

import { useState } from "react";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatTime } from "@/lib/date";
import { editChannelMessage, deleteChannelMessage } from "@/actions/server.actions";
import { useTranslation } from "@/components/translation/translation-provider";

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
  delivery?: "sent" | "pending" | "failed";
  error?: string | null;
  onRetry?: () => void;
  onUpdated?: (content: string, editedAt: string) => void;
  onDeleted?: () => void;
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
  delivery = "sent",
  error = null,
  onRetry,
  onUpdated,
  onDeleted,
}: ChannelBubbleProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);

  const handleEdit = async () => {
    if (!editText.trim() || editText === content) {
      setIsEditing(false);
      return;
    }
    const result = await editChannelMessage(id, editText);
    if (!result.error) {
      onUpdated?.(editText.trim(), new Date().toISOString());
      setIsEditing(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async () => {
    const result = await deleteChannelMessage(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      onDeleted?.();
    }
  };

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-lg px-3 py-1.5 transition-colors duration-200",
        "hover:bg-surface/50",
        isGrouped ? "" : "mt-3 first:mt-0",
        delivery === "pending" && "opacity-70",
        delivery === "failed" && "opacity-80",
      )}
    >
      <div className="w-10 shrink-0">
        {showAvatar ? (
          sender_avatar ? (
            <img
              src={sender_avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
              {(sender_name?.[0] ?? "?").toUpperCase()}
            </span>
          )
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {!isGrouped && (
          <p className="flex items-baseline gap-2">
            <span className={cn("text-sm font-semibold", isOwn ? "text-accent-300" : "text-ink-100")}>
              {sender_name ?? t("servers.memberFallback")}
            </span>
            <span suppressHydrationWarning className="text-[10px] font-medium text-ink-600">
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
            {edited_at && <span className="ml-1.5 text-[10px] text-ink-600">{t("servers.edited")}</span>}
            {delivery === "pending" ? <span className="ml-2 text-[10px] text-ink-500">Sending…</span> : null}
            {delivery === "failed" ? (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-red-300">
                {error ?? "Failed to send"}
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium underline underline-offset-2 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                  >
                    <RefreshCw size={10} aria-hidden />
                    Retry
                  </button>
                ) : null}
              </span>
            ) : null}
          </p>
        )}
      </div>

      {isOwn && !isEditing && delivery === "sent" && (
        <div
          className={cn(
            "absolute right-2 top-0 flex items-center gap-2 rounded-lg bg-glass p-1.5 opacity-0 shadow-dropdown backdrop-blur-xl transition-opacity",
            "group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100",
          )}
        >
          <button
            type="button"
            aria-label={t("servers.editMessage")}
            onClick={() => setIsEditing(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-ink-500 hover:bg-surface-hover hover:text-ink-100"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label={t("servers.deleteMessage")}
            onClick={handleDelete}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-ink-500 hover:bg-red-400/10 hover:text-red-300"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
