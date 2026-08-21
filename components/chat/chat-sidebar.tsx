"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageSquare, Plus, Archive, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { toast } from "sonner";
import { searchUsers, getArchivedConversations, getOrCreateConversation } from "@/actions/chat.actions";
import { useChatUnread, clearConversationUnread } from "@/lib/chat-unread";
import { ConversationRow, type Conversation } from "@/components/chat/conversation-row";
import { ProfilePopover } from "@/components/chat/profile-popover";

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

  const handleStartConversation = useCallback(
    async (otherUserId: string) => {
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      onNavigate?.();
      const result = await getOrCreateConversation(otherUserId);
      if ("conversation_id" in result && result.conversation_id) {
        router.push(`/chat/${result.conversation_id}`);
      } else {
        toast.error(result.error ?? "Could not open conversation");
      }
    },
    [router, onNavigate],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-border-strong/[0.14] bg-[linear-gradient(180deg,rgb(var(--void-900)/0.55),rgb(var(--void-900)/0.2))]",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border-strong/[0.14] px-4 pb-4 pt-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <h1 className="text-base font-semibold tracking-tight text-ink-50">Messages</h1>
          {view === "inbox" && convList.length > 0 ? (
            <span className="rounded-full border border-border-strong bg-surface px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-ink-400">
              {convList.length}
            </span>
          ) : null}
        </div>
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-2xl border border-border-strong bg-surface/70 py-2.5 pl-10 pr-3 text-sm text-ink-50 placeholder:text-ink-600 transition-colors duration-200 ease-premium focus:border-accent-400/50 focus:outline-none"
            />
          </div>

          {showSearch && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 animate-dropdown-in overflow-hidden rounded-2xl bg-glass-strong shadow-dropdown">
              {searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-600">No users found.</p>
              ) : (
                searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => void handleStartConversation(user.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all duration-200 ease-premium focus-visible:bg-surface focus-visible:outline-none"
                >
                  <ProfilePopover
                    user={{
                      id: user.id,
                      full_name: user.full_name,
                      username: user.username,
                      avatar_url: user.avatar_url,
                    }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border-strong/[0.12] object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-xs font-semibold text-white">
                        {user.full_name?.[0] ?? user.username[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </ProfilePopover>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-50">
                      {user.full_name ?? user.username}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      @{user.username}
                    </p>
                  </div>
                  <Plus size={14} className="ml-auto shrink-0 text-ink-400" />
                </button>
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
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-400 transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
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
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600">
                  Inbox
                </p>
                <button
                  type="button"
                  onClick={handleOpenArchived}
                  aria-label="View archived conversations"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60",
                    "border-border-strong text-ink-400",
                  )}
                >
                  <Archive className="h-3 w-3" />
                  Archived
                </button>
              </>
            )}
          </div>

          {view === "archived" ? (
            archivedLoading ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <Archive className="h-5 w-5 animate-pulse text-ink-600" />
                <p className="mt-2 text-xs text-ink-600">Loading archived…</p>
              </div>
            ) : archivedConvs.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong bg-surface/60 text-accent-300 shadow-card">
                  <Archive size={22} />
                </div>
                <p className="mt-4 text-sm font-medium text-ink-200">No archived conversations</p>
                <p className="mt-1 text-xs text-ink-600">
                  Archived conversations will show up here.
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
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong bg-surface/60 text-accent-300 shadow-card">
                <MessageSquare size={22} />
              </div>
              <p className="mt-4 text-sm font-medium text-ink-200">No conversations yet</p>
              <p className="mt-1 text-xs text-ink-600">
                Search for a user above to start messaging.
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