"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { FeedCard } from "@/components/feed/feed-card";
import { getFeedItems, type FeedItemWithAuthor } from "@/actions/feed.actions";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "project_update", label: "Projects" },
  { id: "team_update", label: "Teams" },
  { id: "branch_announcement", label: "Branches" },
  { id: "branch_event", label: "Events" },
];

const PAGE_SIZE = 20;

interface FeedListProps {
  initialItems: FeedItemWithAuthor[];
  initialTotal: number;
  currentUserId: string | null;
}

export function FeedList({ initialItems, initialTotal, currentUserId }: FeedListProps) {
  const [items, setItems] = useState<FeedItemWithAuthor[]>(initialItems);
  const [filter, setFilter] = useState("all");
  const [hasMore, setHasMore] = useState(initialItems.length < initialTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const itemsRef = useRef<FeedItemWithAuthor[]>(initialItems);
  const pageRef = useRef(1);
  const totalRef = useRef(initialTotal);
  const filterRef = useRef("all");
  const hasMoreRef = useRef(hasMore);
  const isFetchingRef = useRef(false);
  const generationRef = useRef(0);

  const loadFirstPage = useCallback(
    async (newFilter: string) => {
      isFetchingRef.current = true;
      setIsLoadingMore(true);
      setError(null);
      const generation = ++generationRef.current;
      try {
        const result = await getFeedItems(newFilter, 1, PAGE_SIZE, currentUserId);
        if (generation !== generationRef.current) return;
        pageRef.current = 1;
        totalRef.current = result.total;
        filterRef.current = newFilter;
        itemsRef.current = result.items;
        hasMoreRef.current = result.items.length < result.total;
        setItems(result.items);
        setHasMore(hasMoreRef.current);
      } catch {
        if (generation !== generationRef.current) return;
        setError("Couldn't load feed items. Please try again.");
      } finally {
        isFetchingRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [currentUserId],
  );

  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setError(null);
    const generation = generationRef.current;
    try {
      const nextPage = pageRef.current + 1;
      const result = await getFeedItems(filterRef.current, nextPage, PAGE_SIZE, currentUserId);
      if (generation !== generationRef.current) return;
      pageRef.current = nextPage;
      totalRef.current = result.total;
      const nextItems = [...itemsRef.current, ...result.items];
      itemsRef.current = nextItems;
      hasMoreRef.current = nextItems.length < totalRef.current;
      setItems(nextItems);
      setHasMore(hasMoreRef.current);
    } catch {
      if (generation !== generationRef.current) return;
      setError("Couldn't load more posts. Please try again.");
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextPage();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage]);

  const handleFilter = (id: string) => {
    const newFilter = id === "" || id === "all" ? "all" : id;
    if (newFilter === filterRef.current) return;
    setFilter(newFilter);
    void loadFirstPage(newFilter);
  };

  const handleRetry = () => {
    if (itemsRef.current.length === 0) {
      void loadFirstPage(filterRef.current);
    } else {
      void loadNextPage();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FilterBubbles
        options={FILTERS.filter((f) => f.id !== "all")}
        selected={filter === "all" ? "" : filter}
        onSelect={handleFilter}
      />

      <div className="flex flex-col gap-4">
        {items.length === 0 && !isLoadingMore && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium text-ink-200">No feed items yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Posts, updates, and branch events will appear here.
            </p>
          </div>
        )}

        {items.length === 0 && error && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-sm text-ink-500">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-border-strong bg-white/[0.03] px-6 py-2.5 text-sm font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-glow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {items.map((item) => (
          <FeedCard
            key={`${item.source_type}-${item.source_id}`}
            item={item}
            currentUserId={currentUserId}
          />
        ))}

        {error && items.length > 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <p className="text-sm text-ink-500">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-border-strong bg-white/[0.03] px-6 py-2.5 text-sm font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-glow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {isLoadingMore && (
          <div className="flex flex-col gap-4" aria-live="polite" aria-busy="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border-strong bg-white/[0.03] p-5 shadow-card backdrop-blur-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-ink-500/20" />
                  <div className="flex flex-col gap-2">
                    <div className="h-3 w-28 rounded-full bg-ink-500/20" />
                    <div className="h-2.5 w-20 rounded-full bg-ink-500/20" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="h-3 w-3/4 rounded-full bg-ink-500/20" />
                  <div className="h-3 w-1/2 rounded-full bg-ink-500/20" />
                </div>
              </div>
            ))}
            <div className="flex justify-center py-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
            </div>
          </div>
        )}
      </div>

      <div ref={sentinelRef} aria-hidden="true" />
    </div>
  );
}
