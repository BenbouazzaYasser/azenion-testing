"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendMessage(conversationId: string, content: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select("id, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/chat/${conversationId}`);
  return { success: true, id: data.id, created_at: data.created_at };
}

export async function editMessage(messageId: string, content: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  const { error } = await supabase
    .from("messages")
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteMessage(messageId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getOrCreateConversation(otherUserId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (otherUserId === user.id) {
    return { error: "Cannot start a conversation with yourself" };
  }

  const { data: conversationId, error } = await supabase.rpc(
    "get_or_create_conversation",
    { p_user_id: otherUserId },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat");
  return { conversation_id: conversationId };
}

export async function markConversationRead(conversationId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/chat/${conversationId}`);
  return { success: true };
}

export async function getConversationRecipientReadAt(
  conversationId: string,
): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("conversation_members")
    .select("last_read_at")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .maybeSingle();

  return (data?.last_read_at as string | null) ?? null;
}

export async function getChatUnreadCounts(): Promise<
  { conversation_id: string; unread_count: number }[]
> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase.rpc("get_unread_counts", {
    p_user_id: user.id,
  });

  return ((data ?? []) as { conversation_id: string; unread_count: number }[]).map(
    (r) => ({ conversation_id: r.conversation_id, unread_count: Number(r.unread_count) }),
  );
}

export async function searchUsers(query: string) {
  if (!query.trim()) return [];

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const supabaseAdmin = createAdminClient();

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(10);

  return data ?? [];
}
