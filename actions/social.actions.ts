"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveMediaValue } from "@/lib/media";
import { insertNotification } from "@/lib/notifications";

/**
 * The authenticated user is always derived from the server session.
 * Client-provided ids are never trusted for authorization.
 */
async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function rpcError(error: { message?: string } | null, fallback: string): { error: string } {
  return { error: error?.message ?? fallback };
}

// ── Friend requests ────────────────────────────────────────────────────────

export async function sendFriendRequest(receiverId: string) {
  const senderId = await getSessionUserId();
  if (!senderId) return { error: "Not authenticated" };
  if (!receiverId) return { error: "Missing friend request target" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_friend_request", {
    p_receiver_id: receiverId,
  });

  if (error) return rpcError(error, "Couldn't send the friend request.");

  if (data && typeof data === "object" && "ok" in data) {
    await insertNotification({
      userId: receiverId,
      type: "friend_request_received",
      actorId: senderId,
      targetType: "friend_request",
      targetId: receiverId,
      metadata: { request_id: null },
    });
  }

  return { success: true, status: "request_sent" };
}

export async function cancelFriendRequest(receiverId: string) {
  const senderId = await getSessionUserId();
  if (!senderId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_friend_request", {
    p_receiver_id: receiverId,
  });

  if (error) return rpcError(error, "Couldn't cancel the friend request.");
  return { success: true };
}

export async function acceptFriendRequest(senderId: string) {
  const receiverId = await getSessionUserId();
  if (!receiverId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_friend_request", {
    p_sender_id: senderId,
    p_accept: true,
  });

  if (error) return rpcError(error, "Couldn't accept the friend request.");

  await insertNotification({
    userId: senderId,
    type: "friend_request_accepted",
    actorId: receiverId,
    targetType: "friend_request",
    targetId: senderId,
  });

  return { success: true, status: "friends" };
}

export async function declineFriendRequest(senderId: string) {
  const receiverId = await getSessionUserId();
  if (!receiverId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_friend_request", {
    p_sender_id: senderId,
    p_accept: false,
  });

  if (error) return rpcError(error, "Couldn't decline the friend request.");
  return { success: true, status: "declined" };
}

