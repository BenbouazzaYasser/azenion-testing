"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ImagePlus,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ALLOWED_ASSET_TYPES,
  MAX_ASSET_SIZE,
} from "@/lib/validations/project.schema";
import type { FeedItemWithAuthor } from "@/actions/feed.actions";

interface UpdateAuthor {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface UpdateItem {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  images?: string[];
  videos?: string[];
  created_at: string;
  updated_at: string;
  author: UpdateAuthor;
  like_count?: number;
  comment_count?: number;
  user_has_liked?: boolean;
  /** Whether this post is pinned in the feed being rendered. */
  is_pinned?: boolean;
}

interface FeedActionResult {
  error?: string;
  success?: boolean;
  id?: string;
  image_url?: string;
  [key: string]: unknown;
}

export interface FeedActions {
  create: (fd: FormData) => Promise<FeedActionResult>;
  uploadImage: (fd: FormData) => Promise<FeedActionResult>;
  update: (fd: FormData) => Promise<FeedActionResult>;
  delete: (fd: FormData) => Promise<FeedActionResult>;
  /** Optional: pin/unpin an update in this feed's scope. */
  togglePin?: (fd: FormData) => Promise<FeedActionResult>;
}

export interface FeedLabels {
  badge: string;
  heading: string;
  createPlaceholder: string;
  emptyTitle: string;
  emptyMemberDescription: string;
  emptyNonMemberDescription: string;
  formHeading?: string;
  entityIdField: "project_id" | "team_id" | "branch_id";
  interactionType: "project_update" | "team_update" | "branch_announcement";
}

interface EntityUpdatesFeedProps {
  entityId: string;
  entitySlug: string;
  updates: UpdateItem[];
  currentUserId: string | null;
  isMember: boolean;
  /** Overrides the "can write to this feed" check (e.g. team feed requires CREATE_FEED_POSTS). */
  canPost?: boolean;
  /** Whether the current user may pin/unpin posts in this feed (e.g. team EDIT_FEED_POSTS). */
  canPin?: boolean;
  actions: FeedActions;
  labels: FeedLabels;
  wide?: boolean;
}

const MAX_IMAGES = 6;
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;
const MAX_PREVIEW_HEIGHT = 320;

const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-white/[0.06] focus:shadow-input disabled:cursor-not-allowed disabled:opacity-50";

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_PREVIEW_HEIGHT)}px`;
}

function toFeedItem(update: UpdateItem, interactionType: FeedLabels["interactionType"]): FeedItemWithAuthor {
  const images =
    update.images && update.images.length > 0
      ? update.images
      : update.image_url
        ? [update.image_url]
        : [];

  return {
    id: update.id,
    source_type: interactionType,
    source_id: update.id,
    author_id: update.author.id,
    author_name: update.author.full_name || update.author.username,
    author_avatar: update.author.avatar_url,
    author_username: update.author.username,
    entity_name: null,
    entity_slug: null,
    entity_logo_url: null,
    entity_type: null,
    branch_name: null,
    branch_slug: null,
    branch_logo_url: null,
    title: update.title,
    body: update.body,
    images,
    videos: update.videos ?? [],
    link_url: null,
    is_pinned: update.is_pinned ?? false,
    created_at: update.created_at,
    updated_at: update.updated_at,
    like_count: update.like_count ?? 0,
    comment_count: update.comment_count ?? 0,
    user_has_liked: update.user_has_liked ?? false,
    liked_by_names: [],
    saved_by_user: false,
  };
}

export function EntityUpdatesFeed({
  entityId,
  entitySlug,
  updates: initialUpdates,
  currentUserId,
  isMember,
  canPost: canPostPermission = isMember,
  canPin = false,
  actions,
  labels,
  wide = false,
}: EntityUpdatesFeedProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const previewsRef = useRef<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<{
    index: number;
    total: number;
  } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const updates = initialUpdates;

  useEffect(() => {
    return () => {
      for (const url of previewsRef.current) URL.revokeObjectURL(url);
    };
  }, []);

  const uploadProgress =
    uploadStep && uploadStep.total > 1
      ? Math.max(0, (uploadStep.index - 1) / uploadStep.total)
      : 0;

  function addAccepted(accepted: File[]) {
    const urls = accepted.map((f) => URL.createObjectURL(f));
    previewsRef.current = [...previewsRef.current, ...urls];
    setPreviews((prev) => [...prev, ...urls]);
    setFiles((prev) => [...prev, ...accepted]);
  }

  function removeImage(index: number) {
    const url = previews[index];
    if (url) URL.revokeObjectURL(url);
    previewsRef.current = previewsRef.current.filter((_, i) => i !== index);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    for (const url of previewsRef.current) URL.revokeObjectURL(url);
    previewsRef.current = [];
    if (bodyRef.current) bodyRef.current.style.height = "";
    setTitle("");
    setBody("");
    setFiles([]);
    setPreviews([]);
    setError(null);
  }

  function handleFiles(selected: FileList | null) {
    if (!selected || submitting || !canPostPermission) return;

    let message: string | null = null;
    const valid: File[] = [];
    for (const file of Array.from(selected)) {
      if (!ALLOWED_ASSET_TYPES.includes(file.type)) {
        message = `"${file.name}" isn't a PNG, JPEG, or WebP image.`;
        continue;
      }
      if (file.size > MAX_ASSET_SIZE) {
        message = `"${file.name}" exceeds the 2MB limit.`;
        continue;
      }
      valid.push(file);
    }

    const remaining = MAX_IMAGES - previews.length;
    if (valid.length > remaining) {
      message = message ?? `You can attach up to ${MAX_IMAGES} images.`;
    }
    const accepted = valid.slice(0, Math.max(remaining, 0));

    if (accepted.length > 0) {
      addAccepted(accepted);
      setError(null);
    }
    if (message) setError(message);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    const hasText = Boolean(title.trim() || body.trim());
    if (!hasText || submitting || !canPostPermission) return;
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.set(labels.entityIdField, entityId);
      fd.set("title", title.trim());
      fd.set("body", body.trim());
      fd.set("slug", entitySlug);

      const created = await actions.create(fd);
      if (created && "error" in created && created.error) {
        setError(created.error);
        return;
      }
      const postId = "id" in created ? created.id : null;
      if (!postId) {
        setError("Something went wrong while posting. Please try again.");
        return;
      }

      for (let i = 0; i < files.length; i++) {
        setUploadStep({ index: i + 1, total: files.length });
        const imgFd = new FormData();
        imgFd.set(labels.entityIdField, entityId);
        imgFd.set("update_id", postId);
        imgFd.set("image", files[i]!);
        imgFd.set("slug", entitySlug);
        const uploaded = await actions.uploadImage(imgFd);
        if (uploaded && "error" in uploaded && uploaded.error) {
          setError(uploaded.error);
          break;
        }
      }

      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
      setUploadStep(null);
    }
  }

  const canPost = Boolean(title.trim() || body.trim()) && !submitting && canPostPermission;

  function handleEdit(update: UpdateItem) {
    setEditingId(update.id);
    setEditTitle(update.title);
    setEditBody(update.body ?? "");
    setMenuOpenId(null);
  }

  function handleSaveEdit() {
    if (!editingId || !editTitle.trim()) return;
    const fd = new FormData();
    fd.set("id", editingId);
    fd.set("title", editTitle.trim());
    fd.set("body", editBody.trim());
    fd.set("slug", entitySlug);

    startTransition(async () => {
      const result = await actions.update(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(updateId: string) {
    const fd = new FormData();
    fd.set("id", updateId);
    fd.set("slug", entitySlug);
    fd.set(labels.entityIdField, entityId);

    startTransition(async () => {
      const result = await actions.delete(fd);
      setMenuOpenId(null);
      if (result && "error" in result && result.error) {
        setError(result.error as string);
        return;
      }
      router.refresh();
    });
  }

  function handleTogglePin(update: UpdateItem) {
    if (!actions.togglePin) return;
    const fd = new FormData();
    fd.set(labels.entityIdField, entityId);
    fd.set("update_id", update.id);
    fd.set("slug", entitySlug);

    startTransition(async () => {
      const result = await actions.togglePin!(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setMenuOpenId(null);
      router.refresh();
    });
  }

  return (
    <section className="relative py-16 sm:py-20 lg:py-24" aria-labelledby="entity-updates-heading">
      <div className={cn("mx-auto px-5 sm:px-8 lg:px-12", wide ? "max-w-[960px]" : "max-w-[920px]")}>
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {labels.badge}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="entity-updates-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {labels.heading}
          </h2>
        </Reveal>

        {canPostPermission ? (
          <Reveal delay={120}>
            <div className="mt-8 rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-card backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="shrink-0 text-accent-400" />
                <h3 className="text-sm font-medium text-ink-300">
                  {labels.formHeading ?? "Share an update\u2026"}
                </h3>
              </div>

              {error ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-400">
                  <span className="flex-1">{error}</span>
                  {!submitting ? (
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      aria-label="Dismiss error"
                      className="shrink-0 text-rose-400/70 transition-colors hover:text-rose-300"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Headline (optional)\u2026"
                  maxLength={MAX_TITLE_LENGTH}
                  disabled={submitting}
                  className={inputClass}
                />

                <div className="relative">
                  <textarea
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      autosize(e.target);
                    }}
                    placeholder={labels.createPlaceholder}
                    rows={3}
                    maxLength={MAX_BODY_LENGTH}
                    disabled={submitting}
                    className={cn(inputClass, "resize-none leading-relaxed")}
                  />
                  {body.length > 0 ? (
                    <span className="pointer-events-none absolute bottom-2.5 right-3 text-[0.68rem] font-medium tabular-nums text-ink-600">
                      {body.length}/{MAX_BODY_LENGTH}
                    </span>
                  ) : null}
                </div>

                {previews.length > 0 ? (
                  <div
                    className={cn(
                      "grid gap-2",
                      previews.length === 1 ? "grid-cols-1" : "grid-cols-2",
                    )}
                  >
                    {previews.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border border-border-strong bg-white/[0.03]",
                          previews.length === 1 ? "aspect-[16/10]" : "aspect-[4/3]",
                        )}
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.03]"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          disabled={submitting}
                          aria-label={`Remove image ${i + 1}`}
                          className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {uploadStep && uploadStep.total > 1 && submitting ? (
                <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent transition-[width] duration-300 ease-premium"
                    style={{ width: `${uploadProgress * 100}%` }}
                  />
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-strong/50 pt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || previews.length >= MAX_IMAGES}
                  className="inline-flex h-9 items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-accent-400 disabled:pointer-events-none disabled:opacity-40"
                  title="PNG, JPEG, or WebP \u2014 up to 2MB each"
                >
                  <ImagePlus size={16} />
                  Add images
                  {previews.length > 0 ? (
                    <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[0.68rem] font-medium text-ink-400">
                      {previews.length}/{MAX_IMAGES}
                    </span>
                  ) : null}
                </button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canPost}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {uploadStep
                        ? uploadStep.total > 1
                          ? `Uploading ${uploadStep.index}/${uploadStep.total}`
                          : "Uploading image\u2026"
                        : "Posting\u2026"}
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Reveal>
        ) : null}

        {updates.length > 0 ? (
          <div className="mt-10 space-y-6">
            {updates.map((update, i) => (
              <Reveal key={update.id} delay={Math.min(i, 4) * 60}>
                {editingId === update.id ? (
                  <div className="rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-card backdrop-blur-xl sm:p-6">
                    <h3 className="text-base font-medium text-ink-200">Edit update</h3>
                    <div className="mt-4 space-y-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={MAX_TITLE_LENGTH}
                        className={inputClass}
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        maxLength={MAX_BODY_LENGTH}
                        className={cn(inputClass, "resize-none")}
                      />
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
                            setError(null);
                          }}
                          className="inline-flex h-9 items-center text-sm text-ink-500 transition-colors hover:text-ink-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FeedCard
                    item={toFeedItem(update, labels.interactionType)}
                    currentUserId={currentUserId}
                    headerAction={
                      canPin || currentUserId === update.author.id ? (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpenId(menuOpenId === update.id ? null : update.id)
                            }
                            className="rounded-lg bg-white/[0.04] p-1.5 text-ink-500 transition-colors hover:bg-white/[0.08] hover:text-ink-200"
                            aria-label="Manage update"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {menuOpenId === update.id ? (
                            <div className="absolute right-0 top-full z-20 mt-1 w-[140px] overflow-hidden rounded-xl border border-border-strong bg-[#0e1016] shadow-xl backdrop-blur-xl">
                              {canPin ? (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(update)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-300 transition-colors hover:bg-accent/[0.08] hover:text-accent-300"
                                >
                                  <Pin size={13} />
                                  {update.is_pinned ? "Unpin" : "Pin"}
                                </button>
                              ) : null}
                              {currentUserId === update.author.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(update)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink-300 transition-colors hover:bg-accent/[0.08] hover:text-accent-300"
                                  >
                                    <Pencil size={13} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(update.id)}
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
                      ) : undefined
                    }
                  />
                )}
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={160}>
            <div className="mt-10 flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-white/[0.03] text-accent-300">
                <MessageSquare className="h-7 w-7 text-accent-300" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-200">
                  {labels.emptyTitle}
                </p>
                <p className="mt-1.5 text-sm text-ink-600">
                  {isMember
                    ? labels.emptyMemberDescription
                    : labels.emptyNonMemberDescription}
                </p>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
