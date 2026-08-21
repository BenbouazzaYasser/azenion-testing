"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteFeedPost } from "@/actions/interactions.actions";
import type { FeedItemWithAuthor } from "@/actions/feed.actions";
import { EditPostDialog } from "@/components/feed/edit-post-dialog";

interface FeedPostMenuProps {
  item: FeedItemWithAuthor;
  currentUserId: string | null;
  onDeleted?: (postId: string) => void;
  onEdited?: (postId: string, title: string, body: string | null) => void;
  redirectOnDelete?: string;
}

const MENU_WIDTH = 184;
const MENU_GAP = 8;
const MENU_EST_HEIGHT = 150;

export function FeedPostMenu({
  item,
  currentUserId,
  onDeleted,
  onEdited,
  redirectOnDelete,
}: FeedPostMenuProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const canManage =
    item.source_type === "user_post" && Boolean(currentUserId) && item.author_id === currentUserId;

  const close = useCallback(() => {
    setConfirmingDelete(false);
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const left = Math.max(MENU_GAP, rect.right - MENU_WIDTH);
    const opensUp = rect.bottom + MENU_GAP + MENU_EST_HEIGHT > window.innerHeight;
    const top = opensUp
      ? Math.max(MENU_GAP, rect.top - MENU_GAP - MENU_EST_HEIGHT)
      : rect.bottom + MENU_GAP;
    setCoords({ top, left });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    }

    function handleViewportChange() {
      close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [open, close]);

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const current = document.activeElement;
    const index = items.indexOf(current as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (index + 1) % items.length;
    else if (e.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      items[next]?.focus();
    }
  }

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    try {
      const result = await deleteFeedPost(item.id);
      if (result?.error) {
        toast.error(result.error);
        setConfirmingDelete(false);
        return;
      }
      toast.success("Post deleted");
      onDeleted?.(item.id);
      if (redirectOnDelete) {
        router.push(redirectOnDelete);
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
      close();
    }
  }

  if (!canManage) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-all duration-200 ease-premium",
          "hover:bg-surface-hover hover:text-ink-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          open && "bg-surface-hover text-ink-100",
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Post options"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
              className="fixed z-[90] flex w-[11.5rem] flex-col overflow-hidden rounded-2xl border border-accent-400/40 bg-glass p-1.5 shadow-dropdown ring-1 ring-accent-400/20 backdrop-blur-2xl backdrop-saturate-150 animate-dropdown-in"
              style={{ top: coords.top, left: coords.left }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/60 to-transparent"
              />
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setEditOpen(true);
                }}
                className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-200 transition-colors duration-150 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <Pencil className="h-[15px] w-[15px] text-accent-300" />
                </span>
                Edit
              </button>

              <div aria-hidden className="mx-1.5 my-1 h-px bg-border-strong/40" />

              {confirmingDelete ? (
                <div className="rounded-lg bg-red-400/[0.06] p-1.5">
                  <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium leading-snug text-ink-400">
                    Delete this post? This can&apos;t be undone.
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={handleDelete}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-red-500/15 text-[13px] font-medium text-red-400 transition-colors duration-150 ease-premium hover:bg-red-500/25 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => setConfirmingDelete(false)}
                    className="mt-1 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-ink-400 transition-colors duration-150 ease-premium hover:bg-surface-hover hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => setConfirmingDelete(true)}
                  className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-red-400/90 transition-colors duration-150 ease-premium hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-40"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <Trash2 className="h-[15px] w-[15px]" />
                  </span>
                  Delete
                </button>
              )}
            </div>,
            document.body,
          )
        : null}

      <EditPostDialog
        open={editOpen}
        item={item}
        onClose={() => setEditOpen(false)}
        onSaved={(title, body) => {
          onEdited?.(item.id, title, body);
          router.refresh();
        }}
      />
    </>
  );
}
