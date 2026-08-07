import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NotificationInput {
  userId: string;
  type: string;
  actorId: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Maps a notification `type` to a user_settings.notifications preference key.
 * When the recipient has disabled that preference, the notification is skipped
 * at the single insertion choke point so delivery gates for all sources.
 */
function notificationPreferenceKey(type: string): string {
  switch (type) {
    case "team_update":
    case "created_team_update":
    case "joined_team":
    case "team_roll_change":
      return "team_updates";
    case "project_update":
      return "project_updates";
    case "liked_your_update":
    case "commented_on_your_update":
      return "feed_interactions";
    case "replied_to_your_comment":
    case "liked_your_comment":
      return "replies";
    case "mentioned_you":
      return "mentions";
    case "branch_announcement":
      return "branch_announcements";
    case "academy_session":
      return "academy_sessions";
    default:
      return "feed_interactions";
  }
}

/**
 * Returns whether the recipient should receive a notification of `type` based
 * on their stored preferences. Uses an admin client to read settings
 * regardless of who is authenticated. Unknown rows default to enabled.
 */
async function recipientEnabled(userId: string, type: string): Promise<boolean> {
  const prefKey = notificationPreferenceKey(type);
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("notifications")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return true;
  const bag = (data.notifications ?? {}) as Record<string, unknown>;
  if (typeof bag[prefKey] === "boolean") return bag[prefKey] as boolean;
  return true;
}

/**
 * Inserts a notification for `userId`, de-duplicated: if an unread
 * notification of the same (type, actor, target) already exists we skip so
 * rapid like/unlike/like cycles never spam the recipient.
 */
export async function insertNotification(input: NotificationInput) {
  const supabase = createClient();

  if (!(await recipientEnabled(input.userId, input.type))) {
    return { skipped: true };
  }

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", input.userId)
    .eq("type", input.type)
    .eq("actor_id", input.actorId)
    .eq("target_type", input.targetType ?? null)
    .eq("target_id", input.targetId ?? null)
    .eq("read", false)
    .limit(1);

  if (existing && existing.length > 0) {
    return { skipped: true };
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    actor_id: input.actorId,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[notifications] insert failed:", error.message);
    return { error };
  }
  return { inserted: true };
}

const TARGET_TABLES: Record<string, string> = {
  project_update: "project_updates",
  team_update: "team_updates",
  branch_announcement: "branch_announcements",
};

/**
 * Notifies the author of a post that `actorId` liked it.
 */
export async function notifyPostLiked(actorId: string, targetType: string, targetId: string) {
  const supabase = createAdminClient();
  const table = TARGET_TABLES[targetType];
  if (!table) return;

  const { data: target } = await supabase
    .from(table)
    .select("author_id")
    .eq("id", targetId)
    .single();

  if (target && target.author_id && target.author_id !== actorId) {
    await insertNotification({
      userId: target.author_id,
      type: "liked_your_update",
      actorId,
      targetType,
      targetId,
    });
  }
}

/**
 * Notifies the author of a post that `actorId` commented on it.
 */
export async function notifyPostCommented(
  actorId: string,
  targetType: string,
  targetId: string,
  preview: string,
) {
  const supabase = createAdminClient();
  const table = TARGET_TABLES[targetType];
  if (!table) return;

  const { data: target } = await supabase
    .from(table)
    .select("author_id")
    .eq("id", targetId)
    .single();

  if (target && target.author_id && target.author_id !== actorId) {
    await insertNotification({
      userId: target.author_id,
      type: "commented_on_your_update",
      actorId,
      targetType,
      targetId,
      metadata: { comment_preview: preview },
    });
  }
}

/**
 * Notifies the author of a comment that `actorId` replied to it (1 level).
 */
export async function notifyCommentReplied(
  actorId: string,
  parentCommentId: string,
  preview: string,
) {
  const supabase = createAdminClient();

  const { data: parent } = await supabase
    .from("update_comments")
    .select("user_id, target_type, target_id")
    .eq("id", parentCommentId)
    .single();

  if (parent && parent.user_id && parent.user_id !== actorId) {
    await insertNotification({
      userId: parent.user_id,
      type: "replied_to_your_comment",
      actorId,
      targetType: parent.target_type,
      targetId: parent.target_id,
      metadata: { parent_comment_id: parentCommentId, comment_preview: preview },
    });
  }
}

const MENTION_RE = /@([a-zA-Z0-9._-]+)/g;

/**
 * Future-ready mention support: extracts @usernames from a body of text.
 */
export function extractMentions(text: string): string[] {
  const seen = new Set<string>();
  const matches = text.matchAll(MENTION_RE);
  for (const match of matches) {
    seen.add(match[1]!.toLowerCase());
  }
  return [...seen];
}

/**
 * Notifies every mentioned user (excluding the actor). Future-ready: the
 * infrastructure exists, but it only fires when a body actually contains
 * @mentions.
 */
export async function notifyMentions(
  text: string,
  actorId: string,
  targetType: string,
  targetId: string,
  preview?: string,
) {
  const usernames = extractMentions(text);
  if (usernames.length === 0) return;

  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", usernames);

  const snippet = (preview ?? text).slice(0, 100);

  for (const profile of profiles ?? []) {
    if (profile.id === actorId) continue;
    await insertNotification({
      userId: profile.id,
      type: "mentioned_you",
      actorId,
      targetType,
      targetId,
      metadata: { username: profile.username, preview: snippet },
    });
  }
}
