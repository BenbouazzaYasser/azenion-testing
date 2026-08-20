"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  Bookmark,
  Trash2,
  ArrowUpRight,
  LoaderCircle,
  BookOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsPanel } from "./settings-panel";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { formatDistanceToNow } from "@/lib/date";
import {
  getSavedPosts,
  toggleSavePost,
  type SavedPostItem,
} from "@/actions/interactions.actions";

const SOURCE_LABELS: Record<string, string> = {
  user_post: "Post",
  project_update: "Project update",
  team_update: "Team update",
  branch_announcement: "Announcement",
  branch_highlight: "Highlight",
  branch_event: "Event",
};

export function ActivitiesSection() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<SavedPostItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  const loadSaved = useCallback(() => {
    setIsLoading(true);
    startTransition(async () => {
      const posts = await getSavedPosts();
      setItems(posts);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    loadSaved();
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open, loadSaved]);

  function handleRemove(postId: string) {
    setItems((prev) => prev?.filter((item) => item.id !== postId) ?? null);
    startTransition(async () => {
      const result = await toggleSavePost(postId);
      if (!result) return;
      if ("error" in result) {
        loadSaved();
      }
    });
  }

  return (
    <div className="space-y-4">
      <SettingsPanel>
        <div className="flex items-start gap-4 p-6 sm:p-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-400/25 bg-accent/[0.08]">
            <Bookmark size={18} className="text-accent-300" />
          </div>
          <div className="flex flex-1 flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-ink-50">Saved items</h3>
              <p className="mt-1 max-w-md text-sm text-ink-400">
                Your bookmarked posts live here. Open them anytime or remove
                them from your list.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <Bookmark size={14} />
              Manage saved items
            </Button>
          </div>
        </div>
      </SettingsPanel>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label="Saved items"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-200"
            style={{ opacity: mounted ? 1 : 0 }}
            onClick={() => setOpen(false)}
          />

          <div
            ref={dialogFocusRef}
            tabIndex={-1}
            className="relative z-10 flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.95)",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-ink-50">Saved items</h2>
                <p className="mt-0.5 text-xs text-ink-500">
                  Everything you&apos;ve bookmarked across the feed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1.5 -mt-1.5 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {isLoading && items === null ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
                  <LoaderCircle size={22} className="animate-spin text-accent-300" />
                  <p className="text-sm">Loading your saved items…</p>
                </div>
              ) : items === null || items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong/20 bg-surface text-ink-500">
                    <BookOpen size={20} />
                  </span>
                  <p className="text-sm font-medium text-ink-300">No saved items yet</p>
                  <p className="max-w-xs text-xs text-ink-500">
                    Bookmark posts with the save button on any feed item and
                    they&apos;ll show up here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-3 py-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl border border-border-strong/20 object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-strong/20 bg-surface text-accent-300/70">
                          <Activity size={18} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-50">
                          {item.title || "Untitled post"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {SOURCE_LABELS[item.source_type] ?? "Post"}
                          {item.author_name ? ` by ${item.author_name}` : ""}
                          {item.saved_at
                            ? ` · saved ${formatDistanceToNow(new Date(item.saved_at))}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2.5">
                          <Link href={`/feed/post/${item.id}`} onClick={() => setOpen(false)}>
                            <ArrowUpRight size={13} />
                            Open
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(item.id)}
                          disabled={isPending}
                          aria-label={`Remove ${item.title || "post"} from saved items`}
                          className="h-8 px-2.5 text-ink-500 hover:text-red-300"
                        >
                          <Trash2 size={13} />
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
              <p className="text-xs text-ink-600">
                {items && items.length > 0
                  ? `${items.length} saved item${items.length === 1 ? "" : "s"}`
                  : "Nothing saved yet"}
              </p>
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}