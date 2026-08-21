"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MoreVertical, CheckCheck, Archive, ArchiveRestore, Trash2, Ban, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  archiveConversation,
  blockUser,
  deleteConversation,
  markConversationRead,
  unarchiveConversation,
  unblockUser,
} from "@/actions/chat.actions";
import { clearConversationUnread } from "@/lib/chat-unread";

interface ConversationMenuProps {
  conversationId: string;
  conversationName: string;
  hasUnread: boolean;
  mode?: "inbox" | "archived";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: (conversationId: string) => void;
  onRestored?: (conversationId: string) => void;
  otherUserId?: string;
  isBlocked?: boolean;
}

const MENU_WIDTH = 200;
const MENU_GAP = 8;
const MENU_EST_HEIGHT = 240;

export function ConversationMenu({
  conversationId,
  conversationName,
  hasUnread,
  mode = "inbox",
  open,
  onOpenChange,
  onRemoved,
  onRestored,
  otherUserId,
  isBlocked = false,
}: ConversationMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [pending, setPending] = useState(false);

  const close = useCallback(() => {
    setConfirmingDelete(false);
    setConfirmingBlock(false);
    onOpenChange(false);
  }, [onOpenChange]);

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

  // Focus the first item when the menu opens.
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

  async function runAction(action: () => Promise<{ error?: string } | null>) {
    if (pending) return;
    setPending(true);
    try {
      const result = await action();
      if (result?.error) {
        toast.error(result.error);
        setConfirmingDelete(false);
        setConfirmingBlock(false);
        return;
      }
    } finally {
      setPending(false);
    }
  }

  async function handleMarkSeen() {
    await runAction(async () => {
      const result = await markConversationRead(conversationId);
      if (!result.error) {
        clearConversationUnread(conversationId);
        toast.success("Marked as seen");
        close();
      }
      return result;
    });
  }

  async function handleArchive() {
    await runAction(async () => {
      const result = await archiveConversation(conversationId);
      if (!result.error) {
        onRemoved(conversationId);
        toast.success("Conversation archived");
        close();
      }
      return result;
    });
  }

  async function handleUnarchive() {
    await runAction(async () => {
      const result = await unarchiveConversation(conversationId);
      if (!result.error) {
        onRestored?.(conversationId);
        toast.success("Conversation restored");
        close();
      }
      return result;
    });
  }

  async function handleDelete() {
    await runAction(async () => {
      const result = await deleteConversation(conversationId);
      if (!result.error) {
        onRemoved(conversationId);
        toast.success("Conversation deleted");
        close();
      }
      return result;
    });
  }

  async function handleBlock() {
    if (!otherUserId) return;
    await runAction(async () => {
      const result = await blockUser(otherUserId);
      if (!result.error) {
        setConfirmingBlock(false);
        toast.success(`${conversationName} has been blocked`);
        router.refresh();
        close();
      }
      return result;
    });
  }

  async function handleUnblock() {
    if (!otherUserId) return;
    await runAction(async () => {
      const result = await unblockUser(otherUserId);
      if (!result.error) {
        toast.success(`${conversationName} has been unblocked`);
        router.refresh();
        close();
      }
      return result;
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Conversation options for ${conversationName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className={cn(
          "absolute right-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 transition-all duration-200 ease-premium",
          "focus-visible:ring-2 focus-visible:ring-accent-400/60",
          open
            ? "bg-surface-hover text-ink-100"
            : "opacity-70",
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Conversation options for ${conversationName}`}
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
              className="fixed z-[90] flex w-[13rem] flex-col overflow-hidden rounded-2xl bg-glass-strong p-1 shadow-dropdown animate-dropdown-in"
              style={{ top: coords.top, left: coords.left }}
            >
              {mode === "inbox" && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={!hasUnread || pending}
                  onClick={handleMarkSeen}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors duration-200 ease-premium",
                    "focus-visible:ring-2 focus-visible:ring-accent-400/60",
                    "disabled:pointer-events-none disabled:opacity-40",
                  )}
                >
                  <CheckCheck className="h-4 w-4 shrink-0 text-accent-300" />
                  Mark as seen
                </button>
              )}

              {mode === "archived" ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={handleUnarchive}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors duration-200 ease-premium",
                    "focus-visible:ring-2 focus-visible:ring-accent-400/60",
                    "disabled:pointer-events-none disabled:opacity-40",
                  )}
                >
                  <ArchiveRestore className="h-4 w-4 shrink-0 text-ink-400" />
                  Unarchive
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={handleArchive}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors duration-200 ease-premium",
                    "focus-visible:ring-2 focus-visible:ring-accent-400/60",
                    "disabled:pointer-events-none disabled:opacity-40",
                  )}
                >
                  <Archive className="h-4 w-4 shrink-0 text-ink-400" />
                  Archive
                </button>
              )}

              <div aria-hidden className="mx-2 my-1 h-px bg-border-strong/40" />

              {otherUserId &&
                (confirmingBlock ? (
                  <div className="rounded-lg bg-red-400/[0.07] p-1.5">
                    <p className="px-2 pb-1.5 pt-0.5 text-xs font-medium text-ink-300">
                      Block {conversationName}? They won&apos;t be able to message you.
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={pending}
                      onClick={handleBlock}
                      className="flex w-full items-center gap-2 rounded-md bg-red-500/15 px-2.5 py-1.5 text-sm font-medium text-red-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Block
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={pending}
                      onClick={() => setConfirmingBlock(false)}
                      className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 disabled:pointer-events-none disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : isBlocked ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={handleUnblock}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ease-premium",
                      "text-accent-300focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60",
                      "disabled:pointer-events-none disabled:opacity-40",
                    )}
                  >
                    <UserCheck className="h-4 w-4 shrink-0" />
                    Unblock user
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => {
                      setConfirmingDelete(false);
                      setConfirmingBlock(true);
                    }}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4 shrink-0" />
                    Block user
                  </button>
                ))}

              <div aria-hidden className="mx-2 my-1 h-px bg-border-strong/40" />

              {confirmingDelete ? (
                <div className="rounded-lg bg-red-400/[0.07] p-1.5">
                  <p className="px-2 pb-1.5 pt-0.5 text-xs font-medium text-ink-300">
                    Delete conversation?
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 rounded-md bg-red-500/15 px-2.5 py-1.5 text-sm font-medium text-red-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => setConfirmingDelete(false)}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  onClick={() => {
                    setConfirmingBlock(false);
                    setConfirmingDelete(true);
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Delete
                </button>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
