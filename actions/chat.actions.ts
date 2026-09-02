"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversations, type ConversationWithMeta } from "@/data/chat";
import {
  validateChatAttachmentInput,
  CHAT_MEDIA_BUCKET,
} from "@/lib/chat-media";

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

export interface SendMessageAttachmentInput {
  type: "image" | "file" | "audio";
  storage_path: string;
  filename: string;
  mime_type: string;
  file_size: number;
  duration_seconds?: number | null;
}

export async function sendMessageWithAttachments(
  conversationId: string,
  content: string,
  attachments: SendMessageAttachmentInput[],
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const hasText = content.trim().length > 0;
  const hasAttachments = attachments.length > 0;

  if (!hasText && !hasAttachments) {
    return { error: "Message cannot be empty" };
  }

  if (attachments.length > 10) {
    return { error: "Too many attachments. Max 10 per message." };
  }

  // Block guard (same as sendMessage)
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  // Verify caller is member (defense in depth — RLS also checks)
  const isMember = (members ?? []).some((m) => m.user_id === user.id);
  if (!isMember) {
    return { error: "You are not a member of this conversation." };
  }

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

  // Validate each attachment server-side via centralized helpers
  for (const att of attachments) {
    const result = validateChatAttachmentInput({
      type: att.type,
      filename: att.filename,
      mimeType: att.mime_type,
      fileSize: att.file_size,
      durationSeconds: att.duration_seconds ?? null,
      storagePath: att.storage_path,
    });
    if (!result.valid) {
      return { error: result.error ?? "Invalid attachment." };
    }
    // Ensure path is conversation-scoped to the target conversation
    if (!att.storage_path.startsWith(`chat/${conversationId}/`)) {
      return { error: "Attachment path does not match conversation." };
    }
  }

  // Create message (allow empty content when attachments present)
  const messageContent = hasText ? content.trim() : "";
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageContent,
    })
    .select("id, created_at")
    .single();

  if (msgError || !msg) {
    return { error: msgError?.message ?? "Failed to create message." };
  }

  if (attachments.length === 0) {
    revalidatePath(`/chat/${conversationId}`);
    return { success: true, id: msg.id, created_at: msg.created_at };
  }

  // Insert attachment rows
  const rows = attachments.map((att) => ({
    message_id: msg.id,
    conversation_id: conversationId,
    uploader_id: user.id,
    type: att.type,
    storage_path: att.storage_path,
    filename: att.filename,
    mime_type: att.mime_type,
    file_size: att.file_size,
    duration_seconds: att.type === "audio" ? (att.duration_seconds ?? null) : null,
    metadata: {},
  }));

  const { error: attError } = await supabase.from("chat_message_attachments").insert(rows);

  if (attError) {
    // Roll back message to avoid orphan; best-effort clean storage objects
    await supabase.from("messages").delete().eq("id", msg.id).eq("sender_id", user.id);
    try {
      const admin = createAdminClient();
      const paths = attachments.map((a) => a.storage_path);
      await admin.storage.from(CHAT_MEDIA_BUCKET).remove(paths);
    } catch {
      // best effort, ignore
    }
    return { error: attError.message };
  }

  revalidatePath(`/chat/${conversationId}`);
  return { success: true, id: msg.id, created_at: msg.created_at };
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

export async function markMessagesReceived(conversationId: string) {
  const supabase = createClient();

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

export async function archiveConversation(conversationId: string) {
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

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

export async function getArchivedConversations(): Promise<ConversationWithMeta[]> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  return getConversations(user.id, { archived: true });
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
