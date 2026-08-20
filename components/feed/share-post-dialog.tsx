"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, Send, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import {
  searchShareRecipients,
  sharePost,
  type ShareRecipient,
} from "@/actions/share.actions";

interface SharePostDialogProps {
  open: boolean;
  postId: string;
  currentUserId: string | null;
  onClose: () => void;
}

const MAX_MESSAGE_LENGTH = 500;
const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

export function SharePostDialog({
  open,
  postId,
  currentUserId,
  onClose,
}: SharePostDialogProps) {
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open, { initialFocus: "none" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShareRecipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ShareRecipient | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setMessage("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function runSearch(term: string) {
    const myId = ++requestIdRef.current;
    setSearching(true);
    searchShareRecipients(term, 8).then((items) => {
      if (requestIdRef.current !== myId) return;
      setResults(items);
      setSearching(false);
    });
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      requestIdRef.current += 1;
      setResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value.trim()), 300);
  }

  function handleShare() {
    if (!selected || isPending) return;
    startTransition(async () => {
      const result = await sharePost(postId, selected.id, message.trim() || null);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        message.trim()
          ? `Post shared with ${selected.full_name || `@${selected.username}`}`
          : "Post shared",
      );
      onClose();
    });
  }

  if (!open) return null;

  const canShare = Boolean(selected) && !isPending;
  const showSearch = !selected;
  const showEmpty = showSearch && Boolean(query.trim()) && !searching && results.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Share post"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogFocusRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border-strong panel-gradient shadow-dialog backdrop-blur-2xl transition-all duration-200 ease-premium focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-border-strong/50 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-ink-50">Share post</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
          >
            <X size={16} />
          </button>
        </div>

        <div className={cn("space-y-3 px-6 py-5", !showSearch && "overflow-y-auto", SCROLLBAR_CLASSES)}>
          {showSearch ? (
            <div>
              <label
                htmlFor="share-recipient-search"
                className="mb-1.5 block text-xs font-medium text-ink-400"
              >
                Find a member to share with
              </label>
              <div className="relative">
                <Search
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
                />
                <input
                  id="share-recipient-search"
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search by name or @username"
                  autoFocus
                  maxLength={60}
                  disabled={isPending}
                  className={cn(inputClass, "pl-10")}
                />
                {searching ? (
                  <Loader2
                    size={14}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-accent-300"
                  />
                ) : null}
              </div>

              <div className="mt-2 max-h-56 overflow-y-auto overscroll-contain pt-1">
                {searching && query.trim() ? (
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-surface" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 animate-pulse rounded bg-ink-600/40" />
                      <div className="h-2.5 w-20 animate-pulse rounded bg-surface" />
                    </div>
                  </div>
                ) : null}

                {showEmpty ? (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-ink-500">
                      <User size={18} />
                    </div>
                    <p className="mt-3 text-sm font-medium text-ink-200">No members found</p>
                    <p className="mt-1 text-xs text-ink-500">
                      Try a different name, or a member&apos;s @username.
                    </p>
                  </div>
                ) : null}

                {!searching && results.length > 0
                  ? results.map((r) => {
                      const display = r.full_name || `@${r.username}`;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelected(r)}
                          disabled={isPending}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 ease-premium hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 focus-visible:ring-inset"
                        >
                          {r.avatar_url ? (
                            <img
                              src={r.avatar_url}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full border border-border-strong/[0.12] object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-400 text-xs font-semibold text-white">
                              {display[0]?.toUpperCase() ?? "?"}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-ink-100">
                              {r.full_name || `@${r.username}`}
                            </span>
                            <span className="block truncate text-xs text-ink-500">
                              @{r.username}
                              {r.institution ? ` \u2022 ${r.institution}` : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  : null}
              </div>
            </div>
          ) : (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-400">Sharing with</span>
              <div className="flex items-center gap-3 rounded-xl border border-accent-400/30 bg-accent/[0.08] px-3 py-2.5">
                {selected?.avatar_url ? (
                  <img
                    src={selected.avatar_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-border-strong/[0.12] object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] bg-gradient-to-br from-accent to-accent-400 text-xs font-semibold text-white">
                    {(selected?.full_name?.[0] ?? selected?.username?.[0] ?? "?").toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-50">
                    {selected?.full_name || `@${selected?.username}`}
                  </span>
                  {selected?.username ? (
                    <span className="block truncate text-xs text-ink-400">@{selected.username}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  disabled={isPending}
                  aria-label="Change recipient"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="share-message"
              className="mb-1.5 block text-xs font-medium text-ink-400"
            >
              Add a message <span className="text-ink-600">(optional)</span>
            </label>
            <div className="relative">
              <textarea
                id="share-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share why this is worth reading\u2026"
                rows={3}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={isPending}
                className={cn(inputClass, "resize-none leading-relaxed")}
              />
              {message.length > 0 ? (
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-[0.68rem] font-medium tabular-nums text-ink-600">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border-strong/50 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleShare}
            disabled={!canShare}
            className={!canShare ? "disabled:pointer-events-none disabled:opacity-40" : undefined}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sharing\u2026
              </>
            ) : (
              <>
                <Send size={13} />
                Share
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}