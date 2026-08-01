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

export async function getNotificationsAction(
  userId: string | null,
  limit = 20,
): Promise<AppNotification[]> {
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

export async function getUnreadNotificationCount(userId: string | null): Promise<number> {
  if (!userId) return 0;

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  return count ?? 0;
}

export async function markNotificationsRead(userId: string | null) {
  if (!userId) return;

  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) console.error("[notifications] mark read failed:", error.message);
}
