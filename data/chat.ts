import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface MessageWithSender {
  id: string;
  conversation_id: string;
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
    created_at: string | null;
    sender_id: string;
  } | null;
  updated_at: string | null;
}

export async function getConversations(userId: string): Promise<ConversationWithMeta[]> {
  const supabase = createClient();

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

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
      .select("user_id")
      .eq("conversation_id", cid);
    return { conversation_id: cid, members: members ?? [] };
  });

  const membersResults = await Promise.all(membersPromises);
  const membersByConv = Object.fromEntries(
    membersResults.map((r) => [r.conversation_id, r.members]),
  ) as Record<string, { user_id: string }[]>;

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
      .select("content, created_at, sender_id")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: false })
      .limit(1);
    return { conversation_id: cid, lastMessage: messages?.[0] ?? null };
  });

  const messagesResults = await Promise.all(messagesPromises);
  const lastMessageByConv = Object.fromEntries(
    messagesResults.map((r) => [r.conversation_id, r.lastMessage]),
  ) as Record<string, { content: string; created_at: string | null; sender_id: string } | null>;

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
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id,
          }
        : null,
      updated_at: conv.updated_at,
    };
  });
}

export async function getMessages(conversationId: string): Promise<MessageWithSender[]> {
  const supabase = createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, image_url, created_at, edited_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!messages) return [];

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];

  const { data: profiles } = await supabase
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


