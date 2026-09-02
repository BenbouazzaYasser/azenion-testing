"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMediaValue } from "@/lib/media";
import {
  getBatchLikerNames,
  getSavedPostIds,
} from "@/data/interactions";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  IMAGE_STORAGE_BUCKET,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  VIDEO_STORAGE_BUCKET,
  type FeedMediaKind,
} from "@/lib/validations/media.schema";
import { notifyMentions } from "@/lib/notifications";
import { TRENDING_WINDOW_DAYS } from "@/lib/trending";

export type FeedSourceType =
  | "project_update"
  | "team_update"
  | "branch_announcement"
  | "branch_highlight"
  | "branch_event"
  | "user_post";

export interface FeedItem {
  id: string;
  source_type: FeedSourceType;
  source_id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  author_username: string | null;
  entity_name: string | null;
  entity_slug: string | null;
  entity_logo_url: string | null;
  entity_type: "PROJECT" | "TEAM" | "BRANCH" | "POST" | null;
  branch_name: string | null;
  branch_slug: string | null;
  branch_logo_url: string | null;
  title: string;
  body: string | null;
  images: string[];
  videos: string[];
  link_url?: string | null;
  is_pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
  liked_by_names: string[];
  saved_by_user: boolean;
  event_schedule?: string | null;
  event_location?: string | null;
  event_starts_at?: string | null;
  event_ends_at?: string | null;
  event_registration_url?: string | null;
  event_visibility?: string | null;
}

export type FeedItemWithAuthor = FeedItem;

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

const INTERACTIONLESS_TYPES = new Set<FeedSourceType>([
  "branch_highlight",
  "branch_event",
]);

const BRANCH_AUTHORED_TYPES = new Set<FeedSourceType>([
  "branch_announcement",
  "branch_highlight",
  "branch_event",
]);

