"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CommentWithAuthor } from "@/data/interactions";
import { getBatchCommentLikeCounts, getUserCommentLikes } from "@/data/interactions";
import {
  notifyPostLiked,
  notifyPostCommented,
  notifyCommentReplied,
  notifyMentions,
  insertNotification,
} from "@/lib/notifications";
import {
  IMAGE_STORAGE_BUCKET,
  VIDEO_STORAGE_BUCKET,
} from "@/lib/validations/media.schema";

const TARGET_TABLES: Record<string, string> = {
  project_update: "project_updates",
  team_update: "team_updates",
  branch_announcement: "branch_announcements",
};

function getTargetTable(targetType: string) {
  return TARGET_TABLES[targetType] ?? null;
}

/**
 * The authenticated user is always derived from the server session.
 * Client-provided ids are never trusted for authorization.
 */
async function getSessionUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Mirrors `is_feed_post_visible`: only team_update / project_update targets
 * are visibility-restricted; every other source type (branch items, user
 * posts) is public content. The viewer id is always the server-derived id.
 */
async function isTargetVisible(
  targetType: string,
  targetId: string | null,
  viewerId: string | null,
): Promise<boolean> {
  if (targetType !== "team_update" && targetType !== "project_update") return true;
  if (!targetId) return true;
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.rpc("is_feed_post_visible", {
    p_source_type: targetType,
    p_source_id: targetId,
    p_user_id: viewerId,
  });
  return data === true;
}

export async function toggleLike(targetType: string, targetId: string) {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("update_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("update_likes")
      .delete()
      .eq("id", existing.id);

    if (error) return { error: error.message };

    const { count } = await supabaseAdmin
      .from("update_likes")
      .select("id", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    return { liked: false, count: count ?? 0 };
  }

  const { error } = await supabase.from("update_likes").insert({
    user_id: user.id,
    target_type: targetType,
    target_id: targetId,
  });

  if (error) return { error: error.message };

  const { count } = await supabaseAdmin
    .from("update_likes")
    .select("id", { count: "exact", head: true })
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  await notifyPostLiked(user.id, targetType, targetId);

  return { liked: true, count: count ?? 0 };
}

export async function toggleCommentLike(commentId: string) {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("comment_id", commentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("id", existing.id);

    if (error) return { error: error.message };

    const { count } = await supabaseAdmin
      .from("comment_likes")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", commentId);

    return { liked: false, count: count ?? 0 };
  }

  const { error } = await supabase.from("comment_likes").insert({
    comment_id: commentId,
    user_id: user.id,
  });

  if (error) return { error: error.message };

  const { count } = await supabaseAdmin
    .from("comment_likes")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  const { data: comment } = await supabaseAdmin
    .from("update_comments")
    .select("user_id, target_type, target_id")
    .eq("id", commentId)
    .single();

  if (comment && comment.user_id && comment.user_id !== user.id) {
    await insertNotification({
      userId: comment.user_id,
      type: "liked_your_comment",
      actorId: user.id,
      targetType: comment.target_type,
      targetId: comment.target_id,
      metadata: { comment_id: commentId, like_count: (count ?? 0) + 1 },
    });
  }

  return { liked: true, count: count ?? 0 };
}

/**
 * Records a single view for a feed post, using a per-browser session token so
 * rapid refreshes from the same session are de-duplicated in the database
 * (`record_post_view` RPC). Best-effort: never fails the surrounding render.
 */
export async function recordPostView(postId: string, sessionToken: string) {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();

  let viewerId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
  } catch {
    viewerId = null;
  }

  try {
    await supabaseAdmin.rpc("record_post_view", {
      p_post_id: postId,
      p_viewer_id: viewerId,
      p_session_token: sessionToken.trim() || null,
    });
  } catch {
    // best-effort view tracking
  }
}

export async function createComment(
  targetType: string,
  targetId: string,
  body: string,
  parentCommentId?: string | null,
) {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!body.trim()) return { error: "Comment cannot be empty" };

  // Enforce one level of nesting: replies always attach to a top-level comment.
  let resolvedParent: string | null = parentCommentId ?? null;
  if (resolvedParent) {
    const { data: parent } = await supabaseAdmin
      .from("update_comments")
      .select("parent_comment_id")
      .eq("id", resolvedParent)
      .single();
    if (parent?.parent_comment_id) {
      resolvedParent = parent.parent_comment_id;
    }
  }

  const { data: comment, error } = await supabase
    .from("update_comments")
    .insert({
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
      parent_comment_id: resolvedParent,
      body: body.trim(),
    })
    .select("id, created_at")
    .single();

  if (error) return { error: error.message };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", user.id)
    .single();

  const trimmed = body.trim();

  if (resolvedParent) {
    await notifyCommentReplied(user.id, resolvedParent, trimmed);
  } else {
    await notifyPostCommented(user.id, targetType, targetId, trimmed);
  }

  await notifyMentions(trimmed, user.id, targetType, targetId, trimmed);

  return {
    success: true,
    comment: {
      id: comment.id,
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
      parent_comment_id: resolvedParent,
      body: trimmed,
      created_at: comment.created_at,
      updated_at: comment.created_at,
      author: profile ?? {
        id: user.id,
        full_name: null,
        username: "unknown",
        avatar_url: null,
      },
      like_count: 0,
      user_has_liked: false,
      reply_count: 0,
      replies: [],
    } as CommentWithAuthor,
  };
}

