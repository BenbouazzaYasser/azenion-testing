"use client";

import { useRef, useState, useTransition } from "react";
import {
  ImagePlus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createBranchAnnouncement,
  deleteBranchAnnouncement,
  updateBranchAnnouncement,
  uploadBranchAnnouncementImage,
  createBranchHighlight,
  deleteBranchHighlight,
  updateBranchHighlight,
  uploadBranchHighlightImage,
} from "@/actions/branch.actions";
import { getBranchFeedItems, toggleFeedPin, type FeedItemWithAuthor } from "@/actions/feed.actions";
import { FeedCard } from "@/components/feed/feed-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

interface BranchFeedProps {
  branchId: string;
  branchSlug: string;
  initialItems: FeedItemWithAuthor[];
  currentUserId: string | null;
  canManage: boolean;
}

type ComposeMode = "announcement" | "highlight";

const inputClass =
  "w-full rounded-xl border border-border-strong/[0.08] bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input";

const labelClass = "mb-1.5 block text-sm font-medium text-ink-200";

const MANAGEABLE_TYPES = new Set<FeedItemWithAuthor["source_type"]>([
  "branch_announcement",
  "branch_highlight",
]);

const PINNABLE_TYPES = new Set<FeedItemWithAuthor["source_type"]>([
  "branch_announcement",
  "team_update",
  "project_update",
]);

