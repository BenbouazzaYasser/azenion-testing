"use client";

import { memo, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  createComment,
  deleteComment,
  getCommentsAction,
  updateComment,
  toggleCommentLike,
} from "@/actions/interactions.actions";
import { LikeButton } from "@/components/interactions/like-button";
import { useTranslation } from "@/components/translation/translation-provider";
import { getCurrentUserProfile } from "@/lib/current-user-profile";
import type { CommentAuthor, CommentWithAuthor } from "@/data/interactions";

interface CommentSectionProps {
  targetType: string;
  targetId: string;
  initialCount: number;
  currentUserId: string | null;
}

export function CommentSection({
  targetType,
  targetId,
  initialCount,
  currentUserId,
}: CommentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [input, setInput] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const { t } = useTranslation();

  // Own profile for optimistic inserts — ref, not state, so sending doesn't
  // re-render every CommentItem. Seeded by the shared one-flight fetch.
  const ownAuthorRef = useRef<CommentAuthor | null>(null);
  useEffect(() => {
    void getCurrentUserProfile().then((profile) => {
      if (profile) {
        ownAuthorRef.current = {
          id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        };
      }
    });
  }, []);

  // Two totals, deliberately separate: loadedCount is the pagination cursor
  // (top-level rows the server has served — NOT comments.length, which runs
  // ahead of server positions via optimistic inserts) and totalComments is the
  // server's top-level total from getCommentsAction. commentCount (badge)
  // counts ALL comments incl. replies — a different unit, so it can't drive
  // hasMore.
  const hasMore = loadedCount < totalComments;

  const findComment = (id: string) => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      const reply = comment.replies.find((r) => r.id === id);
      if (reply) return reply;
    }
    return null;
  };

  const removeCommentById = (prev: CommentWithAuthor[], id: string) =>
    prev
      .filter((c) => c.id !== id)
      .map((c) =>
        c.replies.some((r) => r.id === id)
          ? {
              ...c,
              replies: c.replies.filter((r) => r.id !== id),
              reply_count: Math.max(0, c.reply_count - 1),
            }
          : c,
      );

  const reinsertComment = (prev: CommentWithAuthor[], removed: CommentWithAuthor) => {
    const parentId = removed.parent_comment_id;
    if (parentId) {
      return prev.map((c) =>
        c.id === parentId
          ? {
              ...c,
              replies: [...c.replies, removed],
              reply_count: c.reply_count + 1,
            }
          : c,
      );
    }
    return [...prev, removed];
  };

  const toggleOpen = async () => {
    if (!isOpen && comments.length === 0) {
      setIsLoading(true);
      try {
        const result = await getCommentsAction(targetType, targetId, currentUserId);
        setComments(result.comments);
        setTotalComments(result.total);
        setLoadedCount(result.comments.length);
      } finally {
        setIsLoading(false);
      }
    }
    setIsOpen((v) => !v);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const result = await getCommentsAction(targetType, targetId, currentUserId, {
        offset: loadedCount,
      });
      setTotalComments(result.total);

      setComments((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const fresh = result.comments.filter((c) => !existingIds.has(c.id));
        return [...prev, ...fresh];
      });

      // Advance the cursor by rows the SERVER returned, not by rows appended:
      // the cursor tracks server positions (deduped rows — the caller's own
      // optimistic posts coming back around — were still consumed there).
      setLoadedCount((c) => c + result.comments.length);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePost = () => {
    if (!currentUserId || !input.trim() || isPending) return;

    const body = input.trim();
    setInput("");

    // Optimistic insert: render immediately with a temp ID; the server
    // action runs in the background and the temp row is swapped for the
    // canonical one (or removed + input restored) when it resolves.
    const tmpId = crypto.randomUUID();
    const author: CommentAuthor = ownAuthorRef.current ?? {
      id: currentUserId,
      full_name: null,
      username: "me",
      avatar_url: null,
    };
    const optimistic: CommentWithAuthor = {
      id: tmpId,
      user_id: currentUserId,
      target_type: targetType,
      target_id: targetId,
      parent_comment_id: null,
      body,
      created_at: new Date().toISOString(),
      updated_at: null,
      author,
      like_count: 0,
      user_has_liked: false,
      reply_count: 0,
      replies: [],
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentCount((c) => c + 1);
    setTotalComments((t) => t + 1);

    startTransition(async () => {
      const result = await createComment(targetType, targetId, body);
      if (result?.success && result.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === tmpId ? (result.comment as CommentWithAuthor) : c)),
        );
      } else {
        // Roll the optimistic row back and let the user retry.
        setComments((prev) => prev.filter((c) => c.id !== tmpId));
        setCommentCount((c) => Math.max(0, c - 1));
        setTotalComments((t) => Math.max(0, t - 1));
        setInput(body);
      }
    });
  };

  const handleReply = useCallback(
    (parentId: string, body: string) => {
      if (!currentUserId || !body.trim() || isPending) return;

      const tmpId = crypto.randomUUID();
      const author: CommentAuthor = ownAuthorRef.current ?? {
        id: currentUserId,
        full_name: null,
        username: "me",
        avatar_url: null,
      };
      const optimistic: CommentWithAuthor = {
        id: tmpId,
        user_id: currentUserId,
        target_type: targetType,
        target_id: targetId,
        parent_comment_id: parentId,
        body,
        created_at: new Date().toISOString(),
        updated_at: null,
        author,
        like_count: 0,
        user_has_liked: false,
        reply_count: 0,
        replies: [],
      };
      const topLevelId = optimistic.parent_comment_id;
      setComments((prev) =>
        prev.map((c) =>
          c.id === topLevelId
            ? {
                ...c,
                replies: [...c.replies, optimistic],
                reply_count: c.reply_count + 1,
              }
            : c,
        ),
      );
      setCommentCount((c) => c + 1);
      setExpandedReplies((prev) => new Set(prev).add(topLevelId as string));

      startTransition(async () => {
        const result = await createComment(targetType, targetId, body, parentId);
        if (result?.success && result.comment) {
          const reply = result.comment as CommentWithAuthor;
          const resolvedParent = reply.parent_comment_id ?? parentId;
          setComments((prev) =>
            prev.map((c) =>
              c.id === resolvedParent
                ? {
                    ...c,
                    replies: c.replies.map((r) => (r.id === tmpId ? reply : r)),
                  }
                : c,
            ),
          );
        } else {
          setComments((prev) => removeCommentById(prev, tmpId));
          setCommentCount((c) => Math.max(0, c - 1));
        }
      });
    },
    [currentUserId, isPending, targetType, targetId],
  );

  const handleEdit = useCallback(async (id: string, body: string): Promise<boolean> => {
    const result = await updateComment(id, body);
    if (result?.success) {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === id) return { ...c, body, updated_at: new Date().toISOString() };
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === id ? { ...r, body, updated_at: new Date().toISOString() } : r,
            ),
          };
        }),
      );
      return true;
    }
    return false;
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const removed = findComment(id);
      if (!removed) return;

      const isTopLevel = !removed.parent_comment_id;
      const idx = isTopLevel ? comments.findIndex((c) => c.id === id) : -1;
      const wasInLoadedRange = idx >= 0 && idx < loadedCount;

      if (isTopLevel) {
        if (wasInLoadedRange) {
          setLoadedCount((c) => c - 1);
        }
        setTotalComments((t) => Math.max(0, t - 1));
      }

      setComments((prev) => removeCommentById(prev, id));
      setCommentCount((c) => Math.max(0, c - 1));

      startTransition(async () => {
        const result = await deleteComment(id);
        if (result?.error) {
          setComments((prev) => reinsertComment(prev, removed));
          setCommentCount((c) => c + 1);
          if (isTopLevel) {
            setTotalComments((t) => t + 1);
            if (wasInLoadedRange) {
              setLoadedCount((c) => c + 1);
            }
          }
        }
      });
    },
    [comments, loadedCount],
  );

  const handleToggleReplies = useCallback((id: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "flex min-h-[44px] items-center gap-1.5 px-2.5 py-2 text-xs transition-all duration-300 ease-premium",
          isOpen ? "text-accent-400" : "text-ink-600 hover:text-ink-200",
        )}
      >
        <MessageSquare size={14} />
        <span>{commentCount}</span>
      </button>

      {isOpen && (
        <div className="mt-3 pt-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
            </div>
          ) : comments.length > 0 ? (
            <div className="flex flex-col gap-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  isPending={isPending}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  repliesExpanded={expandedReplies.has(comment.id)}
                  onToggleReplies={handleToggleReplies}
                />
              ))}
            </div>
          ) : (
            <p className="py-3 text-center text-sm text-ink-600">
              {currentUserId
                ? `${t("feed.noComments")}. ${t("feed.noCommentsStart")}`
                : t("feed.noComments")}
            </p>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-full bg-surface px-5 py-1.5 text-xs font-medium text-ink-200 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:border-accent-400/40 hover:text-ink-50 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
                ) : (
                  t("feed.loadMore")
                )}
              </button>
            </div>
          )}

          {currentUserId && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder={t("feed.commentPlaceholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePost();
                  }
                }}
                enterKeyHint="send"
                className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-base text-ink-50 placeholder:text-ink-600 outline-none transition-[border-color,box-shadow] focus:border-accent-400/50 focus:shadow-input focus-visible:ring-2 focus-visible:ring-accent-400 sm:text-sm"
              />
              <button
                type="button"
                onClick={handlePost}
                disabled={!input.trim() || isPending}
                className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-all duration-300 hover:bg-accent-500 disabled:opacity-50"
              >
                {t("feed.commentPost")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId: string | null;
  isPending: boolean;
  onReply?: (parentId: string, body: string) => void;
  onEdit: (id: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  repliesExpanded?: boolean;
  onToggleReplies?: (commentId: string) => void;
}

function CommentItemImpl({
  comment,
  currentUserId,
  isPending,
  onReply,
  onEdit,
  onDelete,
  repliesExpanded,
  onToggleReplies,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const { t } = useTranslation();

  const timeAgo = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at))
    : "";
  const isEdited =
    comment.updated_at && comment.updated_at !== comment.created_at;
  const isOwner = currentUserId === comment.user_id;
  const canReply = Boolean(onReply) && Boolean(currentUserId);

  const startEdit = () => {
    setDraft(comment.body);
    setIsEditing(true);
    setIsConfirmingDelete(false);
    setIsReplying(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(comment.body);
  };

  const saveEdit = () => {
    if (!draft.trim() || isSaving) return;

    startSaveTransition(async () => {
      const ok = await onEdit(comment.id, draft.trim());
      if (ok) setIsEditing(false);
    });
  };

  const confirmDelete = () => {
    setIsConfirmingDelete(false);
    startDeleteTransition(async () => {
      onDelete(comment.id);
    });
  };

  const toggleReply = () => {
    setReplyDraft("");
    setIsReplying((v) => !v);
    setIsEditing(false);
  };

  const postReply = () => {
    if (!onReply || !replyDraft.trim() || isPending) return;
    onReply(comment.id, replyDraft.trim());
    setReplyDraft("");
    setIsReplying(false);
  };

  return (
    <div className="group flex gap-2.5">
      <div className="shrink-0">
        {comment.author.avatar_url ? (
          <img
            src={comment.author.avatar_url}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-400 text-[10px] font-semibold text-white">
            {comment.author.full_name?.[0]?.toUpperCase() ?? "U"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-200">
            {comment.author.full_name ?? `@${comment.author.username}`}
          </span>
          <span className="text-[11px] text-ink-600">
            {timeAgo}
            {isEdited && ` (${t("feed.edited")})`}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {canReply && !isEditing && !isConfirmingDelete && (
              <button
                type="button"
                onClick={toggleReply}
                aria-expanded={isReplying}
                className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-ink-600 transition-colors hover:text-accent-300"
              >
                <Reply size={11} />
                {t("feed.reply")}
              </button>
            )}

            {isOwner && !isEditing && !isConfirmingDelete && (
              <div className="flex items-center gap-2 opacity-0 transition-opacity duration-300 ease-premium group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-ink-600 transition-colors hover:text-accent-300"
                >
                  <Pencil size={11} />
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-ink-600 transition-colors hover:text-red-400"
                >
                  <Trash2 size={11} />
                  {t("common.delete")}
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={2}
              className="w-full resize-y rounded-lg bg-surface px-3 py-2 text-base text-ink-50 outline-none transition-[border-color,box-shadow] focus:border-accent-400/50 focus:shadow-input focus-visible:ring-2 focus-visible:ring-accent-400 sm:text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={!draft.trim() || isSaving}
                className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-all duration-300 hover:bg-accent-500 disabled:opacity-50"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className="min-h-[44px] rounded-lg px-4 py-2 text-xs text-ink-400 transition-colors hover:text-ink-200"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : isConfirmingDelete ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2">
            <p className="text-xs text-ink-400">
              {t("feed.commentDeleteConfirm")}
            </p>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="min-h-[44px] rounded-lg bg-red-500/90 px-4 py-2 text-xs font-medium text-white transition-all duration-300 hover:bg-red-500 disabled:opacity-50"
            >
              {t("common.delete")}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
              className="min-h-[44px] rounded-lg px-3 py-2 text-xs text-ink-400 transition-colors hover:text-ink-200"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <p className="mt-0.5 break-words text-sm leading-relaxed text-ink-400 [overflow-wrap:anywhere]">
            {comment.body}
          </p>
        )}

        {!isEditing && (
          <div className="mt-1.5">
            <LikeButton
              initialCount={comment.like_count}
              initialLiked={comment.user_has_liked}
              currentUserId={currentUserId}
              onToggle={() => toggleCommentLike(comment.id)}
            />
          </div>
        )}

        {isReplying && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              placeholder={t("feed.commentReplyPlaceholder")}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  postReply();
                }
              }}
              autoFocus
              enterKeyHint="send"
              className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 text-base text-ink-50 placeholder:text-ink-600 outline-none transition-[border-color,box-shadow] focus:border-accent-400/50 focus:shadow-input focus-visible:ring-2 focus-visible:ring-accent-400 sm:text-sm"
            />
            <button
              type="button"
              onClick={postReply}
              disabled={!replyDraft.trim() || isPending}
              className="min-h-[44px] rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-all duration-300 hover:bg-accent-500 disabled:opacity-50"
            >
              {t("feed.reply")}
            </button>
            <button
              type="button"
              onClick={() => setIsReplying(false)}
              className="min-h-[44px] rounded-lg px-3 py-2 text-xs text-ink-400 transition-colors hover:text-ink-200"
            >
              {t("common.cancel")}
            </button>
          </div>
        )}

        {onReply && comment.reply_count > 0 && (
          <button
            type="button"
            onClick={() => onToggleReplies?.(comment.id)}
            aria-expanded={repliesExpanded}
            className="mt-1.5 flex min-h-[32px] items-center gap-1 px-1 py-1 text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
          >
            {repliesExpanded
              ? t("feed.hideReplies")
              : `${t("feed.showReplies")} ${comment.reply_count} ${comment.reply_count === 1 ? t("feed.replyOne") : t("feed.replyMany")}`}
          </button>
        )}

        {repliesExpanded && comment.replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-4 pl-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                isPending={isPending}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized so typing in the comment input doesn't re-render every comment.
const CommentItem = memo(CommentItemImpl);
