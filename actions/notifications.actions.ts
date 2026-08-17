"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AppNotification {
  id: string;
  type: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string | null;
  actor: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * The authenticated user is always derived from the server session.
 * Client-provided ids are never trusted.
 */
async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getNotificationsAction(
  _userId: string | null,
  limit = 20,
): Promise<AppNotification[]> {
  const userId = await getSessionUserId();
  if (!userId) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("notifications")
    .select(`
      id,
      type,
      actor_id,
      target_type,
      target_id,
      metadata,
      read,
      created_at,
      actor:actor_id ( full_name, username, avatar_url )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as AppNotification[];
}

export async function getUnreadNotificationCount(_userId: string | null): Promise<number> {
  const userId = await getSessionUserId();
  if (!userId) return 0;

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  return count ?? 0;
}

export async function markNotificationsRead(_userId: string | null) {
  const userId = await getSessionUserId();
  if (!userId) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    // Mark all read failed; non-fatal
  }
}

/**
 * Marks a single notification as read. Ownership is enforced via the session
 * user id and the notifications RLS policy.
 */
export async function markNotificationRead(notificationId: string) {
  const userId = await getSessionUserId();
  if (!userId) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    // Mark single read failed; non-fatal
  }
}

/**
 * Notification types that point at a specific feed post. For these the most
 * relevant destination is the post itself (`/feed/post/[id]`), which exists as
 * a dedicated page, rather than the parent entity page.
 */
const FEED_POST_TYPES = new Set<string>([
  "liked_your_update",
  "commented_on_your_update",
  "replied_to_your_comment",
  "liked_your_comment",
  "mentioned_you",
  "shared_post_with_you",
]);

/**
 * Resolves the navigable route for a notification using its type, target_type
 * and target_id. Returns null when there is no resolvable destination so the
 * click never lands somewhere arbitrary.
 */
export async function resolveNotificationTarget(
  type: string | null,
  targetType: string | null,
  targetId: string | null,
): Promise<string | null> {
  if (!targetType || !targetId) return null;

  // Feed interactions deep-link to the specific post.
  if (type && FEED_POST_TYPES.has(type)) {
    return `/feed/post/${targetId}`;
  }

  // Posts on a user profile have no entity page; deep-link to the post.
  if (targetType === "user_post") {
    return `/feed/post/${targetId}`;
  }

  // Platform announcements live on the public board (no per-item route).
  if (targetType === "announcement" || targetType === "platform_announcement") {
    return "/announcements";
  }

  // Chat/message notifications deep-link to the conversation.
  if (targetType === "chat" || targetType === "conversation" || targetType === "message") {
    return `/chat/${targetId}`;
  }

  const supabase = createAdminClient();

  if (targetType === "project_update") {
    const { data } = await supabase
      .from("project_updates")
      .select("project:project_id ( slug )")
      .eq("id", targetId)
      .maybeSingle();
    const project = data as unknown as { project: { slug: string } | null } | null;
    return project?.project?.slug ? `/projects/${project.project.slug}` : null;
  }

  if (targetType === "team_update") {
    const { data } = await supabase
      .from("team_updates")
      .select("team:team_id ( slug )")
      .eq("id", targetId)
      .maybeSingle();
    const team = data as unknown as { team: { slug: string } | null } | null;
    return team?.team?.slug ? `/teams/${team.team.slug}` : null;
  }

  if (targetType === "branch_announcement") {
    const { data } = await supabase
      .from("branch_announcements")
      .select("branch:branch_id ( slug )")
      .eq("id", targetId)
      .maybeSingle();
    const branch = data as unknown as { branch: { slug: string } | null } | null;
    return branch?.branch?.slug ? `/branches/${branch.branch.slug}` : null;
  }

  return null;
}
