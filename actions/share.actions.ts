"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertNotification } from "@/lib/notifications";

export interface ShareRecipient {
  id: string;
  username: string;
  full_name: string | null;
  institution: string | null;
  avatar_url: string | null;
}

const MAX_SHARE_MESSAGE_LENGTH = 500;

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
 * Member lookup for the share picker. Reuses the `search_users` SECURITY
 * DEFINER RPC (00076_global_user_search) so results honor each member's
 * `search_visibility` privacy setting and both directions of `user_blocks` —
 * exactly the same rules the global search bar applies. The caller id is the
 * server-derived session id; a caller can never search as someone else.
 */
export async function searchShareRecipients(
  query: string,
  limit: number = 8,
): Promise<ShareRecipient[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const userId = await getSessionUserId();
  if (!userId) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_users", {
    p_query: trimmed,
    p_limit: Math.min(Math.max(limit, 1), 20),
  });

  if (error) return [];

  return ((data ?? []) as Array<{
    id: string;
    username: string;
    full_name: string | null;
    institution: string | null;
    avatar_url: string | null;
  }>)
    .filter((row) => row.id !== userId)
    .map((row) => ({
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      institution: row.institution,
      avatar_url: row.avatar_url,
    }));
}

/**
 * Shares `postId` with `recipientId`, with an optional short message.
 *
 * Authorization lives in the `share_post` RPC (00079_post_shares): the
 * recipient must exist, the post must exist and be visible to the sharer,
 * self-shares are rejected, and blocks are enforced in both directions. The
 * server action then delivers a `shared_post_with_you` notification through
 * `insertNotification`, which applies the recipient's notification
 * preferences and de-duplicates unread (type, actor, target) notifications so
 * repeated shares never spam an inbox.
 */
export async function sharePost(
  postId: string,
  recipientId: string,
  message?: string | null,
): Promise<{ success: true } | { error: string }> {
  const sharerId = await getSessionUserId();
  if (!sharerId) return { error: "Not authenticated" };

  if (!postId) return { error: "Post ID is required." };
  if (!recipientId) return { error: "Choose a member to share with." };

  const supabase = createClient();
  const { data: shareId, error } = await supabase.rpc("share_post", {
    p_post_id: postId,
    p_recipient_id: recipientId,
    p_message: message?.trim() || null,
  });

  if (error) return { error: error.message };

  // Notification metadata deep-links the recipient to the post permalink. The
  // share is already committed; if the post vanished between validation and
  // here we still deliver the notification (it will land on a not-found page).
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("source_type")
    .eq("id", postId)
    .maybeSingle();

  await insertNotification({
    userId: recipientId,
    type: "shared_post_with_you",
    actorId: sharerId,
    targetType: post?.source_type ?? null,
    targetId: postId,
    metadata: {
      share_id: shareId ?? null,
      message: message?.trim() ? message.trim().slice(0, MAX_SHARE_MESSAGE_LENGTH) : null,
    },
  });

  return { success: true };
}