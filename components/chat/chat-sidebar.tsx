"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { formatDistanceToNow } from "@/lib/date";
import { searchUsers } from "@/actions/chat.actions";

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
  } | null;
  updated_at: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; full_name: string | null; username: string; avatar_url: string | null }[]
  >([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
        "flex h-full min-h-0 flex-col border-r border-border-strong bg-void-900/30 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.05),transparent_55%)]",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border-strong p-4 pb-3">
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-border-strong bg-surface py-2.5 pl-10 pr-3 text-sm text-ink-50 placeholder:text-ink-600 transition-all duration-300 ease-premium hover:border-border focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-2 focus:ring-accent-400/25"
            />
          </div>

          {showSearch && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 animate-dropdown-in overflow-hidden rounded-xl border border-border-strong bg-[rgba(10,11,16,0.96)] shadow-dropdown backdrop-blur-2xl">
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
                    <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border-strong/[0.12] object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-xs font-semibold text-white">
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-500">
              Messages
            </h2>
            {conversations.length > 0 && (
              <span className="text-[11px] font-medium tabular-nums text-ink-600">
                {conversations.length}
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-strong bg-surface text-accent-300">
                <MessageSquare size={22} />
              </div>
              <p className="mt-3 text-sm font-medium text-ink-200">No conversations yet</p>
              <p className="mt-1 text-xs text-ink-600">
                Search for a user above to start messaging.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {conversations.map((conv) => {
                const isActive = pathname === `/chat/${conv.id}`;
                const isOwnLast = conv.last_message?.sender_id === currentUserId;
                const name = conv.other_user?.full_name ?? conv.other_user?.username ?? "Unknown";
                const initial = conv.other_user?.full_name?.[0] ?? conv.other_user?.username[0]?.toUpperCase() ?? "?";

                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                      isActive
                        ? "border border-accent-400/40 bg-[linear-gradient(135deg,rgba(40,40,255,0.16),rgba(40,40,255,0.05))] shadow-glow-sm"
                        : "border border-transparent hover:border-border hover:bg-surface/50 hover:shadow-card",
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
                          "h-10 w-10 shrink-0 rounded-full border border-border-strong/[0.12] object-cover transition-all duration-300",
                          isActive && "border-accent-400/50 shadow-glow-sm",
                        )}
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-glow text-sm font-semibold text-white transition-all duration-300",
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
                          {conv.other_user?.username && conv.other_user?.full_name ? (
                            <span className="ml-1.5 text-xs font-normal text-ink-500">
                              @{conv.other_user.username}
                            </span>
                          ) : null}
                        </p>
                        {conv.last_message?.created_at && (
                          <span className="shrink-0 text-[10px] font-medium tracking-wide text-ink-600 transition-colors duration-200 group-hover:text-ink-500">
                            {formatDistanceToNow(new Date(conv.last_message.created_at))}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {isOwnLast && (
                          <span className="font-medium text-ink-400">You: </span>
                        )}
                        {conv.last_message?.content ?? "No messages yet"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
