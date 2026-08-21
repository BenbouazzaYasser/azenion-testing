import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CommentAuthor {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

export interface CommentWithAuthor {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string | null;
  updated_at: string | null;
  author: CommentAuthor;
  like_count: number;
  user_has_liked: boolean;
  reply_count: number;
  replies: CommentWithAuthor[];
}

export interface InteractionData {
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
}

export async function getBatchLikeCounts(
  targetType: string,
  targetIds: string[],
): Promise<Record<string, number>> {
  if (targetIds.length === 0) return {};

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("update_likes")
    .select("target_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  if (!data) return {};

  const counts: Record<string, number> = {};
  for (const id of targetIds) counts[id] = 0;
  for (const row of data) {
    counts[row.target_id] = (counts[row.target_id] ?? 0) + 1;
  }
  return counts;
}

export async function getBatchCommentCounts(
  targetType: string,
  targetIds: string[],
): Promise<Record<string, number>> {
  if (targetIds.length === 0) return {};

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("update_comments")
    .select("target_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  if (!data) return {};

  const counts: Record<string, number> = {};
  for (const id of targetIds) counts[id] = 0;
  for (const row of data) {
    counts[row.target_id] = (counts[row.target_id] ?? 0) + 1;
  }
  return counts;
}

export async function getUserLikes(
  userId: string,
  targetType: string,
  targetIds: string[],
): Promise<Set<string>> {
  if (!userId || targetIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("update_likes")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  return new Set(data?.map((r) => r.target_id) ?? []);
}

export async function getBatchCommentLikeCounts(
  commentIds: string[],
): Promise<Record<string, number>> {
  if (commentIds.length === 0) return {};

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", commentIds);

  if (!data) return {};

  const counts: Record<string, number> = {};
  for (const id of commentIds) counts[id] = 0;
  for (const row of data) {
    counts[row.comment_id] = (counts[row.comment_id] ?? 0) + 1;
  }
  return counts;
}

export async function getUserCommentLikes(
  userId: string,
  commentIds: string[],
): Promise<Set<string>> {
  if (!userId || commentIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);

  return new Set(data?.map((r) => r.comment_id) ?? []);
}

/**
 * Batch-fetches which of the given posts the current user has saved.
 * Keys are the raw post ids.
 */
export async function getSavedPostIds(userId: string | null, postIds: string[]): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  return new Set(data?.map((r) => r.post_id) ?? []);
}

/**
 * Batch-fetches up to `limit` liker display names per post.
 * Keys are `${target_type}-${target_id}`.
 */
export async function getBatchLikerNames(
  targets: { target_type: string; target_id: string }[],
  limit = 2,
  preFetchedLikes?: { target_type: string; target_id: string; user_id: string }[],
): Promise<Record<string, string[]>> {
  if (targets.length === 0) return {};

  const keys = targets.map((t) => `${t.target_type}-${t.target_id}`);
  const allIds = [...new Set(targets.map((t) => t.target_id))];

  let likes = preFetchedLikes;
  if (!likes || likes.length === 0) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("update_likes")
      .select("target_type, target_id, user_id, created_at")
      .in("target_id", allIds);
    likes = data ?? [];
  }
  if (likes.length === 0) return {};

  const userLikerMap = new Map<string, string[]>();
  for (const like of likes) {
    const key = `${like.target_type}-${like.target_id}`;
    const list = userLikerMap.get(key) ?? [];
    if (list.length < limit) list.push(like.user_id);
    userLikerMap.set(key, list);
  }

  const likerIds = [...new Set(likes.map((l) => l.user_id))];
  const supabase = createAdminClient();
  const { data: profiles } = likerIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", likerIds)
    : { data: [] as { id: string; full_name: string | null; username: string }[] };

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameMap.set(p.id, p.full_name ?? p.username ?? "Someone");
  }

  const result: Record<string, string[]> = {};
  for (const key of keys) {
    result[key] = (userLikerMap.get(key) ?? []).map((uid) => nameMap.get(uid) ?? "Someone");
  }
  return result;
}

export async function getInteractionData(
  userId: string | null,
  targetType: string,
  targetIds: string[],
): Promise<Record<string, InteractionData>> {
  if (targetIds.length === 0) return {};

  const [likeCounts, commentCounts, userLikes] = await Promise.all([
    getBatchLikeCounts(targetType, targetIds),
    getBatchCommentCounts(targetType, targetIds),
    userId ? getUserLikes(userId, targetType, targetIds) : Promise.resolve(new Set<string>()),
  ]);

  const result: Record<string, InteractionData> = {};
  for (const id of targetIds) {
    result[id] = {
      like_count: likeCounts[id] ?? 0,
      comment_count: commentCounts[id] ?? 0,
      user_has_liked: userLikes.has(id),
    };
  }
  return result;
}