export function BranchFeed({
  branchId,
  branchSlug,
  initialItems,
  currentUserId,
  canManage,
}: BranchFeedProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<FeedItemWithAuthor[]>(initialItems);
  const [total, setTotal] = useState(initialItems.length);
  const [page, setPage] = useState(1);

  // Compose form
  const [mode, setMode] = useState<ComposeMode>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<FeedItemWithAuthor["source_type"] | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLink, setEditLink] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearForm() {
    setTitle("");
    setBody("");
    setLinkUrl("");
    setIsPinned(false);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function switchMode(next: ComposeMode) {
    setMode(next);
    clearForm();
  }

  function handlePublish() {
    if (!title.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("branch_id", branchId);
    fd.set("title", title.trim());
    fd.set("slug", branchSlug);
    if (mode === "announcement") {
      fd.set("body", body.trim());
      fd.set("is_pinned", isPinned ? "true" : "false");
    } else {
      fd.set("description", body.trim());
      fd.set("link_url", linkUrl.trim());
    }

    startTransition(async () => {
      try {
        const result =
          mode === "announcement"
            ? await createBranchAnnouncement(fd)
            : await createBranchHighlight(fd);
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        if (result && "success" in result && result.success && result.id && imageFile) {
          const imgFd = new FormData();
          imgFd.set("branch_id", branchId);
          imgFd.set("slug", branchSlug);
          imgFd.set("update_id", result.id);
          imgFd.set("image", imageFile);
          if (mode === "highlight") imgFd.set("highlight_id", result.id);
          const imgResult =
            mode === "announcement"
              ? await uploadBranchAnnouncementImage(imgFd)
              : await uploadBranchHighlightImage(imgFd);
          if (imgResult && "error" in imgResult && imgResult.error) {
            setError(imgResult.error);
            return;
          }
        }
        clearForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    });
  }

  function handleEdit(item: FeedItemWithAuthor) {
    setEditingId(item.source_id);
    setEditingType(item.source_type);
    setEditTitle(item.title);
    setEditBody(item.body ?? "");
    setEditLink(item.link_url ?? "");
    setMenuOpenId(null);
  }

  function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", editingId);
    fd.set("title", editTitle.trim());
    fd.set("slug", branchSlug);

    startTransition(async () => {
      const result =
        editingType === "branch_highlight"
          ? await (async () => {
              fd.set("description", editBody.trim());
              fd.set("link_url", editLink.trim());
              return updateBranchHighlight(fd);
            })()
          : await (async () => {
              fd.set("body", editBody.trim());
              return updateBranchAnnouncement(fd);
            })();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      setEditingType(null);
      router.refresh();
    });
  }

  function handleTogglePin(item: FeedItemWithAuthor) {
    const fd = new FormData();
    fd.set("post_id", item.id);
    fd.set("scope", "branch");
    fd.set("branch_id", branchId);
    fd.set("slug", branchSlug);
    startTransition(async () => {
      const result = await toggleFeedPin(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setMenuOpenId(null);
      router.refresh();
    });
  }

  function handleDelete(item: FeedItemWithAuthor) {
    const fd = new FormData();
    fd.set("id", item.source_id ?? "");
    fd.set("slug", branchSlug);

    startTransition(async () => {
      const result =
        item.source_type === "branch_highlight"
          ? await deleteBranchHighlight(fd)
          : await deleteBranchAnnouncement(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setMenuOpenId(null);
      router.refresh();
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    startTransition(async () => {
      const result = await getBranchFeedItems(branchId, nextPage, 20, currentUserId);
      setItems((prev) => [...prev, ...result.items]);
      setTotal(result.total);
    });
  }

  const hasMore = items.length < total;
  const isManageable = (item: FeedItemWithAuthor) => canManage && MANAGEABLE_TYPES.has(item.source_type);

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="branch-feed-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            Announcements & Highlights
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="branch-feed-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Branch Feed
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-400">
            The latest from this branch — announcements, highlights, team updates, and project progress.
          </p>
        </Reveal>

        {canManage ? (
          <Reveal delay={160}>
            <div className="mt-8 rounded-2xl border border-border-strong/[0.08] card-surface p-6 shadow-card backdrop-blur-xl sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-medium text-ink-200">Share with the branch</h3>
                <div className="flex rounded-xl border border-border-strong/[0.08] bg-surface p-1">
                  {(["announcement", "highlight"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                        mode === m
                          ? "bg-accent/[0.12] text-accent-200"
                          : "text-ink-500 hover:text-ink-300",
                      )}
                    >
                      {m === "announcement" ? <MessageSquare size={14} /> : <Sparkles size={14} />}
                      {m === "announcement" ? "Announcement" : "Highlight"}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-400">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <div>
                  <label className={labelClass}>
                    {mode === "announcement" ? "Title" : "Title"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      mode === "announcement"
                        ? "What's new with the branch?"
                        : "e.g. Hackathon Champion 2026"
                    }
                    maxLength={200}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {mode === "announcement" ? "Details (optional)" : "Description (optional)"}
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      mode === "announcement"
                        ? "Add more detail..."
                        : "What makes this a highlight?"
                    }
                    rows={3}
                    maxLength={5000}
                    className={cn(inputClass, "resize-none")}
                  />
                </div>

                {mode === "highlight" ? (
                  <div>
                    <label className={labelClass}>Link URL (optional)</label>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      maxLength={500}
                      className={inputClass}
                    />
                  </div>
                ) : null}

                {mode === "announcement" ? (
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-300">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="h-4 w-4 accent-accent-400"
                    />
                    <Pin size={14} className="text-accent-400" />
                    Pin to top of the branch feed
                  </label>
                ) : null}

                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 rounded-xl border border-border-strong/[0.08] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute -right-2 -top-2 rounded-full border border-border-strong/[0.08] bg-surface p-1 text-ink-400 transition-colors hover:text-ink-200"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex h-9 items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-accent-400"
                  >
                    <ImagePlus size={16} />
                    Add image
                  </button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handlePublish}
                    disabled={isPending || !title.trim()}
                  >
                    <Send size={14} />
                    {isPending ? "Publishing..." : "Publish"}
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        ) : null}

        {items.length > 0 ? (
          <div className="mt-10 space-y-6">
            {items.map((item, i) => {
              const manageable = isManageable(item);
              const pinable = canManage && PINNABLE_TYPES.has(item.source_type);
              const showMenu = manageable || pinable;
              return (
                <Reveal key={`${item.source_type}-${item.source_id}`} delay={Math.min(i, 4) * 60}>
                  {editingId === item.source_id ? (
                    <div className="rounded-2xl border border-border-strong/[0.08] card-surface p-5 shadow-card backdrop-blur-xl sm:p-6">
                      <h3 className="text-base font-medium text-ink-200">
                        Edit {editingType === "branch_highlight" ? "highlight" : "announcement"}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={200}
                          className={inputClass}
                        />
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={3}
                          maxLength={5000}
                          className={cn(inputClass, "resize-none")}
                        />
                        {editingType === "branch_highlight" ? (
                          <input
                            type="text"
                            value={editLink}
                            onChange={(e) => setEditLink(e.target.value)}
                            placeholder="https://..."
                            maxLength={500}
                            className={inputClass}
                          />
                        ) : null}
                        {error ? (
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-400">
                            {error}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={isPending || !editTitle.trim()}
                          >
                            {isPending ? "Saving..." : "Save"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditingType(null);
                            }}
                            className="inline-flex h-9 items-center text-sm text-ink-500 transition-colors hover:text-ink-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <FeedCard
                        item={item}
                        currentUserId={currentUserId}
                        headerAction={
                          showMenu ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setMenuOpenId(menuOpenId === item.source_id ? null : item.source_id)
                                }
                                className="rounded-lg bg-surface p-1.5 text-ink-500 transition-colors hover:bg-surface-hover hover:text-ink-200"
                                aria-label="Manage post"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {menuOpenId === item.source_id ? (
                                <div className="absolute right-0 top-full z-20 mt-1 w-[140px] overflow-hidden rounded-xl border border-border-strong/[0.08] bg-glass-strong shadow-xl backdrop-blur-xl">
                                  {pinable ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePin(item)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-300 transition-colors hover:bg-accent/[0.08] hover:text-accent-300"
                                    >
                                      <Pin size={13} />
                                      {item.is_pinned ? "Unpin" : "Pin"}
                                    </button>
                                  ) : null}
                                  {manageable ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(item)}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-300 transition-colors hover:bg-accent/[0.08] hover:text-accent-300"
                                      >
                                        <Pencil size={13} />
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(item)}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/[0.08]"
                                      >
                                        <Trash2 size={13} />
                                        Delete
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null
                        }
                      />
                    </div>
                  )}
                </Reveal>
              );
            })}
          </div>
        ) : (
          <Reveal delay={160}>
            <div className="mt-10 flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong/[0.08] bg-surface text-accent-300">
                <MessageSquare className="h-7 w-7 text-accent-300" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-200">No posts in this branch yet.</p>
                <p className="mt-1.5 text-sm text-ink-600">
                  {canManage
                    ? "Publish the first announcement or highlight to get things moving."
                    : "Check back later for announcements and updates."}
                </p>
              </div>
            </div>
          </Reveal>
        )}

        {hasMore && !isPending ? (
          <div className="flex justify-center pt-8">
            <button
              type="button"
              onClick={handleLoadMore}
              className="rounded-full border border-border-strong/[0.08] bg-surface px-6 py-2.5 text-sm font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:text-ink-50 hover:shadow-glow-sm"
            >
              Load More
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
