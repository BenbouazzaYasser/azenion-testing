import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MessageType = "text" | "post_share";

export interface PostShareMetadata {
  post_id: string;
  source_type: string | null;
  title: string;
  excerpt: string | null;
  image: string | null;
  author: {
    id: string | null;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface MessageWithSender {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  message_type: MessageType;
  metadata: PostShareMetadata | null;
  created_at: string | null;
  edited_at: string | null;
  received_at: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string;
  } | null;
}

export interface ConversationWithMeta {
  id: string;
  other_user: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    message_type: MessageType;
    /** Display text for the sidebar: content for text, the optional message
     *  or "Shared a post" for post_share. */
    preview: string;
    created_at: string | null;
    sender_id: string;
    received_at: string | null;
  } | null;
  other_last_read_at: string | null;
  updated_at: string | null;
  unread_count: number;
  /** True when the other participant has blocked the current user. */
  blocked_me: boolean;
  /** True when the current user has blocked the other participant. */
  i_blocked: boolean;
}

export async function getConversations(
  userId: string,
  options: { archived?: boolean } = {},
): Promise<ConversationWithMeta[]> {
  const supabase = createClient();

  const membershipQuery = supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  const scopedQuery = options.archived
    ? membershipQuery.not("archived_at", "is", null).is("deleted_at", null)
    : membershipQuery.is("archived_at", null).is("deleted_at", null);

  const { data: memberships } = await scopedQuery;

  if (!memberships || memberships.length === 0) return [];

  const conversationIds = memberships.map((m) => m.conversation_id);

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, created_at, updated_at")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (!conversations) return [];

  const membersPromises = conversationIds.map(async (cid) => {
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id, last_read_at")
      .eq("conversation_id", cid);
    return { conversation_id: cid, members: members ?? [] };
  });

  const membersResults = await Promise.all(membersPromises);
  const membersByConv = Object.fromEntries(
    membersResults.map((r) => [r.conversation_id, r.members]),
  ) as Record<string, { user_id: string; last_read_at: string | null }[]>;

  const allUserIds = [
    ...new Set(membersResults.flatMap((r) => r.members.map((m) => m.user_id))),
  ];

  const { data: profiles } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", allUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  const messagesPromises = conversationIds.map(async (cid) => {
    const { data: messages } = await supabase
      .from("messages")
      .select("content, message_type, created_at, sender_id, received_at")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: false })
      .limit(1);
    return { conversation_id: cid, lastMessage: messages?.[0] ?? null };
  });

  const messagesResults = await Promise.all(messagesPromises);
  const lastMessageByConv = Object.fromEntries(
    messagesResults.map((r) => [r.conversation_id, r.lastMessage]),
  ) as Record<
    string,
    {
      content: string;
      message_type: MessageType;
      created_at: string | null;
      sender_id: string;
      received_at: string | null;
    } | null
  >;

  const { data: unreadRows } = await supabase.rpc("get_unread_counts", {
    p_user_id: userId,
  });
  const unreadByConv = Object.fromEntries(
    ((unreadRows ?? []) as { conversation_id: string; unread_count: number }[]).map(
      (r) => [r.conversation_id, Number(r.unread_count)],
    ),
  ) as Record<string, number>;

  // Block state: users I have blocked (readable via RLS) and users who have
  // blocked me (exposed through the self-scoped helper RPC).
  const { data: ownBlockRows } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  const iBlockedIds = new Set((ownBlockRows ?? []).map((r) => r.blocked_id));

  const { data: blockersOfMe } = await supabase.rpc("get_users_that_blocked_me", {
    p_user_id: userId,
  });
  const blockedMeIds = new Set((blockersOfMe ?? []) as string[]);

  return (conversations ?? []).map((conv) => {
    const convMembers = membersByConv[conv.id] ?? [];
    const otherMember = convMembers.find((m) => m.user_id !== userId);
    const otherProfile = otherMember ? profileMap.get(otherMember.user_id) : null;
    const lastMsg = lastMessageByConv[conv.id];

    return {
      id: conv.id,
      other_user: otherProfile
        ? {
            id: otherProfile.id,
            full_name: otherProfile.full_name,
            username: otherProfile.username,
            avatar_url: otherProfile.avatar_url,
          }
        : null,
      last_message: lastMsg
        ? {
            content: lastMsg.content,
            message_type: lastMsg.message_type as MessageType,
            preview:
              lastMsg.message_type === "post_share"
                ? lastMsg.content || "Shared a post"
                : lastMsg.content,
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id,
            received_at: lastMsg.received_at,
          }
        : null,
      updated_at: conv.updated_at,
      other_last_read_at: otherMember?.last_read_at ?? null,
      unread_count: unreadByConv[conv.id] ?? 0,
      blocked_me: otherMember ? blockedMeIds.has(otherMember.user_id) : false,
      i_blocked: otherMember ? iBlockedIds.has(otherMember.user_id) : false,
    };
  });
}

export async function getMessages(conversationId: string): Promise<MessageWithSender[]> {
  const supabase = createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, image_url, message_type, metadata, created_at, edited_at, received_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!messages) return [];

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];

  const { data: profiles } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", senderIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return messages.map((msg) => ({
    ...msg,
    sender: profileMap.get(msg.sender_id) ?? null,
  }));
}

export async function getConversationBlockState(conversationId: string): Promise<{
  /** True when the other participant has blocked the current user. */
  am_blocked: boolean;
  /** True when the current user has blocked the other participant. */
  i_blocked: boolean;
}> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { am_blocked: false, i_blocked: false };
  }

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  const otherId = (members ?? []).find((m) => m.user_id !== user.id)?.user_id ?? null;

  if (!otherId) {
    return { am_blocked: false, i_blocked: false };
  }

  const { data: ownBlockRows } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);
  const i_blocked = (ownBlockRows ?? []).some((b) => b.blocked_id === otherId);

  const { data: am_blocked } = await supabase.rpc("is_user_blocked", {
    p_blocker_id: otherId,
    p_blocked_id: user.id,
  });

  return { am_blocked: !!am_blocked, i_blocked };
}


