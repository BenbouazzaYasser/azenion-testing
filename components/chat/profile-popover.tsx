"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrCreateConversation } from "@/actions/chat.actions";

export interface ProfilePopoverUser {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

interface ProfilePopoverProps {
  user: ProfilePopoverUser;
  children: ReactNode;
  /** Extra classes for the trigger wrapper. */
  triggerClassName?: string;
  /** Horizontal anchor for the popover relative to the trigger. Default "start". */
  align?: "start" | "end";
  /** Preferred side. Falls back to the opposite when it would overflow the viewport. Default "bottom". */
  side?: "top" | "bottom";
}

const GAP = 8;
const PANEL_WIDTH = 232;
const PANEL_PADDING = 8;

/**
 * Mini profile card that opens when the wrapped avatar (person icon) is
 * clicked. Uses a portal + fixed positioning so it is never clipped by the
 * chat's scroll containers, and works for the current user's own profile too.
 */
export function ProfilePopover({
  user,
  children,
  triggerClassName,
  align = "start",
  side = "bottom",
}: ProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initial = (user.full_name?.[0] ?? user.username[0] ?? "U").toUpperCase();
  const displayName = user.full_name || user.username || "User";

  const toggle = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;

    const w = PANEL_WIDTH;
    const h = panelRef.current?.offsetHeight ?? 0;

    let top = side === "bottom" ? trigger.bottom + GAP : trigger.top - GAP - h;
    let left = align === "start" ? trigger.left : trigger.left + trigger.width - w;

    top = Math.max(PANEL_PADDING, Math.min(top, window.innerHeight - h - PANEL_PADDING));
    left = Math.max(PANEL_PADDING, Math.min(left, window.innerWidth - w - PANEL_PADDING));

    // Flip to the other side when the preferred side overflows the viewport.
    if (side === "bottom" && top + h + GAP > window.innerHeight && trigger.top - GAP - h > 0) {
      top = trigger.top - GAP - h;
    }
    if (side === "top" && top < PANEL_PADDING && trigger.bottom + GAP + h < window.innerHeight) {
      top = trigger.bottom + GAP;
    }

    setPos({ top, left });
  }, [open, align, side]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handlePointerDown(e: globalThis.MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleResize() {
      setPos(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const panelStyle: CSSProperties | undefined =
    open && pos
      ? {
          position: "fixed",
          zIndex: 200,
          top: pos.top,
          left: pos.left,
          width: PANEL_WIDTH,
        }
      : undefined;

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`View profile of ${displayName}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle(e);
        }}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
          triggerClassName,
        )}
      >
        {children}
      </span>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={`${displayName} profile`}
              tabIndex={-1}
              style={panelStyle}
              className="overflow-hidden rounded-2xl border border-border/50 bg-surface p-4 shadow-[0_24px_50px_-20px_rgba(40,40,255,0.35)] animate-dropdown-in"
            >
              <div className="relative flex items-center gap-3 pb-3 pt-1">
                <div className="relative shrink-0">
                  <div aria-hidden className="absolute -inset-1.5 rounded-full bg-accent/25 blur-lg" />
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border-strong/[0.14]">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-accent-glow text-base font-semibold text-white">
                        {initial}
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-50">{displayName}</p>
                  <p className="truncate text-xs text-ink-500">@{user.username}</p>
                </div>
              </div>

              <div className="relative pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    void getOrCreateConversation(user.id).then((result) => {
                      if ("conversation_id" in result && result.conversation_id) {
                        router.push(`/chat/${result.conversation_id}`);
                      } else {
                        toast.error(result.error ?? "Could not open conversation");
                      }
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-400/25 bg-accent/[0.1] px-3 py-2 text-xs font-medium text-accent-300 transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
                >
                  <MessageSquare size={14} />
                  Start chat
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}