"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversations, getMessages, type ConversationWithMeta } from "@/data/chat";
import {
  validateChatAttachmentInput,
  validateAttachmentMetadata,
  CHAT_MEDIA_BUCKET,
} from "@/lib/chat-media";
import { checkRateLimit } from "@/lib/rate-limit";
import { cleanupOrphanedStorageObjects } from "@/lib/storage-cleanup";
import { isValidStickerId, getStickerById } from "@/lib/stickers/catalog";

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Blunt message spam: 60 sends/minute per user (see lib/rate-limit.ts).
  const rl = await checkRateLimit("chat_send", `user:${user.id}`, 60, 60);
  if (!rl.allowed) {
    return { error: "You're sending messages too fast — please wait a moment." };
  }

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId);

  // Verify caller is member (defense in depth — RLS also checks)
  const isMember = (members ?? []).some((m) => m.user_id === user.id);
  if (!isMember) {
    return { error: "You are not a member of this conversation." };
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" };
  }

  // Block guard: if a peer in this conversation has blocked the sender, the
  // message must not be sent. This mirrors the RLS INSERT policy (which is
  // what actually stops direct client inserts), but also gives the UI a clean
  // error message before the DB rejects the write.
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
  type: "image" | "file" | "audio" | "gif" | "sticker";
  storage_path?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  duration_seconds?: number | null;
  provider?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function sendMessageWithAttachments(
  conversationId: string,
  content: string,
  attachments: SendMessageAttachmentInput[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Blunt message spam: 60 sends/minute per user (see lib/rate-limit.ts).
  const rl = await checkRateLimit("chat_send", `user:${user.id}`, 60, 60);
  if (!rl.allowed) {
    return { error: "You're sending messages too fast — please wait a moment." };
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
      filename: att.filename ?? null,
      mimeType: att.mime_type ?? null,
      fileSize: att.file_size ?? null,
      durationSeconds: att.duration_seconds ?? null,
      storagePath: att.storage_path ?? null,
      provider: att.provider ?? null,
      externalId: att.external_id ?? null,
      metadata: att.metadata ?? null,
    });
    if (!result.valid) {
      return { error: result.error ?? "Invalid attachment." };
    }
    const meta = validateAttachmentMetadata(att.metadata ?? null);
    if (!meta.valid) {
      return { error: meta.error ?? "Invalid attachment metadata." };
    }
    // Ensure storage-backed paths are conversation-scoped
    if (att.type === "image" || att.type === "file" || att.type === "audio") {
      if (!att.storage_path || !att.storage_path.startsWith(`chat/${conversationId}/`)) {
        return { error: "Attachment path does not match conversation." };
      }
    }
    // For gif, ensure provider is allowed (already validated) and external_id present
    if (att.type === "gif" && att.provider !== "giphy" && att.provider !== "tenor") {
      return { error: "Invalid GIF provider." };
    }
    if (att.type === "sticker") {
      if (!att.external_id || !isValidStickerId(att.external_id)) {
        return { error: "Invalid sticker." };
      }
      if (att.provider !== "local") {
        return { error: "Invalid sticker provider." };
      }
      // Strict: metadata url must match catalog if provided (prevents arbitrary URL)
      if (att.metadata && typeof att.metadata === "object") {
        const metaUrl = (att.metadata as Record<string, unknown>).url as string | undefined;
        const sticker = getStickerById(att.external_id);
        if (metaUrl && sticker && metaUrl !== sticker.url) {
          return { error: "Sticker URL mismatch." };
        }
        if (metaUrl && !metaUrl.startsWith("/stickers/")) {
          return { error: "Sticker URL not allowed." };
        }
      }
    }
  }

  // Atomic: message + attachments insert in one transaction via the
  // send_chat_message RPC (00142). Attachment triggers validate every row in
  // the same transaction — a rejected attachment rolls the message back with
  // it, replacing the previous two-round-trip insert + manual delete.
  const messageContent = hasText ? content.trim() : "";
  const { data, error: rpcError } = await supabase.rpc("send_chat_message", {
    p_conversation_id: conversationId,
    p_content: messageContent,
    p_attachments: attachments.map((att) => ({
      type: att.type,
      storage_path: att.storage_path ?? null,
      filename: att.filename ?? null,
      mime_type: att.mime_type ?? null,
      file_size: att.file_size ?? null,
      duration_seconds: att.type === "audio" ? (att.duration_seconds ?? null) : null,
      provider: att.provider ?? null,
      external_id: att.external_id ?? null,
      metadata: att.metadata ?? {},
    })),
  });

  if (rpcError || !data || data.length === 0) {
    // Nothing was inserted; remove any uploaded objects so they don't orphan.
    const paths = attachments.map((a) => a.storage_path).filter((p): p is string => !!p);
    if (paths.length > 0) {
      await cleanupOrphanedStorageObjects(CHAT_MEDIA_BUCKET, paths);
    }
    return { error: rpcError?.message ?? "Failed to send message." };
  }

  revalidatePath(`/chat/${conversationId}`);
  return { success: true, id: data[0].id, created_at: data[0].created_at };
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

  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!message || message.sender_id !== user.id) {
    return { error: "Message not found" };
  }

  const { data: attachments } = await supabase
    .from("chat_message_attachments")
    .select("storage_path")
    .eq("message_id", messageId);

  const paths =
    (attachments ?? [])
      .map((a) => a.storage_path)
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0) ?? [];

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (paths.length > 0) {
    await cleanupOrphanedStorageObjects(CHAT_MEDIA_BUCKET, paths);
  }

  revalidatePath(`/chat/${message.conversation_id}`);
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

/** One older page of messages for infinite scroll (keyset on created_at). */
export async function loadOlderMessages(conversationId: string, before: string) {
  // RLS on `messages` scopes the page to conversations the caller belongs to;
  // profiles/signed URLs are only derived from rows that survive that scope.
  return getMessages(conversationId, { before });
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
  if (!query.trim()) return [];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Use the established search_users SECURITY DEFINER RPC (00072_global_user_search)
  // through the session-bound client. Unlike an admin-client read of `profiles`,
  // it enforces search_visibility and excludes blocked users in both directions,
  // and never weakens RLS. Only non-private profile columns are returned.
  const { data } = await supabase.rpc("search_users", {
    p_query: query.trim(),
    p_limit: 10,
  });

  return (data ?? []) as {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  }[];
}
