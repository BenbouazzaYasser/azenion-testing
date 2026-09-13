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

/** Full server view. RLS hides project channels the user can't access. */
export async function getServerView(slug: string): Promise<ServerView | null> {
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
}

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

/**
 * Resolve a channel by id for the current user.
 * Returns null when it doesn't exist or RLS hides it (no access).
 */
export async function getChannelView(channelId: string): Promise<ChannelView | null> {
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

export async function getChannelMessages(
  channelId: string,
): Promise<ChannelMessageWithSender[]> {
  const supabase = await createClient();

  // RLS enforces access; an empty result for non-members is fine.
  const { data: messages } = await supabase
    .from("channel_messages")
    .select("id, channel_id, sender_id, content, image_url, created_at, edited_at")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  if (!messages) return [];

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];

  const { data: profiles } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", senderIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return messages.map((msg) => ({
    ...msg,
    sender: profileMap.get(msg.sender_id) ?? null,
  }));
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
