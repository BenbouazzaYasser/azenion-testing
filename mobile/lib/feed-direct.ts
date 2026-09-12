import { supabase } from "./supabase";
import { resolvePeers } from "./peers";
import type { FeedItem } from "../components/post-card";

interface PostRow {
  id: string;
  author_id: string | null;
  title: string;
  body: string | null;
  images: unknown;
  videos: unknown;
  source_type: string;
  source_id: string | null;
  created_at: string | null;
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/**
 * Pure assembly of FeedItems from already-fetched rows. Kept side-effect
 * free so the mapping is unit-testable.
 */
export function assembleFeedItems(
  posts: PostRow[],
  peers: Map<string, { full_name: string | null; username: string; avatar_url: string | null }>,
  likeCounts: Map<string, number>,
  commentCounts: Map<string, number>,
  userLiked: Set<string>,
  savedIds: Set<string>,
): FeedItem[] {
  return posts.map((p) => {
    const key = `${p.source_type}-${p.source_id ?? p.id}`;
    const peer = p.author_id ? peers.get(p.author_id) : undefined;
    return {
      id: p.id,
      source_type: p.source_type,
      source_id: p.source_id,
      title: p.title,
      body: p.body,
      images: asStrings(p.images),
      created_at: p.created_at,
      like_count: likeCounts.get(key) ?? 0,
      comment_count: commentCounts.get(key) ?? 0,
      user_has_liked: userLiked.has(key),
      saved_by_user: savedIds.has(p.id),
      author_name: peer?.full_name ?? peer?.username ?? null,
      author_username: peer?.username ?? null,
      author_avatar: peer?.avatar_url ?? null,
      entity_name: null,
      branch_name: null,
    };
  });
}

/**
 * Direct-RLS global feed page. Used when the Phase 0C /api/feed boundary is
 * unreachable (e.g. backend not yet deployed): every read runs under the
 * caller's JWT, so posts/likes/comments visibility stays DB-enforced via
 * is_feed_post_visible. Enrichment is best-effort (peer names via
 * search_users); the boundary remains preferred when available.
 */
export async function getDirectFeedPage(page: number, pageSize: number): Promise<{ items: FeedItem[]; total: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const from = (page - 1) * pageSize;
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, author_id, title, body, images, videos, source_type, source_id, created_at")
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  const rows = (posts ?? []) as PostRow[];

  const sourceIds = [...new Set(rows.map((p) => p.source_id).filter((s): s is string => Boolean(s)))];
  const postIds = rows.map((p) => p.id);
  const authorIds = [...new Set(rows.map((p) => p.author_id).filter((a): a is string => Boolean(a)))];

  const [likesRes, commentsRes, peers, userLikesRes, savedRes] = await Promise.all([
    sourceIds.length > 0
      ? supabase.from("update_likes").select("target_type, target_id, user_id").in("target_id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    sourceIds.length > 0
      ? supabase.from("update_comments").select("target_type, target_id").in("target_id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    resolvePeers(authorIds),
    user && sourceIds.length > 0
      ? supabase.from("update_likes").select("target_type, target_id").eq("user_id", user.id).in("target_id", sourceIds)
      : Promise.resolve({ data: [], error: null }),
    user && postIds.length > 0
      ? supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const likeCounts = new Map<string, number>();
  for (const l of ((likesRes.data ?? []) as Array<{ target_type: string; target_id: string }>)) {
    const k = `${l.target_type}-${l.target_id}`;
    likeCounts.set(k, (likeCounts.get(k) ?? 0) + 1);
  }
  const commentCounts = new Map<string, number>();
  for (const c of ((commentsRes.data ?? []) as Array<{ target_type: string; target_id: string }>)) {
    const k = `${c.target_type}-${c.target_id}`;
    commentCounts.set(k, (commentCounts.get(k) ?? 0) + 1);
  }
  const userLiked = new Set(
    ((userLikesRes.data ?? []) as Array<{ target_type: string; target_id: string }>).map((l) => `${l.target_type}-${l.target_id}`),
  );
  const savedIds = new Set(((savedRes.data ?? []) as Array<{ post_id: string }>).map((r) => r.post_id));

  return { items: assembleFeedItems(rows, peers, likeCounts, commentCounts, userLiked, savedIds), total: -1 };
}

/** Direct-RLS single post (visibility enforced by posts RLS). Null when invisible/missing. */
export async function getDirectFeedItem(postId: string): Promise<FeedItem | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, title, body, images, videos, source_type, source_id, created_at")
    .eq("id", postId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PostRow;
  const peers = await resolvePeers(row.author_id ? [row.author_id] : []);
  const [item] = assembleFeedItems([row], peers, new Map(), new Map(), new Set(), new Set());
  return item ?? null;
}
