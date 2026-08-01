"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ChatSidebarProps {
  conversations: Conversation[];
  currentUserId: string;
}

export function ChatSidebar({ conversations, currentUserId }: ChatSidebarProps) {
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
    <div className="flex h-full flex-col border-r border-border-strong">
      <div className="border-b border-border-strong p-4">
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-border-strong bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-ink-50 placeholder:text-ink-600 transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30"
            />
          </div>

          {showSearch && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border-strong bg-[rgba(10,11,16,0.96)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              {searchResults.map((user) => (
                <Link
                  key={user.id}
                  href={`/chat/start/${user.id}`}
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.06]"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full border border-white/[0.12] object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-gradient-to-br from-accent-500 to-accent-400 text-xs font-semibold text-white">
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
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
            Messages
          </h2>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <MessageSquare size={24} className="text-ink-600" />
              <p className="mt-3 text-sm text-ink-500">No conversations yet</p>
              <p className="mt-1 text-xs text-ink-600">
                Search for a user above to start messaging.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {conversations.map((conv) => {
                const isActive = pathname === `/chat/${conv.id}`;
                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                      isActive
                        ? "bg-accent/[0.08] border border-accent-400/20"
                        : "hover:bg-white/[0.04] border border-transparent",
                    )}
                  >
                    {conv.other_user?.avatar_url ? (
                      <img
                        src={conv.other_user.avatar_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-white/[0.12] object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-gradient-to-br from-accent-500 to-accent-400 text-sm font-semibold text-white">
                        {conv.other_user?.full_name?.[0] ?? conv.other_user?.username[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink-50">
                          {conv.other_user?.full_name ?? conv.other_user?.username ?? "Unknown"}
                        </p>
                        {conv.last_message?.created_at && (
                          <span className="shrink-0 text-[11px] text-ink-600">
                            {formatDistanceToNow(new Date(conv.last_message.created_at))}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
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
