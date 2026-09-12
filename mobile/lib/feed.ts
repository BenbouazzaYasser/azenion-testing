import { supabase } from "./supabase";
import { friendlyError } from "./errors";

export interface FeedComment {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
}

async function callerId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

/** Like or unlike a feed target. Duplicate likes are idempotent. */
export async function setLiked(targetType: string, targetId: string, liked: boolean): Promise<void> {
  const userId = await callerId();
  if (liked) {
    const { error } = await supabase
      .from("update_likes")
      .insert({ target_type: targetType, target_id: targetId, user_id: userId });
    // Unique violation = already liked; treat as success.
    if (error && (error as { code?: string }).code !== "23505") throw new Error(friendlyError(error.message));
    return;
  }
  const { error } = await supabase
    .from("update_likes")
    .delete()
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("user_id", userId);
  if (error) throw new Error(friendlyError(error.message));
}

/** Save or unsave a post. Duplicate saves are idempotent. */
export async function setSaved(postId: string, saved: boolean): Promise<void> {
  const userId = await callerId();
  if (saved) {
    const { error } = await supabase.from("saved_posts").insert({ user_id: userId, post_id: postId });
    if (error && (error as { code?: string }).code !== "23505") throw new Error(friendlyError(error.message));
    return;
  }
  const { error } = await supabase.from("saved_posts").delete().eq("user_id", userId).eq("post_id", postId);
  if (error) throw new Error(friendlyError(error.message));
}

export async function getComments(targetType: string, targetId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from("update_comments")
    .select("id, user_id, body, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []) as FeedComment[];
}

export async function addComment(targetType: string, targetId: string, body: string): Promise<FeedComment> {
  const userId = await callerId();
  const text = body.trim();
  if (!text) throw new Error("Comment cannot be empty.");
  const { data, error } = await supabase
    .from("update_comments")
    .insert({ target_type: targetType, target_id: targetId, user_id: userId, body: text.slice(0, 2000) })
    .select("id, user_id, body, created_at")
    .single();
  if (error || !data) throw new Error(friendlyError(error?.message ?? "Unable to post comment."));
  return data as FeedComment;
}
