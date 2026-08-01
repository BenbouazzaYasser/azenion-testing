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

const TARGET_TABLES: Record<string, string> = {
  project_update: "project_updates",
  team_update: "team_updates",
  branch_announcement: "branch_announcements",
};

function getTargetTable(targetType: string) {
  return TARGET_TABLES[targetType] ?? null;
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

export async function getCommentsAction(
  targetType: string,
  targetId: string,
  userId: string | null,
): Promise<CommentWithAuthor[]> {
  const supabaseAdmin = createAdminClient();

  const { data: raw } = await supabaseAdmin
    .from("update_comments")
    .select(`
      id,
      user_id,
      target_type,
      target_id,
      parent_comment_id,
      body,
      created_at,
      updated_at,
      author:user_id ( id, full_name, username, avatar_url )
    `)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  const comments = (raw ?? []) as unknown as CommentWithAuthor[];
  if (comments.length === 0) return [];

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

  return topLevel;
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

export async function deleteFeedPost(postId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
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
