import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ServerSummary {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  kind: "team" | "branch" | "user";
  role: "owner" | "admin" | "member";
}

export interface ChannelSummary {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  project_id: string | null;
}

export interface ChannelMessageWithSender {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  created_at: string | null;
  edited_at: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string;
  } | null;
}

/** Servers the user belongs to (team/branch servers included automatically). */
export async function getUserServers(userId: string): Promise<ServerSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("server_members")
    .select("role, server:servers (id, slug, name, icon_url, kind)")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data
    .filter((row) => row.server != null)
    .map((row) => {
      const server = row.server as unknown as {
        id: string;
        slug: string;
        name: string;
        icon_url: string | null;
        kind: string;
      };

      return {
        id: server.id,
        slug: server.slug,
        name: server.name,
        icon_url: server.icon_url,
        kind: server.kind as ServerSummary["kind"],
        role: row.role as ServerSummary["role"],
      };
    });
}

export interface ServerView {
  server: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    kind: "team" | "branch" | "user";
  };
  myRole: "owner" | "admin" | "member" | null;
  memberCount: number;
  channels: ChannelSummary[];
}

/**
 * Full server view. RLS hides project channels the user can't access.
 *
 * Memoized per request: the server layout renders next to the channel page,
 * and both call this with the same slug — caching collapses the duplicate
 * (server + channels + count + role) query chain into a single result.
 */
export const getServerView = cache(async (slug: string): Promise<ServerView | null> => {
  const supabase = await createClient();

  const { data: server } = await supabase
    .from("servers")
    .select("id, slug, name, description, icon_url, kind")
    .eq("slug", slug)
    .maybeSingle();

  if (!server) return null;

  const [{ data: channels }, { count }, { data: role }] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name, slug, topic, project_id")
      .eq("server_id", server.id)
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("server_members")
      .select("user_id", { count: "exact", head: true })
      .eq("server_id", server.id),
    supabase.rpc("server_role_for", { p_server_id: server.id }),
  ]);

  return {
    server: {
      id: server.id,
      slug: server.slug,
      name: server.name,
      description: server.description,
      icon_url: server.icon_url,
      kind: server.kind as ServerView["server"]["kind"],
    },
    myRole: (role as ServerView["myRole"]) ?? null,
    memberCount: count ?? 0,
    channels: channels ?? [],
  };
});

export interface ChannelView {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  projectId: string | null;
  serverId: string | null;
  serverSlug: string | null;
  serverName: string | null;
  serverKind: "team" | "branch" | "user" | null;
}

// Internal: resolves a channel by id for the current user (used by
// getProjectChannel below). Returns null when it doesn't exist or RLS hides it.
async function getChannelView(channelId: string): Promise<ChannelView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("channels")
    .select(
      `id, name, slug, topic, project_id, server_id,
       server:servers ( slug, name, kind )`,
    )
    .eq("id", channelId)
    .maybeSingle();

  if (!data) return null;

  const server = data.server as unknown as {
    slug: string;
    name: string;
    kind: string;
  } | null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    topic: data.topic,
    projectId: data.project_id,
    serverId: data.server_id,
    serverSlug: server?.slug ?? null,
    serverName: server?.name ?? null,
    serverKind: (server?.kind as ChannelView["serverKind"]) ?? null,
  };
}

/** The group-chat channel of a project (works standalone or team-linked). */
export async function getProjectChannel(projectId: string): Promise<ChannelView | null> {
  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!channel) return null;

  return getChannelView(channel.id);
}

export interface ChannelMessagePage {
  messages: ChannelMessageWithSender[];
  hasMore: boolean;
  cursor: { createdAt: string; id: string } | null;
}

const CHANNEL_PAGE_SIZE = 50;

async function attachChannelProfiles(
  messages: Array<Omit<ChannelMessageWithSender, "sender">>,
): Promise<ChannelMessageWithSender[]> {
  if (messages.length === 0) return [];
  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  const { data: profiles } = await createAdminClient()
    // SECURITY: channel messages read through the RLS-scoped client above; admin is only used for public profile fields.
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", senderIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return messages.map((message) => ({
    ...message,
    sender: profileMap.get(message.sender_id) ?? null,
  }));
}

export async function getChannelMessagePage(
  channelId: string,
  options: {
    before?: { createdAt: string; id: string } | null;
    limit?: number;
  } = {},
): Promise<ChannelMessagePage> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(options.limit ?? CHANNEL_PAGE_SIZE, 1), 100);
  const before = options.before;

  // Prefer the keyset RPC. The direct query fallback keeps pre-migration local
  // environments usable while the same cursor semantics are rolled out.
  const { data: rpcRows, error: rpcError } = await supabase.rpc("get_channel_messages", {
    p_channel_id: channelId,
    p_before_created_at: before?.createdAt ?? null,
    p_before_id: before?.id ?? null,
    p_limit: limit + 1,
  });

  let rows: Array<Omit<ChannelMessageWithSender, "sender">> = [];
  if (!rpcError && rpcRows) {
    rows = rpcRows as Array<Omit<ChannelMessageWithSender, "sender">>;
  } else {
    let query = supabase
      .from("channel_messages")
      .select("id, channel_id, sender_id, content, image_url, created_at, edited_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (before) {
      query = query.or(
        `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
      );
    }
    const { data } = await query;
    rows = (data ?? []) as Array<Omit<ChannelMessageWithSender, "sender">>;
  }

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit).reverse();
  const messages = await attachChannelProfiles(pageRows);
  const oldest = messages[0];

  return {
    messages,
    hasMore,
    cursor: oldest?.created_at ? { createdAt: oldest.created_at, id: oldest.id } : null,
  };
}

/** Backwards-compatible array helper for project discussion surfaces. */
export async function getChannelMessages(
  channelId: string,
): Promise<ChannelMessageWithSender[]> {
  return (await getChannelMessagePage(channelId)).messages;
}

export interface ServerMemberRow {
  user_id: string;
  role: "owner" | "admin" | "member";
  profile: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
}

export async function getServerMembers(serverId: string): Promise<ServerMemberRow[]> {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("server_members")
    .select("user_id, role, joined_at")
    .eq("server_id", serverId)
    .order("joined_at", { ascending: true });

  if (!members) return [];

  // SECURITY: server membership read via RLS-scoped client above (non-members get empty); admin used only for public profile lookup.
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", members.map((m) => m.user_id));

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return members.map((m) => ({
    user_id: m.user_id,
    role: m.role as ServerMemberRow["role"],
    profile: profileMap.get(m.user_id) ?? null,
  }));
}
