"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date";
import { ConversationMenu } from "@/components/chat/conversation-menu";
import { MessageStatus, type MessageStatusKind } from "@/components/chat/message-status";
import { ProfilePopover, type ProfilePopoverUser } from "@/components/chat/profile-popover";

export interface Conversation {
  id: string;
  other_user: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    preview: string;
    created_at: string | null;
    sender_id: string;
    received_at: string | null;
  } | null;
  other_last_read_at: string | null;
  updated_at: string | null;
  unread_count?: number;
  blocked_me?: boolean;
  i_blocked?: boolean;
}

export interface ConversationRowProps {
  conv: Conversation;
  currentUserId: string;
  isActive: boolean;
  unread: boolean;
  mode: "inbox" | "archived";
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRemoved: (id: string) => void;
  onRestored?: (id: string) => void;
  onNavigate: () => void;
}

export function ConversationRow({
  conv,
  currentUserId,
  isActive,
  unread,
  mode,
  menuOpen,
  onMenuOpenChange,
  onRemoved,
  onRestored,
  onNavigate,
}: ConversationRowProps) {
  const isOwnLast = conv.last_message?.sender_id === currentUserId;
  const lastTs = conv.last_message?.created_at
    ? new Date(conv.last_message.created_at).getTime()
    : null;
  const otherReadTs = conv.other_last_read_at ? new Date(conv.other_last_read_at).getTime() : null;
  const isSeen =
    isOwnLast && lastTs !== null && otherReadTs !== null && otherReadTs >= lastTs;
  const lastStatus: MessageStatusKind | null = isOwnLast && conv.last_message
    ? isSeen
      ? "seen"
      : conv.last_message.received_at
        ? "received"
        : "sent"
    : null;
  const name = conv.other_user?.full_name ?? conv.other_user?.username ?? "Unknown";
  const initial =
    conv.other_user?.full_name?.[0] ?? conv.other_user?.username[0]?.toUpperCase() ?? "?";

  const popoverUser: ProfilePopoverUser | null = conv.other_user
    ? {
        id: conv.other_user.id,
        full_name: conv.other_user.full_name,
        username: conv.other_user.username,
        avatar_url: conv.other_user.avatar_url,
      }
    : null;

  return (
    <div className="group relative">
      <Link
        href={`/chat/${conv.id}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "relative flex items-center gap-3 overflow-hidden rounded-2xl p-3 pl-3.5 pr-11 transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
          isActive
            ? "border border-accent-400/30 bg-[linear-gradient(135deg,rgba(40,40,255,0.12),rgba(40,40,255,0.04))] shadow-card"
            : "border border-border-strong/[0.12] hover:border-border-strong/60",
        )}
      >
        {isActive && (
          <span
            aria-hidden
            className="absolute left-[3px] top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-400 to-accent-glow"
          />
        )}

        {conv.other_user?.avatar_url ? (
          <ProfilePopover user={popoverUser!} triggerClassName="z-20">
            <img
              src={conv.other_user.avatar_url}
              alt=""
              className={cn(
                "h-11 w-11 shrink-0 rounded-full border border-border-strong/[0.12] object-cover transition-all duration-300",
                isActive && "border-accent-400/50",
              )}
            />
          </ProfilePopover>
        ) : popoverUser ? (
          <ProfilePopover user={popoverUser} triggerClassName="z-20">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-sm font-semibold text-white transition-all duration-300",
                isActive && "border-accent-400/60",
              )}
            >
              {initial}
            </span>
          </ProfilePopover>
        ) : (
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-sm font-semibold text-white transition-all duration-300",
              isActive && "border-accent-400/60",
            )}
          >
            {initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("truncate text-sm text-ink-50", isActive ? "font-semibold" : "font-medium")}>
              {name}
            </p>
            <span className="flex shrink-0 items-center gap-2">
              {conv.last_message?.created_at && (
                <span className="shrink-0 text-[10px] font-medium tracking-wide text-ink-600 transition-colors duration-200">
                  {formatDistanceToNow(new Date(conv.last_message.created_at))}
                </span>
              )}
              {unread && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-none text-white">
                  {conv.unread_count ?? 1}
                </span>
              )}
            </span>
          </div>
          <p className="mt-1 flex items-center text-xs text-ink-500">
            {lastStatus && (
              <>
                <MessageStatus
                  status={lastStatus}
                  avatarUrl={conv.other_user?.avatar_url ?? null}
                  avatarName={name}
                  className="mr-1.5 shrink-0"
                />
                <span className="shrink-0 font-medium text-ink-400">You: </span>
              </>
            )}
            <span className="min-w-0 truncate">
              {conv.blocked_me
                ? "You're blocked — you can't reply."
                : (conv.last_message?.preview ?? "No messages yet")}
            </span>
          </p>
        </div>
      </Link>

      <ConversationMenu
        conversationId={conv.id}
        conversationName={name}
        hasUnread={unread}
        mode={mode}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onRemoved={onRemoved}
        onRestored={onRestored}
        otherUserId={conv.other_user?.id ?? undefined}
        isBlocked={conv.i_blocked ?? false}
      />
    </div>
  );
}