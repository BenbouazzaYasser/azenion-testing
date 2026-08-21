"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, User, X, Loader2 } from "lucide-react";
import { getPublicProfile } from "@/actions/social.actions";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { PublicProfileHeader } from "@/app/u/[username]/components/public-profile-header";
import { RelationshipActions } from "@/app/u/[username]/components/relationship-actions";
import { PublicProfileTimeline } from "@/app/u/[username]/components/public-profile-timeline";
import { PublicProfilePosts } from "@/app/u/[username]/components/public-profile-posts";
import { cardBase, sectionCardClass } from "@/components/sections/profile/card-classes";
import { cn } from "@/lib/utils";
import { getOrCreateConversation } from "@/actions/chat.actions";

export interface ProfilePopoverUser {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
  role?: string;
  badge?: string;
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fullProfile, setFullProfile] = useState<Awaited<ReturnType<typeof getPublicProfile>> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-50">{displayName}</p>
                  <p className="truncate text-xs text-ink-500">@{user.username}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-accent-400/30 bg-accent/[0.1] px-2 py-0.5 text-[10px] font-semibold text-accent-300">
                      {user.role ?? "Member"}
                    </span>
                    {user.badge && (
                      <span className="inline-flex items-center rounded-full border border-border-strong bg-surface/80 px-2 py-0.5 text-[10px] font-medium text-ink-400">
                        {user.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setOpen(false);
                    setLoadingProfile(true);
                    const res = await getPublicProfile(user.username);
                    setFullProfile(res);
                    setLoadingProfile(false);
                    setPreviewOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong/[0.18] bg-surface/80 px-3 py-2 text-xs font-medium text-ink-300 transition-all duration-200 ease-premium hover:border-border-strong/65 hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
                >
                  {loadingProfile ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                  View profile
                </button>
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
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent-400/25 bg-accent/[0.1] px-3 py-2 text-xs font-medium text-accent-300 transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
                >
                  <MessageSquare size={14} />
                  Start chat
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {previewOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[250] flex items-center justify-center px-4 py-6 sm:py-10"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
              onClick={() => setPreviewOpen(false)}
            />
            <div
              tabIndex={-1}
              className="relative z-10 flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-strong/[0.12] px-5 py-3 sm:px-6">
                <p className="text-sm font-semibold text-ink-100">{displayName}&apos;s Profile</p>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPreviewOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong/[0.08] bg-surface text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                >
                  <X size={15} />
                </button>
              </div>

              <div className={cn("min-h-0 flex-1 overflow-y-auto", SCROLLBAR_CLASSES)}>
                <div className="flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
                {(!fullProfile || "error" in fullProfile) ? (
                  <div className="py-12 text-center text-sm text-ink-400">
                    {fullProfile && "error" in fullProfile ? fullProfile.error : "Failed to load profile"}
                  </div>
                ) : (() => {
                  const data = "data" in fullProfile ? fullProfile.data : null;
                  const p = data?.profile;
                  if (!p || !data) {
                    return <div className="py-12 text-center text-sm text-ink-400">Profile not found</div>;
                  }
                  return (
                    <>
                      <PublicProfileHeader profile={p} cardClass={sectionCardClass} />
                      <RelationshipActions profileId={p.id} relationship={data.relationship} cardClass={sectionCardClass} />
                      <PublicProfileTimeline activities={data.activities} cardClass={sectionCardClass} />
                      <PublicProfilePosts posts={data.posts} cardClass={sectionCardClass} />
                    </>
                  );
                })()}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}