interface PostRow {
  id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  images: string[] | null;
  videos: string[] | null;
  source_type: FeedSourceType;
  source_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface BranchRef {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

async function fetchBranches(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, BranchRef>> {
  const map = new Map<string, BranchRef>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("branches").select("id, name, slug, logo_url").in("id", ids);
  for (const b of data ?? []) map.set(b.id, b as BranchRef);
  return map;
}

/**
 * Resolves entity (project/team/branch) + branch context + author profiles +
 * interaction data for a page of posts. Every lookup is batched — no N+1.
 * `pinnedPostIds` carries the pin state for THIS feed scope, so `is_pinned`
 * reflects whether the post is pinned in the feed being rendered.
 */
async function enrichPosts(
  supabase: ReturnType<typeof createAdminClient>,
  posts: PostRow[],
  userId: string | null,
  pinnedPostIds: Set<string>,
): Promise<FeedItem[]> {
  if (posts.length === 0) return [];

  const grouped = new Map<FeedSourceType, PostRow[]>();
  for (const post of posts) {
    const list = grouped.get(post.source_type) ?? [];
    list.push(post);
    grouped.set(post.source_type, list);
  }

  // ── Entity + branch context ────────────────────────────────────────────

  const projectEntity = new Map<string, { name: string; slug: string; logo_url: string | null }>();
  const teamEntity = new Map<string, { name: string; slug: string; logo_url: string | null }>();
  const branchBySource = new Map<string, BranchRef>();

  if (grouped.has("project_update")) {
    const ids = grouped.get("project_update")!.map((p) => p.source_id!).filter(Boolean);
    if (ids.length > 0) {
      const { data: sourceRows } = await supabase
        .from("project_updates")
        .select("id, project_id")
        .in("id", ids);
      const projectIds = [...new Set((sourceRows ?? []).map((r) => r.project_id))];
      const { data: projects } = projectIds.length > 0
        ? await supabase.from("projects").select("id, name, slug, logo_url, team_id").in("id", projectIds)
        : { data: [] as { id: string; name: string; slug: string; logo_url: string | null; team_id: string | null }[] };
      const projectById = new Map((projects ?? []).map((p) => [p.id, p]));
      for (const p of projects ?? []) projectEntity.set(p.id, { name: p.name, slug: p.slug, logo_url: p.logo_url });
      const teamIds = [...new Set((projects ?? []).map((p) => p.team_id).filter(Boolean))];
      const { data: teams } = teamIds.length > 0
        ? await supabase.from("teams").select("id, branch_id").in("id", teamIds)
        : { data: [] as { id: string; branch_id: string | null }[] };
      const branchIds = [...new Set((teams ?? []).map((t) => t.branch_id).filter(Boolean))];
      const branchMap = await fetchBranches(supabase, branchIds);
      const teamBranchMap = new Map((teams ?? []).map((t) => [t.id, t.branch_id]));
      for (const sourceRow of sourceRows ?? []) {
        const project = projectById.get(sourceRow.project_id);
        const branchId = project?.team_id ? teamBranchMap.get(project.team_id) : null;
        const branch = branchId ? branchMap.get(branchId) : null;
        if (branch) branchBySource.set(sourceRow.id, branch);
      }
    }
  }

  if (grouped.has("team_update")) {
    const ids = grouped.get("team_update")!.map((p) => p.source_id!).filter(Boolean);
    if (ids.length > 0) {
      const { data: sourceRows } = await supabase
        .from("team_updates")
        .select("id, team_id")
        .in("id", ids);
      const teamIds = [...new Set((sourceRows ?? []).map((r) => r.team_id))];
      const { data: teams } = teamIds.length > 0
        ? await supabase.from("teams").select("id, name, slug, logo_url, branch_id").in("id", teamIds)
        : { data: [] as { id: string; name: string; slug: string; logo_url: string | null; branch_id: string | null }[] };
      for (const t of teams ?? []) teamEntity.set(t.id, { name: t.name, slug: t.slug, logo_url: t.logo_url });
      const branchIds = [...new Set((teams ?? []).map((t) => t.branch_id).filter(Boolean))];
      const branchMap = await fetchBranches(supabase, branchIds);
      const teamBranchMap = new Map((teams ?? []).map((t) => [t.id, t.branch_id]));
      for (const sourceRow of sourceRows ?? []) {
        const branchId = teamBranchMap.get(sourceRow.team_id);
        const branch = branchId ? branchMap.get(branchId) : null;
        if (branch) branchBySource.set(sourceRow.id, branch);
      }
    }
  }

  const branchTypes: FeedSourceType[] = ["branch_announcement", "branch_highlight", "branch_event"];
  for (const type of branchTypes) {
    if (!grouped.has(type)) continue;
    const ids = grouped.get(type)!.map((p) => p.source_id!).filter(Boolean);
    if (ids.length === 0) continue;
    const table = type === "branch_announcement"
      ? "branch_announcements"
      : type === "branch_highlight"
        ? "branch_highlights"
        : "branch_events";
    const { data: sourceRows } = await supabase
      .from(table)
      .select("id, branch_id")
      .in("id", ids);
    const branchIds = [...new Set((sourceRows ?? []).map((r) => r.branch_id))];
    const branchMap = await fetchBranches(supabase, branchIds);
    for (const sourceRow of sourceRows ?? []) {
      const branch = sourceRow.branch_id ? branchMap.get(sourceRow.branch_id) : null;
      if (branch) branchBySource.set(sourceRow.id, branch);
    }
  }

  // ── Event details ──────────────────────────────────────────────────────

  const eventDetails = new Map<string, Partial<FeedItem>>();
  if (grouped.has("branch_event")) {
    const ids = grouped.get("branch_event")!.map((p) => p.source_id!).filter(Boolean);
    if (ids.length > 0) {
      const { data: events } = await supabase
        .from("branch_events")
        .select("id, location, starts_at, ends_at, schedule, registration_url, visibility")
        .in("id", ids);
      for (const e of events ?? []) {
        eventDetails.set(e.id, {
          event_location: e.location,
          event_starts_at: e.starts_at,
          event_ends_at: e.ends_at,
          event_schedule: e.schedule,
          event_registration_url: e.registration_url,
          event_visibility: e.visibility,
        });
      }
    }
  }

  // ── Highlight links ────────────────────────────────────────────────────

  const highlightLinks = new Map<string, string | null>();
  if (grouped.has("branch_highlight")) {
    const ids = grouped.get("branch_highlight")!.map((p) => p.source_id!).filter(Boolean);
    if (ids.length > 0) {
      const { data: highlights } = await supabase
        .from("branch_highlights")
        .select("id, link_url")
        .in("id", ids);
      for (const h of highlights ?? []) highlightLinks.set(h.id, h.link_url);
    }
  }

  // ── Author profiles ────────────────────────────────────────────────────

  const authorIds = [
    ...new Set(posts.map((p) => p.author_id).filter((id): id is string => Boolean(id))),
  ];
  const profileMap = new Map<string, { full_name: string | null; username: string | null; avatar_url: string | null }>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", authorIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, username: p.username, avatar_url: p.avatar_url });
    }
  }

  // ── Interaction data (batched) ─────────────────────────────────────────

  const interactive = posts.filter((p) => !INTERACTIONLESS_TYPES.has(p.source_type));
  const interactiveIds = [...new Set(interactive.map((p) => p.source_id!).filter(Boolean))];

  const likeCounts: Record<string, number> = {};
  const commentCounts: Record<string, number> = {};
  const userLiked = new Set<string>();
  const keyOf = (p: { source_type: string; source_id: string | null }) => `${p.source_type}-${p.source_id}`;
  for (const p of interactive) likeCounts[keyOf(p)] = 0;
  for (const p of interactive) commentCounts[keyOf(p)] = 0;

  const [likesRes, commentsRes] =
    interactiveIds.length > 0
      ? await Promise.all([
          supabase.from("update_likes").select("target_type, target_id, user_id").in("target_id", interactiveIds),
          supabase.from("update_comments").select("target_type, target_id").in("target_id", interactiveIds),
        ])
      : [{ data: [] as { target_type: string; target_id: string; user_id: string }[] }, { data: [] as { target_type: string; target_id: string }[] }];
  for (const like of likesRes.data ?? []) {
    const key = `${like.target_type}-${like.target_id}`;
    if (likeCounts[key] !== undefined) {
      likeCounts[key]++;
      if (userId && like.user_id === userId) userLiked.add(key);
    }
  }
  for (const comment of commentsRes.data ?? []) {
    const key = `${comment.target_type}-${comment.target_id}`;
    if (commentCounts[key] !== undefined) commentCounts[key]++;
  }

  const likerNames = await getBatchLikerNames(
    interactive.map((p) => ({ target_type: p.source_type, target_id: p.source_id! })),
    2,
    likesRes.data ?? undefined,
  );

  const savedSet = await getSavedPostIds(
    userId,
    posts.map((p) => p.id),
  );

  // ── Assemble ───────────────────────────────────────────────────────────

  return await Promise.all(
    posts.map(async (post) => {
    const branch = post.source_id ? branchBySource.get(post.source_id) : null;
    const profile = post.author_id ? profileMap.get(post.author_id) : null;
    const isBranchAuthored = BRANCH_AUTHORED_TYPES.has(post.source_type);
    const isUserPost = post.source_type === "user_post";

    let entityName: string | null = null;
    let entitySlug: string | null = null;
    let entityLogo: string | null = null;
    let entityType: FeedItem["entity_type"] = null;

    if (post.source_type === "project_update" && post.source_id) {
      const project = projectEntity.get(
        grouped.get("project_update")!.find((p) => p.id === post.id)?.source_id ?? "",
      );
      if (project) {
        entityName = project.name;
        entitySlug = project.slug;
        entityLogo = project.logo_url;
        entityType = "PROJECT";
      }
    } else if (post.source_type === "team_update" && post.source_id) {
      const team = teamEntity.get(
        grouped.get("team_update")!.find((p) => p.id === post.id)?.source_id ?? "",
      );
      if (team) {
        entityName = team.name;
        entitySlug = team.slug;
        entityLogo = team.logo_url;
        entityType = "TEAM";
      }
    } else if (isBranchAuthored && branch) {
      entityName = branch.name;
      entitySlug = branch.slug;
      entityLogo = branch.logo_url;
      entityType = "BRANCH";
    } else if (isUserPost) {
      entityType = "POST";
    }

    const key = keyOf(post);

    const [resolvedEntityLogo, resolvedBranchLogo, resolvedImages, resolvedVideos] = await Promise.all([
      resolveMediaValue(entityLogo),
      resolveMediaValue(branch?.logo_url ?? null),
      resolveMediaValue(Array.isArray(post.images) ? post.images.filter(Boolean) : []),
      resolveMediaValue(Array.isArray(post.videos) ? post.videos.filter(Boolean) : []),
    ]);

    return {
      id: post.id,
      source_type: post.source_type,
      source_id: post.source_id,
      author_id: post.author_id,
      author_name: isUserPost
        ? profile?.full_name ?? profile?.username ?? "Unknown"
        : null,
      author_avatar: isUserPost ? profile?.avatar_url ?? null : null,
      author_username: isUserPost ? profile?.username ?? null : null,
      entity_name: entityName,
      entity_slug: entitySlug,
      entity_logo_url: (resolvedEntityLogo ?? entityLogo) as string | null,
      entity_type: entityType,
      branch_name: branch?.name ?? null,
      branch_slug: branch?.slug ?? null,
      branch_logo_url: resolvedBranchLogo as string | null,
      title: post.title,
      body: post.body,
      images: (resolvedImages as string[] | undefined) ?? [],
      videos: (resolvedVideos as string[] | undefined ?? []),
      link_url: post.source_type === "branch_highlight" ? highlightLinks.get(post.source_id ?? "") ?? null : null,
      is_pinned: pinnedPostIds.has(post.id),
      created_at: post.created_at,
      updated_at: post.updated_at,
      like_count: likeCounts[key] ?? 0,
      comment_count: commentCounts[key] ?? 0,
      user_has_liked: userLiked.has(key),
      liked_by_names: likerNames[key] ?? [],
      saved_by_user: savedSet.has(post.id),
      ...(eventDetails.get(post.source_id ?? "") ?? {}),
    };
    }),
  );
}

export async function getFeedItems(
  filter?: string,
  page: number = 1,
  pageSize: number = 20,
  _userId?: string | null,
): Promise<{ items: FeedItem[]; total: number }> {
  const supabase = createAdminClient();

  let query = supabase.from("posts").select("id", { count: "exact", head: true });
  if (filter && filter !== "all") query = query.eq("source_type", filter);

  const [userId, { count: total }] = await Promise.all([
    _userId === null ? Promise.resolve(null) : getSessionUserId(),
    query,
  ]);

  const [{ data: pinRows }, { data: posts }] = await Promise.all([
    supabase.from("feed_pins").select("post_id").eq("scope", "global"),
    supabase.rpc("get_global_feed_posts", {
      p_filter: filter ?? null,
      p_page: page,
      p_page_size: pageSize,
      p_viewer: userId,
    }),
  ]);

  const pinnedIds = new Set((pinRows ?? []).map((r) => r.post_id));
  const items = await enrichPosts(supabase, (posts ?? []) as PostRow[], userId, pinnedIds);
  return { items, total: total ?? 0 };
}

/**
 * Trending Feed: the highest-scoring posts over the rolling window, ranked by
 * the `get_trending_feed` RPC (40% views / 35% likes / 25% comments + replies).
 * Returns items already ordered by score. If the RPC is unavailable this
 * degrades to an empty list so the caller can fall back to the latest feed.
 */
export async function getTrendingFeedItems(
  limit: number = 12,
  _userId?: string | null,
): Promise<{ items: FeedItem[]; total: number }> {
  const supabase = createAdminClient();
  const userId = _userId === null ? null : await getSessionUserId();

  let posts: PostRow[] = [];
  try {
    const { data, error } = await supabase.rpc("get_trending_feed", {
      p_window_days: TRENDING_WINDOW_DAYS,
      p_limit: limit,
      p_viewer: userId,
    });
    if (error) throw new Error(error.message);
    posts = (data ?? []) as PostRow[];
  } catch {
    return { items: [], total: 0 };
  }

  const items = await enrichPosts(supabase, posts, userId, new Set<string>());
  return { items, total: items.length };
}

export async function getFeedItemById(
  postId: string,
  _userId?: string | null,
): Promise<FeedItem | null> {
  const supabase = createAdminClient();
  const userId = _userId === null ? null : await getSessionUserId();

  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, title, body, images, videos, source_type, source_id, created_at, updated_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return null;

  const { data: visible } = await supabase.rpc("is_feed_post_visible", {
    p_source_type: post.source_type,
    p_source_id: post.source_id,
    p_user_id: userId,
  });

  if (visible !== true) return null;

  const items = await enrichPosts(supabase, [post as PostRow], userId, new Set<string>());
  return items[0] ?? null;
}

/**
 * Saved posts: the posts the current user has bookmarked, newest save first.
 * Each post is re-checked for visibility before being returned so saved posts
 * the user can no longer see are filtered out.
 */
export async function getSavedFeedItems(
  _userId?: string | null,
): Promise<{ items: FeedItem[]; total: number }> {
  const supabase = createAdminClient();
  const userId = _userId === null ? null : await getSessionUserId();
  if (!userId) return { items: [], total: 0 };

  const { data: saved } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const postIds = (saved ?? []).map((r) => r.post_id);
  if (postIds.length === 0) return { items: [], total: 0 };

  const { data: posts } = await supabase
    .from("posts")
    .select("id, author_id, title, body, images, videos, source_type, source_id, created_at, updated_at")
    .in("id", postIds);

  const postById = new Map((posts ?? []).map((p) => [p.id, p]));
  const ordered = postIds
    .map((id) => postById.get(id))
    .filter((p): p is PostRow => Boolean(p));

  const items = await enrichPosts(supabase, ordered, userId, new Set<string>());

  const visibleItems: FeedItem[] = [];
  for (const item of items) {
    const { data: visible } = await supabase.rpc("is_feed_post_visible", {
      p_source_type: item.source_type,
      p_source_id: item.source_id,
      p_user_id: userId,
    });
    if (visible === true) visibleItems.push(item);
  }

  return { items: visibleItems, total: visibleItems.length };
}

/**
 * Branch-scoped feed: announcements + highlights + events from the branch plus
 * team updates / project updates from teams & projects that belong to it.
 * Posts pinned in THIS branch stay on top, then everything else newest first.
 */
export async function getBranchFeedItems(
  branchId: string,
  page: number = 1,
  pageSize: number = 20,
  _userId?: string | null,
): Promise<{ items: FeedItem[]; total: number }> {
  const supabase = createAdminClient();
  const userId = _userId === null ? null : await getSessionUserId();

  const { data: branchTeams } = await supabase
    .from("teams")
    .select("id")
    .eq("branch_id", branchId);

  const teamIds = (branchTeams ?? []).map((t) => t.id);
  const teamIdFilter = teamIds.length > 0 ? teamIds : [""];

  const { data: branchProjects } = await supabase
    .from("projects")
    .select("id, team_id")
    .in("team_id", teamIdFilter);

  const projectIds = (branchProjects ?? []).map((p) => p.id);
  const projectIdFilter = projectIds.length > 0 ? projectIds : [""];

  const [{ data: announcements }, { data: highlights }, { data: teamUpdates }, { data: projectUpdates }] =
    await Promise.all([
      supabase.from("branch_announcements").select("id").eq("branch_id", branchId),
      supabase.from("branch_highlights").select("id").eq("branch_id", branchId),
      teamIds.length > 0
        ? supabase.from("team_updates").select("id").in("team_id", teamIdFilter)
        : Promise.resolve({ data: [] as { id: string }[] }),
      projectIds.length > 0
        ? supabase.from("project_updates").select("id").in("project_id", projectIdFilter)
        : Promise.resolve({ data: [] as { id: string }[] }),
    ]);

  const sourceIds = [
    ...(announcements ?? []).map((a) => a.id),
    ...(highlights ?? []).map((h) => h.id),
    ...(teamUpdates ?? []).map((t) => t.id),
    ...(projectUpdates ?? []).map((p) => p.id),
  ];

  let total = 0;
  const allIds = [...new Set(sourceIds)];
  if (allIds.length > 0) {
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .in("source_id", allIds);
    total = count ?? 0;
  }

  const [{ data: pinRows }, { data: posts }] = await Promise.all([
    supabase.from("feed_pins").select("post_id").eq("scope", "branch").eq("branch_id", branchId),
    allIds.length > 0
      ? supabase.rpc("get_branch_feed_posts", {
          p_branch_id: branchId,
          p_source_ids: allIds,
          p_page: page,
          p_page_size: pageSize,
          p_viewer: userId,
        })
      : Promise.resolve({ data: [] as PostRow[] }),
  ]);

  const pinnedIds = new Set((pinRows ?? []).map((r) => r.post_id));
  const items = await enrichPosts(supabase, (posts ?? []) as PostRow[], userId, pinnedIds);
  return { items, total };
}

/**
 * Pins/unpins a post in a specific feed scope (global/branch/team/project).
 * Permission enforcement happens server-side in the `toggle_feed_pin` RPC:
 *   global  -> platform admin
 *   branch  -> branch leader of that branch + platform admin
 *   team    -> team owner, members with EDIT_FEED_POSTS, + platform admin
 *   project -> project owner + platform admin
 * A single post can be pinned independently in multiple feeds.
 */
export async function toggleFeedPin(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const postId = formData.get("post_id") as string;
  if (!postId) return { error: "Post ID is required" };

  const scope = formData.get("scope") as string;
  if (!scope) return { error: "Pin scope is required" };

  const branchId = (formData.get("branch_id") as string) || null;
  const teamId = (formData.get("team_id") as string) || null;
  const projectId = (formData.get("project_id") as string) || null;

  const { error } = await supabase.rpc("toggle_feed_pin", {
    p_post_id: postId,
    p_scope: scope,
    p_branch_id: branchId,
    p_team_id: teamId,
    p_project_id: projectId,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ── Standalone composer (main feed) ──────────────────────────────────────

export async function createFeedPost(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const title = (formData.get("title") as string) ?? "";
  const body = (formData.get("body") as string) ?? "";

  if (!title.trim() && !body.trim()) {
    return { error: "Write something before posting." };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim() || null,
      images: [],
      source_type: "user_post",
      source_id: null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await notifyMentions(body.trim(), user.id, "user_post", post.id, body.trim());

  return { success: true, id: post.id };
}

export async function uploadFeedPostMedia(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const postId = formData.get("post_id") as string;
  const file = formData.get("file") as File;
  const kind = (formData.get("kind") as FeedMediaKind | null) ?? "image";
  const isVideo = kind === "video";

  if (!postId || !file || file.size === 0) {
    return { error: "Missing required fields" };
  }

  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const bucket = isVideo ? VIDEO_STORAGE_BUCKET : IMAGE_STORAGE_BUCKET;
  const column = isVideo ? "videos" : "images";

  if (file.size > maxSize) {
    return {
      error: isVideo
        ? "Video too large. Maximum size is 50MB"
        : "Image too large. Maximum size is 2MB",
    };
  }
  if (!allowedTypes.includes(file.type)) {
    return {
      error: isVideo
        ? "Unsupported video format. Use MP4, WebM, or MOV."
        : "Invalid file type. Use PNG, JPEG, or WebP",
    };
  }

  const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "png");
  const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  const { data: existing } = await supabase
    .from("posts")
    .select("images, videos")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();

  const media = Array.isArray(existing?.[column]) ? existing[column] : [];

  const { error: updateError } = await supabase
    .from("posts")
    .update({ [column]: [...media, publicUrl], updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id);

  if (updateError) return { error: updateError.message };

  return { success: true, media_url: publicUrl };
}
