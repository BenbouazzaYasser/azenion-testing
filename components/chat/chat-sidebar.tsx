"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageSquare, Plus, Archive, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { formatDistanceToNow } from "@/lib/date";
import { toast } from "sonner";
import { searchUsers, getArchivedConversations } from "@/actions/chat.actions";
import { useChatUnread, clearConversationUnread } from "@/lib/chat-unread";
import { ConversationMenu } from "@/components/chat/conversation-menu";
import { MessageStatus, type MessageStatusKind } from "@/components/chat/message-status";

interface Conversation {
  id: string;
  other_user: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
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

export type { Conversation };

interface ChatSidebarProps {
  conversations: Conversation[];
  currentUserId: string;
  onNavigate?: () => void;
  className?: string;
}

export function ChatSidebar({ conversations, currentUserId, onNavigate, className }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [convList, setConvList] = useState(conversations);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [archivedConvs, setArchivedConvs] = useState<Conversation[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; full_name: string | null; username: string; avatar_url: string | null }[]
  >([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadByConv = useChatUnread(currentUserId);

  // Re-sync whenever the server passes a fresh list (e.g. after a refresh),
  // and close any open menu when the route changes.
  useEffect(() => {
    setConvList(conversations);
  }, [conversations]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [pathname]);

  const handleConversationRemoved = useCallback(
    (id: string) => {
      setConvList((prev) => prev.filter((c) => c.id !== id));
      setOpenMenuId((cur) => (cur === id ? null : cur));
      clearConversationUnread(id);
      router.refresh();
    },
    [router],
  );

  const handleArchivedChange = useCallback(
    (id: string) => {
      setArchivedConvs((prev) => prev.filter((c) => c.id !== id));
      setOpenMenuId((cur) => (cur === id ? null : cur));
      clearConversationUnread(id);
      router.refresh();
    },
    [router],
  );

  const handleOpenArchived = useCallback(() => {
    setView("archived");
    setOpenMenuId(null);
    setArchivedLoading(true);
    getArchivedConversations()
      .then((rows) => setArchivedConvs(rows))
      .catch(() => toast.error("Could not load archived conversations"))
      .finally(() => setArchivedLoading(false));
  }, []);

  const handleCloseArchived = useCallback(() => {
    setView("inbox");
    setOpenMenuId(null);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearch]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    startSearchTransition(async () => {
      const results = await searchUsers(value);
      setSearchResults(results.filter((r) => r.id !== currentUserId));
      setShowSearch(true);
    });
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-glass/60 backdrop-blur-xl",
        className,
      )}
    >
      <div className="shrink-0 p-4 pb-3">
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-full bg-surface px-4 py-3 pl-11 text-sm text-ink-50 placeholder:text-ink-600 shadow-card outline-none backdrop-blur-xl transition-all duration-300 focus:border-accent-400/60 focus:bg-surface-hover focus:ring-2 focus:ring-accent-400/30"
            />
          </div>

          {showSearch && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 animate-dropdown-in overflow-hidden rounded-xl bg-glass-strong shadow-dropdown backdrop-blur-2xl">
              {searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-600">No users found.</p>
              ) : (
                searchResults.map((user) => (
                <Link
                  key={user.id}
                  href={`/chat/start/${user.id}`}
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                    setSearchResults([]);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ease-premium hover:bg-surface-hover focus-visible:bg-surface focus-visible:outline-none"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-xs font-semibold text-white">
                      {user.full_name?.[0] ?? user.username[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-50">
                      {user.full_name ?? user.username}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      @{user.username}
                    </p>
                  </div>
                  <Plus size={14} className="ml-auto shrink-0 text-ink-400" />
                </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 overflow-y-auto", SCROLLBAR_CLASSES)}>
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between px-3 pt-1">
            {view === "archived" ? (
              <>
                <button
                  type="button"
                  onClick={handleCloseArchived}
                  className="flex items-center gap-1 rounded-md text-xs font-semibold text-ink-400 transition-colors duration-200 ease-premium hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Inbox
                </button>
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-500">
                  <Archive className="h-3.5 w-3.5" />
                  Archived
                </h2>
              </>
            ) : (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-500">
                  Messages
                </h2>
                <div className="flex items-center gap-2">
                  {convList.length > 0 && (
                    <span className="text-[11px] font-medium tabular-nums text-ink-600">
                      {convList.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenArchived}
                    aria-label="View archived conversations"
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60",
                      "border-border-strong text-ink-400 hover:border-accent-400/50 hover:bg-surface-hover hover:text-ink-100",
                    )}
                  >
                    <Archive className="h-3 w-3" />
                    Archived
                  </button>
                </div>
              </>
            )}
          </div>

          {view === "archived" ? (
            archivedLoading ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-ink-500 shadow-card">
                  <Archive className="h-5 w-5 animate-pulse" />
                </div>
                <p className="mt-3 text-sm font-medium text-ink-300">Loading archived…</p>
              </div>
            ) : archivedConvs.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface card-surface-soft text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                  <Archive size={24} />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-ink-50">No archived conversations</p>
                <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-ink-500">
                  Archived conversations will show up here when you archive a chat.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {archivedConvs.map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conv={conv}
                    currentUserId={currentUserId}
                    isActive={pathname === `/chat/${conv.id}`}
                    unread={false}
                    mode="archived"
                    menuOpen={openMenuId === conv.id}
                    onMenuOpenChange={(o) => setOpenMenuId(o ? conv.id : null)}
                    onRemoved={handleArchivedChange}
                    onRestored={handleArchivedChange}
                    onNavigate={() => {
                      setOpenMenuId(null);
                      onNavigate?.();
                    }}
                  />
                ))}
              </div>
            )
          ) : convList.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface card-surface-soft text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                <MessageSquare size={24} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-ink-50">No conversations yet</p>
              <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-ink-500">
                Search for a user above to start messaging. Your conversations will appear here.
              </p>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-600">
                Start a new chat
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {convList.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  currentUserId={currentUserId}
                  isActive={pathname === `/chat/${conv.id}`}
                  unread={(unreadByConv[conv.id] ?? 0) > 0}
                  mode="inbox"
                  menuOpen={openMenuId === conv.id}
                  onMenuOpenChange={(o) => setOpenMenuId(o ? conv.id : null)}
                  onRemoved={handleConversationRemoved}
                  onNavigate={() => {
                    setOpenMenuId(null);
                    onNavigate?.();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConversationRowProps {
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

function ConversationRow({
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

  return (
    <div className="group relative">
      <Link
        href={`/chat/${conv.id}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 overflow-hidden rounded-xl py-3 pl-3 pr-11 transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
          isActive
            ? "border border-accent-400/30 bg-[linear-gradient(135deg,rgba(40,40,255,0.13),rgba(40,40,255,0.04))] shadow-glow-sm"
            : "border border-transparent hover:bg-surface/60 hover:shadow-card",
        )}
      >
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-400 to-accent-glow"
          />
        )}

        {conv.other_user?.avatar_url ? (
          <img
            src={conv.other_user.avatar_url}
            alt=""
            className={cn(
              "h-10 w-10 shrink-0 rounded-full object-cover transition-all duration-300",
              isActive && "border-accent-400/50 shadow-glow-sm",
            )}
          />
        ) : (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-glow text-sm font-semibold text-white transition-all duration-300",
              isActive && "border-accent-400/60 shadow-glow-sm",
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
            <span className="flex shrink-0 items-center gap-1.5">
              {unread && (
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full bg-accent-400 shadow-glow-sm animate-pulse-glow"
                />
              )}
              {conv.last_message?.created_at && (
                <span className="shrink-0 text-[10px] font-medium tracking-wide text-ink-600 transition-colors duration-200 group-hover:text-ink-500">
                  {formatDistanceToNow(new Date(conv.last_message.created_at))}
                </span>
              )}
            </span>
          </div>
          <p className="mt-[3px] truncate text-xs text-ink-600">
            {conv.other_user?.username ? (
              <span>@{conv.other_user.username}</span>
            ) : null}
          </p>
          <p className="mt-0.5 flex items-center text-xs text-ink-500">
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
                : (conv.last_message?.content ?? "No messages yet")}
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
