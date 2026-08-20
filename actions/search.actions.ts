"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchCategory =
  | "Users"
  | "Teams"
  | "Projects"
  | "Branches"
  | "Feed posts"
  | "Academy sessions"
  | "Announcements";

export interface SearchResultItem {
  category: SearchCategory;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string | null;
  meta?: string | null;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
}

// Per-category caps so no single entity floods the palette.
const LIMITS: Record<SearchCategory, number> = {
  Users: 6,
  Teams: 5,
  Projects: 5,
  Branches: 5,
  "Feed posts": 6,
  "Academy sessions": 4,
  Announcements: 4,
};

const CATEGORY_ORDER: SearchCategory[] = [
  "Users",
  "Teams",
  "Projects",
  "Branches",
  "Feed posts",
  "Academy sessions",
  "Announcements",
];

/** Newer-first small boost: older items pay a small penalty. */
function recencyPenalty(createdAt: string | null): number {
  if (!createdAt) return 0;
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  return Math.min(Math.max(Math.round(days / 30), 0), 40);
}

/**
 * Rank a name: exact > prefix > token-prefix > contains.
 * Lower score sorts higher; recencyPenalty keeps fresh items near the top.
 */
function scoreName(name: string, q: string, recencyPenalty = 0): number {
  const hay = name.toLowerCase();
  const needle = q.toLowerCase().trim();
  if (!needle) return 500;
  if (hay === needle) return 0 + recencyPenalty;
  if (hay.startsWith(needle)) return 100 + recencyPenalty;
  if (hay.split(/\s+/).some((w) => w.startsWith(needle))) return 200 + recencyPenalty;
  if (hay.includes(needle)) return 300 + recencyPenalty;
  return 400 + recencyPenalty;
}