export async function updateComment(commentId: string, body: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!body.trim()) return { error: "Comment cannot be empty" };

  const { error } = await supabase
    .from("update_comments")
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

const COMMENT_PAGE_SIZE = 5;

export interface GetCommentsResult {
  comments: CommentWithAuthor[];
  total: number;
}

const COMMENT_SELECT = `
  id,
  user_id,
  target_type,
  target_id,
  parent_comment_id,
  body,
  created_at,
  updated_at,
  author:user_id ( id, full_name, username, avatar_url )
`;

/**
 * Loads a page of top-level comments for a target, oldest first, along with
 * their replies. `total` is the number of top-level comments on the target, so
 * the client can keep showing "Load More" until every comment is fetched.
 */
export async function getCommentsAction(
  targetType: string,
  targetId: string,
  _userId: string | null,
  options?: { offset?: number; limit?: number },
): Promise<GetCommentsResult> {
  const supabaseAdmin = createAdminClient();
  const userId = await getSessionUserId();
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? COMMENT_PAGE_SIZE;

  const visible = await isTargetVisible(targetType, targetId || null, userId);
  if (!visible) return { comments: [], total: 0 };

  const { data: topLevelRows, count } = await supabaseAdmin
    .from("update_comments")
    .select(COMMENT_SELECT, { count: "exact" })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .is("parent_comment_id", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (!topLevelRows || topLevelRows.length === 0) {
    return { comments: [], total: count ?? 0 };
  }

  const { data: replyRows } = await supabaseAdmin
    .from("update_comments")
    .select(COMMENT_SELECT)
    .in(
      "parent_comment_id",
      topLevelRows.map((c) => c.id),
    )
    .order("created_at", { ascending: true });

  const comments = [
    ...(topLevelRows as unknown as CommentWithAuthor[]),
    ...((replyRows ?? []) as unknown as CommentWithAuthor[]),
  ];

  const allCommentIds = comments.map((c) => c.id);
  const [likeCounts, userLikes] = await Promise.all([
    getBatchCommentLikeCounts(allCommentIds),
    userId ? getUserCommentLikes(userId, allCommentIds) : Promise.resolve(new Set<string>()),
  ]);

  const decorated = comments.map((c) => ({
    ...c,
    like_count: likeCounts[c.id] ?? 0,
    user_has_liked: userLikes.has(c.id),
    reply_count: 0,
    replies: [],
  }));

  const topLevel: CommentWithAuthor[] = [];
  const byId = new Map<string, CommentWithAuthor>();
  for (const comment of decorated) {
    byId.set(comment.id, comment);
    if (!comment.parent_comment_id) {
      topLevel.push(comment);
    }
  }

  for (const comment of decorated) {
    if (comment.parent_comment_id) {
      const parent = byId.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(comment);
        parent.reply_count += 1;
      }
    }
  }

  return { comments: topLevel, total: count ?? 0 };
}

export async function toggleSavePost(postId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existing } = await supabase
    .from("saved_posts")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("saved_posts").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    return { saved: false };
  }

  const { error } = await supabase.from("saved_posts").insert({
    user_id: user.id,
    post_id: postId,
  });

  if (error) return { error: error.message };
  return { saved: true };
}

/**
 * Parses a feed post's stored media URLs into { bucket, objectPath } objects
 * safe to remove from storage. Only public URLs under the feed buckets whose
 * object path starts with the requesting user's id are returned — anything
 * else (foreign URLs, other users' objects, private markers) is ignored so we
 * never delete media that doesn't belong to this post's author.
 */
function resolveFeedMediaObjects(
  userId: string,
  values: (string | null)[] | null | undefined,
): { bucket: string; objectPath: string }[] {
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
  const resolved: { bucket: string; objectPath: string }[] = [];
  for (const value of values ?? []) {
    if (!value || !value.startsWith(storageBase)) continue;
    const rest = value.slice(storageBase.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) continue;
    const bucket = rest.slice(0, slash);
    const objectPath = rest.slice(slash + 1);
    if (bucket !== IMAGE_STORAGE_BUCKET && bucket !== VIDEO_STORAGE_BUCKET) continue;
    if (!objectPath.startsWith(`${userId}/`)) continue;
    resolved.push({ bucket, objectPath });
  }
  return resolved;
}

export async function deleteFeedPost(postId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: post } = await supabase
    .from("posts")
    .select("images, videos")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();

  const media = [
    ...resolveFeedMediaObjects(user.id, post?.images),
    ...resolveFeedMediaObjects(user.id, post?.videos),
  ];

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  // Best-effort: remove this post's media from storage after a successful delete.
  for (const { bucket, objectPath } of media) {
    await supabase.storage.from(bucket).remove([objectPath]).catch(() => {});
  }

  return { success: true };
}

export async function deleteComment(commentId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("update_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
