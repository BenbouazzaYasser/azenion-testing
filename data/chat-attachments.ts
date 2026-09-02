import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveChatMediaValue, CHAT_MEDIA_SIGNED_URL_TTL } from "@/lib/chat-media";

export interface ChatAttachment {
  id: string;
  message_id: string;
  conversation_id: string;
  uploader_id: string;
  type: string;
  storage_path: string | null;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  provider: string | null;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

/**
 * Fetch attachments for a conversation. RLS ensures only members can read.
 * Uses the authenticated client so storage-policed access is enforced via
 * public.is_conversation_member(conversation_id).
 */
export async function getConversationAttachments(conversationId: string): Promise<ChatAttachment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_message_attachments")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as ChatAttachment[];
}

/**
 * Fetch attachments for a set of message IDs (batch). Useful when hydrating
 * a thread without an extra conversation-wide query.
 */
export async function getAttachmentsForMessages(messageIds: string[]): Promise<ChatAttachment[]> {
  if (messageIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_message_attachments")
    .select("*")
    .in("message_id", messageIds)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as ChatAttachment[];
}

/**
 * Fetch attachments joined with signed URLs for storage-backed types.
 * GIF/sticker attachments (provider-backed) are returned as-is.
 */
export async function getConversationAttachmentsWithUrls(
  conversationId: string,
  ttlSeconds: number = CHAT_MEDIA_SIGNED_URL_TTL,
): Promise<(ChatAttachment & { signedUrl: string | null })[]> {
  const attachments = await getConversationAttachments(conversationId);
  // Use admin client to generate signed URLs (bypasses per-user storage RLS at read time
  // but the attachment table RLS already ensured membership). This mirrors lib/media.ts.
  const admin = createAdminClient();
  const withUrls = await Promise.all(
    attachments.map(async (att) => {
      if (!att.storage_path) return { ...att, signedUrl: null };
      const marker = `chat-media/${att.storage_path}`;
      const signedUrl = await resolveChatMediaValue(marker, ttlSeconds, admin as unknown as import("@supabase/supabase-js").SupabaseClient<import("@/types/database.types").Database>);
      return { ...att, signedUrl };
    }),
  );
  return withUrls;
}