function rankedSelect<T extends { __q: string; __createdAt?: string | null }>(
  rows: T[],
  q: string,
): T[] {
  return rows
    .map((row) => ({
      row,
      score: scoreName(row.__q, q, recencyPenalty(row.__createdAt ?? null)),
    }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.row);
}

export async function globalSearch(rawQuery: string): Promise<GlobalSearchResponse> {
  const query = rawQuery.trim();
  if (!query) {
    return { query, results: [] };
  }

  const supabase = await createClient();
  const q = query;
  const results: SearchResultItem[] = [];

  // ---- Users
  {
    // RLS locks `profiles` to the caller's own row (00004_rls_fix), so direct
    // reads cannot surface other members. search_users is a SECURITY DEFINER
    // RPC (see 00076_global_user_search.sql) that searches all profiles while
    // honoring each member's `search_visibility` privacy setting and block list.
    const userQuery = q.replace(/^@/, "").trim();
    const { data } = await supabase.rpc("search_users", {
      p_query: userQuery,
      p_limit: 80,
    });
    const rows = (data ?? []) as Array<{
      id: string;
      username: string;
      full_name: string | null;
      institution: string | null;
      avatar_url: string | null;
      created_at: string | null;
    }>;

    const packed = rows.map((r) => ({
      row: r,
      __q: `${r.full_name ?? ""} ${r.username}`,
      __createdAt: r.created_at,
    }));
    const ranked = rankedSelect(packed, userQuery);
    results.push(
      ...ranked
        .slice(0, LIMITS.Users)
        .map(({ row }) => ({
          category: "Users" as const,
          id: row.id,
          title: row.full_name || `@${row.username}`,
          subtitle: row.username ? `@${row.username}` : (row.institution ?? "Azenion member"),
          href: `/u/${row.username}`,
          image: row.avatar_url,
          meta: row.institution ?? "Member",
        })),
    );
  }

  // ---- Teams (public only)
  {
    const { data } = await supabase
      .from("teams")
      .select("id, slug, name, description, logo_url, visibility, created_at")
      .ilike("name", `%${q}%`)
      .limit(80);
    const rows = (data ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      visibility: string;
      created_at: string | null;
    }>;

    const packed = rows.map((row) => ({
      row,
      __q: row.name,
      __createdAt: row.created_at,
    }));
    const ranked = rankedSelect(packed, q);
    results.push(
      ...ranked
        .filter(({ row }) => row.visibility === "public")
        .slice(0, LIMITS.Teams)
        .map(({ row }) => ({
          category: "Teams" as const,
          id: row.id,
          title: row.name,
          subtitle: row.description || "Team",
          href: `/teams/${row.slug}`,
          image: row.logo_url,
          meta: "Team",
        })),
    );
  }

  // ---- Projects (public only)
  {
    const { data } = await supabase
      .from("projects")
      .select("id, slug, name, description, logo_url, visibility, created_at")
      .ilike("name", `%${q}%`)
      .limit(80);
    const rows = (data ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      visibility: string;
      created_at: string | null;
    }>;

    const packed = rows.map((row) => ({ row, __q: row.name, __createdAt: row.created_at }));
    const ranked = rankedSelect(packed, q);
    results.push(
      ...ranked
        .filter(({ row }) => row.visibility === "public")
        .slice(0, LIMITS.Projects)
        .map(({ row }) => ({
          category: "Projects" as const,
          id: row.id,
          title: row.name,
          subtitle: row.description || "Project",
          href: `/projects/${row.slug}`,
          image: row.logo_url,
          meta: "Project",
        })),
    );
  }

  // ---- Branches
  {
    const { data } = await supabase
      .from("branches")
      .select("id, slug, name, full_name, description, logo_url, city, created_at")
      .or(`name.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(80);
    const rows = (data ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      full_name: string | null;
      description: string | null;
      logo_url: string | null;
      city: string | null;
      created_at: string | null;
    }>;

    const packed = rows.map((row) => ({
      row,
      __q: `${row.name} ${row.full_name ?? ""}`,
      __createdAt: row.created_at,
    }));
    const ranked = rankedSelect(packed, q);
    results.push(
      ...ranked
        .slice(0, LIMITS.Branches)
        .map(({ row }) => ({
          category: "Branches" as const,
          id: row.id,
          title: row.name,
          subtitle: row.description || row.city || "Branch",
          href: `/branches/${row.slug}`,
          image: row.logo_url,
          meta: row.city ?? "Branch",
        })),
    );
  }

  // ---- Feed posts
  {
    const { data } = await supabase
      .from("posts")
      .select(
        "id, title, body, author_id, created_at, profiles(full_name, username, avatar_url)",
      )
      .or(`title.ilike.%${q}%,body.ilike.%${q}%`)
      .limit(60);
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      title: string;
      body: string | null;
      author_id: string | null;
      created_at: string | null;
      profiles: { full_name: string | null; username: string | null } | null;
    }>;

    const packed = rows.map((row) => ({
      row,
      __q: `${row.title} ${row.body ?? ""}`,
      __createdAt: row.created_at,
    }));
    const ranked = rankedSelect(packed, q);
    results.push(
      ...ranked
        .slice(0, LIMITS["Feed posts"])
        .map(({ row }) => {
          const author = row.profiles?.username
            ? `by ${row.profiles.username}`
            : row.profiles?.full_name
              ? `by ${row.profiles.full_name}`
              : null;
          return {
            category: "Feed posts" as const,
            id: row.id,
            title: row.title || "Untitled post",
            subtitle: row.body?.replace(/\s+/g, " ").slice(0, 96) || "Feed post",
            href: `/feed/post/${row.id}`,
            meta: author,
          };
        }),
    );
  }

  // ---- Academy live sessions
  {
    const { data } = await supabase
      .from("live_sessions")
      .select("id, title, instructor, starts_at, format, location, created_at")
      .ilike("title", `%${q}%`)
      .limit(60);
    const rows = (data ?? []) as Array<{
      id: string;
      title: string;
      instructor: string | null;
      starts_at: string | null;
      created_at: string | null;
    }>;

    const packed = rows.map((row) => ({
      row,
      __q: `${row.title} ${row.instructor ?? ""}`,
      __createdAt: row.created_at,
    }));
    const ranked = rankedSelect(packed, q);
    results.push(
      ...ranked
        .slice(0, LIMITS["Academy sessions"])
        .map(({ row }) => ({
          category: "Academy sessions" as const,
          id: row.id,
          title: row.title,
          subtitle: row.instructor ? `by ${row.instructor}` : "Live session",
          href: "/academy/live-sessions",
          meta: row.starts_at
            ? new Date(row.starts_at).toLocaleDateString()
            : null,
        })),
    );
  }

  // ---- Announcements
  {
    const { data } = await supabase
      .from("platform_announcements")
      .select("id, emoji, title, category, description, published_at")
      .ilike("title", `%${q}%`)
      .limit(60);
    const rows = (data ?? []) as Array<{
      id: string;
      emoji: string | null;
      title: string;
      category: string;
      description: string | null;
      published_at: string | null;
    }>;

    const packed = rows.map((row) => ({
      row,
      __q: row.title,
      __createdAt: row.published_at,
    }));
    const ranked = rankedSelect(packed, q);
    results.push(
      ...ranked
        .slice(0, LIMITS.Announcements)
        .map(({ row }) => ({
          category: "Announcements" as const,
          id: row.id,
          title: row.title,
          subtitle: row.description || "Announcement",
          href: "/announcements",
          image: row.emoji || null,
          meta: row.category ?? "Announcement",
        })),
    );
  }

  return { query, results };
}