export async function unfriend(targetId: string) {
  const callerId = await getSessionUserId();
  if (!callerId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unfriend", { p_target_id: targetId });

  if (error) return rpcError(error, "Couldn't unfriend this user.");
  return { success: true, status: "none" };
}

// ── Follows ────────────────────────────────────────────────────────────────

export async function followUser(targetId: string) {
  const followerId = await getSessionUserId();
  if (!followerId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("follow_user", {
    p_target_id: targetId,
  });

  if (error) return rpcError(error, "Couldn't follow this user.");

  if (data && typeof data === "object" && "ok" in data) {
    await insertNotification({
      userId: targetId,
      type: "new_follower",
      actorId: followerId,
      targetType: "profile",
      targetId: followerId,
    });
  }

  return { success: true, following: true };
}

export async function unfollowUser(targetId: string) {
  const followerId = await getSessionUserId();
  if (!followerId) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("unfollow_user", {
    p_target_id: targetId,
  });

  if (error) return rpcError(error, "Couldn't unfollow this user.");
  return { success: true, following: false };
}

// ── Public profile data ────────────────────────────────────────────────────

export type PublicProfileData = {
  profile: {
    id: string;
    username: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    skills: string[];
    institution: string | null;
    created_at: string;
  } | null;
  relationship: {
    is_viewer: boolean;
    is_authenticated: boolean;
    friend_status: "none" | "request_sent" | "request_received" | "friends";
    is_following: boolean;
    is_followed_by: boolean;
    follower_count: number;
    following_count: number;
    friend_count: number;
  };
  privacy: {
    show_profile_publicly: boolean;
    show_activity: boolean;
  };
  activities: Array<{
    id: string;
    type: string;
    metadata: Record<string, unknown>;
    created_at: string;
    creator_name?: string | null;
  }>;
  posts: Array<{
    id: string;
    title: string;
    body: string | null;
    images: string[];
    videos: string[];
    created_at: string;
    source_type: string;
  }>;
};

export async function getPublicProfile(username: string): Promise<
  | { data: PublicProfileData }
  | { error: string; data?: undefined }
> {
  const supabase = await createClient();

  // Profiles/activities RLS is locked to the caller's own row (00004_rls_fix),
  // so cross-user reads go through the SECURITY DEFINER RPC (00078_public_profile),
  // the same pattern as search_users.
  const { data: result, error: profileError } = await supabase.rpc(
    "get_public_profile",
    { p_username: username },
  );

  if (profileError) {
    return { error: "Couldn't load this profile." };
  }

  const resultObj = (result ?? {}) as Record<string, unknown>;

  if (resultObj.hidden === true) {
    return {
      data: {
        profile: {
          id: String(resultObj.id ?? ""),
          username: String(resultObj.username ?? ""),
          full_name: String(resultObj.full_name ?? ""),
          bio: null,
          avatar_url: null,
          github_url: null,
          linkedin_url: null,
          skills: [],
          institution: null,
          created_at: new Date().toISOString(),
        },
        relationship: {
          is_viewer: false,
          is_authenticated: false,
          friend_status: "none",
          is_following: false,
          is_followed_by: false,
          follower_count: 0,
          following_count: 0,
          friend_count: 0,
        },
        privacy: { show_profile_publicly: false, show_activity: false },
        activities: [],
        posts: [],
      },
    };
  }

  if (!resultObj || !resultObj.id) {
    return { error: "User not found." };
  }

  const {
    data: relationship,
    error: relationshipError,
  } = await supabase.rpc("get_relationship_state", {
    p_target_id: resultObj.id,
  });

  if (relationshipError) {
    return { error: "Couldn't load relationship state." };
  }

  const rel = (relationship ?? {}) as Partial<PublicProfileData["relationship"]>;

  const isViewer = rel.is_viewer === true;
  const showActivity = resultObj.show_activity !== false || isViewer;

  let activities: PublicProfileData["activities"] = [];
  let posts: PublicProfileData["posts"] = [];

  const activitiesRows = Array.isArray(resultObj.activities)
    ? (resultObj.activities as Array<Record<string, unknown>>)
    : [];
  if (showActivity) {
    activities = activitiesRows.map((a) => ({
      id: String(a.id),
      type: String(a.type),
      metadata: (a.metadata ?? {}) as Record<string, unknown>,
      created_at: String(a.created_at),
      creator_name: typeof a.creator_name === "string" ? a.creator_name : null,
    }));
  }

  const { data: postRows } = await supabase
    .from("posts")
    .select("id, title, body, images, videos, created_at, source_type")
    .eq("author_id", resultObj.id)
    .eq("source_type", "user_post")
    .order("created_at", { ascending: false })
    .limit(20);

  posts = await Promise.all(
    (postRows ?? []).map(async (p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      images:
        ((await resolveMediaValue(p.images ?? [], undefined, supabase)) as string[]) ?? [],
      videos:
        ((await resolveMediaValue(p.videos ?? [], undefined, supabase)) as string[]) ?? [],
      created_at: p.created_at,
      source_type: p.source_type,
    })),
  );

  const avatar_url =
    ((await resolveMediaValue(
      typeof resultObj.avatar_url === "string" ? resultObj.avatar_url : null,
      undefined,
      supabase,
    )) as string | null) ?? null;

  return {
    data: {
      profile: {
        id: String(resultObj.id),
        username: String(resultObj.username ?? ""),
        full_name: String(resultObj.full_name ?? ""),
        bio: typeof resultObj.bio === "string" ? resultObj.bio : null,
        avatar_url,
        github_url: typeof resultObj.github_url === "string" ? resultObj.github_url : null,
        linkedin_url:
          typeof resultObj.linkedin_url === "string" ? resultObj.linkedin_url : null,
        skills: Array.isArray(resultObj.skills) ? (resultObj.skills as string[]) : [],
        institution: typeof resultObj.institution === "string" ? resultObj.institution : null,
        created_at: String(resultObj.created_at ?? new Date().toISOString()),
      },
      relationship: {
        is_viewer: isViewer,
        is_authenticated: rel.is_authenticated === true,
        friend_status: (rel.friend_status as PublicProfileData["relationship"]["friend_status"]) ?? "none",
        is_following: rel.is_following === true,
        is_followed_by: rel.is_followed_by === true,
        follower_count: Number(rel.follower_count ?? 0),
        following_count: Number(rel.following_count ?? 0),
        friend_count: Number(rel.friend_count ?? 0),
      },
      privacy: {
        show_profile_publicly: resultObj.show_profile_publicly !== false,
        show_activity: resultObj.show_activity !== false,
      },
      activities,
      posts,
    },
  };
}