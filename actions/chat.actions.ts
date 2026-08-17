"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getConversations, type ConversationWithMeta } from "@/data/chat";

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  // Block guard: if a peer in this conversation has blocked the sender, the
  // message must not be sent. This mirrors the RLS INSERT policy (which is
  // what actually stops direct client inserts), but also gives the UI a clean
  // error message before the DB rejects the write.
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  const otherMember = (members ?? []).find((m) => m.user_id !== user.id);

  if (otherMember) {
    const { data: blocked } = await supabase.rpc("is_user_blocked", {
      p_blocker_id: otherMember.user_id,
      p_blocked_id: user.id,
    });
    if (blocked) {
      return { error: "You can't send messages to this user because they blocked you." };
    }
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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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

export async function markMessagesReceived(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("mark_messages_received", {
    p_conversation_id: conversationId,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();

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
  const supabase = await createClient();

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

export async function archiveConversation(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("conversation_members")
    .update({ archived_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat", "layout");
  return { success: true };
}

export async function unarchiveConversation(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("conversation_members")
    .update({ archived_at: null })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat", "layout");
  return { success: true };
}

export async function deleteConversation(conversationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Soft delete: scoped to the current user's membership row. The shared
  // conversation and messages are preserved for the other participant.
  const { error } = await supabase
    .from("conversation_members")
    .update({ deleted_at: new Date().toISOString(), archived_at: null })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat", "layout");
  return { success: true };
}

export async function blockUser(otherUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (otherUserId === user.id) {
    return { error: "You can't block yourself" };
  }

  // Idempotent: creates the block if it doesn't exist, otherwise no-ops. RLS
  // restricts the write to the caller's own blocker_id.
  const { error } = await supabase
    .from("user_blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: otherUserId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat", "layout");
  return { success: true };
}

export async function unblockUser(otherUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // RLS only lets the caller remove their own blocks.
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", otherUserId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat", "layout");
  return { success: true };
}

export async function getChatUnreadCounts(): Promise<
  { conversation_id: string; unread_count: number }[]
> {
  const supabase = await createClient();

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

export async function getArchivedConversations(): Promise<ConversationWithMeta[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  return getConversations(user.id, { archived: true });
}

export async function searchUsers(query: string) {
  // A leading "@" selects a username (same handling as the global search).
  const trimmed = query.trim().replace(/^@/, "");
  if (!trimmed) return [];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // search_users (00076) is a SECURITY DEFINER RPC that searches profiles
  // while honoring each member's `search_visibility` privacy setting and both
  // directions of user_blocks — the same privacy-aware rules the global search
  // and share picker use. The caller id is the server-derived session id, so a
  // caller can never search as someone else.
  const { data, error } = await supabase.rpc("search_users", {
    p_query: trimmed,
    p_limit: 10,
  });

  if (error) return [];

  return ((data ?? []) as Array<{
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }>).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    username: row.username,
    avatar_url: row.avatar_url,
  }));
}
