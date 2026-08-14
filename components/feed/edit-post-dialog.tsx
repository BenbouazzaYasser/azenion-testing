"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { updateFeedPost } from "@/actions/feed.actions";
import type { FeedItemWithAuthor } from "@/actions/feed.actions";

interface EditPostDialogProps {
  open: boolean;
  item: FeedItemWithAuthor;
  onClose: () => void;
  onSaved: (title: string, body: string | null) => void;
}

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;
const MAX_PREVIEW_HEIGHT = 320;

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_PREVIEW_HEIGHT)}px`;
}

export function EditPostDialog({
  open,
  item,
  onClose,
  onSaved,
}: EditPostDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body ?? "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open, { initialFocus: "none" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(item.title);
      setBody(item.body ?? "");
    }
  }, [open, item.title, item.body]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && bodyRef.current) {
      autosize(bodyRef.current);
    }
  }, [open, body]);

  if (!open) return null;

  const canSave = Boolean(title.trim() || body.trim()) && !isPending;

  function handleSave() {
    if (!canSave) return;
    const fd = new FormData();
    fd.set("post_id", item.id);
    fd.set("title", title.trim());
    fd.set("body", body.trim());

    startTransition(async () => {
      const result = await updateFeedPost(fd);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Post updated");
      onSaved(title.trim(), body.trim() || null);
      onClose();
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Edit post"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-border-strong/50 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-ink-50">Edit post</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Headline (optional)\u2026"
            maxLength={MAX_TITLE_LENGTH}
            disabled={isPending}
            className={inputClass}
          />

          <div className="relative">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                autosize(e.target);
              }}
              placeholder="Share an update with Azenion\u2026"
              rows={3}
              maxLength={MAX_BODY_LENGTH}
              disabled={isPending}
              className={cn(inputClass, "resize-none leading-relaxed")}
            />
            {body.length > 0 ? (
              <span className="pointer-events-none absolute bottom-2.5 right-3 text-[0.68rem] font-medium tabular-nums text-ink-600">
                {body.length}/{MAX_BODY_LENGTH}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border-strong/50 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSave}>
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving\u2026
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
