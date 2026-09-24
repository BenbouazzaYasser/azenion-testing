import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CHAT_MEDIA_BUCKET,
  CHAT_MEDIA_PREFIX,
  CHAT_MEDIA_SIGNED_URL_TTL,
  isChatMediaMarker,
} from "@/lib/chat-media";

export interface ChatAttachmentForMessage {
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
  /** Short-lived signed URL for private storage_path, null for provider types or if not resolvable */
  signedUrl: string | null;
}

export interface MessageWithSender {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  created_at: string | null;
  edited_at: string | null;
  received_at: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string;
  } | null;
  attachments: ChatAttachmentForMessage[];
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
    received_at: string | null;
    /** True when the last message has attachments (content may be empty). */
    has_attachments: boolean;
  } | null;
  other_last_read_at: string | null;
  updated_at: string | null;
  unread_count: number;
  /** True when the other participant has blocked the current user. */
  blocked_me: boolean;
  /** True when the current user has blocked the other participant. */
  i_blocked: boolean;
}

/** Stable default so React.cache() dedupes same-request calls (fresh `{}` literals would miss). */
const DEFAULT_CONVERSATION_OPTIONS: { archived?: boolean } = {};

interface InboxRow {
  conversation_id: string;
  updated_at: string | null;
  peer_id: string | null;
  peer_full_name: string | null;
  peer_username: string | null;
  peer_avatar_url: string | null;
  peer_last_read_at: string | null;
  last_message_id: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  last_message_received_at: string | null;
  last_message_has_attachments: boolean;
  unread_count: number;
  blocked_me: boolean;
  i_blocked: boolean;
}

function mapInboxRows(rows: InboxRow[]): ConversationWithMeta[] {
  return rows.map((r) => ({
    id: r.conversation_id,
    other_user: r.peer_id
      ? {
          id: r.peer_id,
          full_name: r.peer_full_name,
          username: r.peer_username ?? "",
          avatar_url: r.peer_avatar_url,
        }
      : null,
    last_message: r.last_message_id
      ? {
          content: r.last_message_content ?? "",
          created_at: r.last_message_at,
          sender_id: r.last_message_sender_id ?? "",
          received_at: r.last_message_received_at,
          has_attachments: r.last_message_has_attachments,
        }
      : null,
    other_last_read_at: r.peer_last_read_at,
    updated_at: r.updated_at,
    unread_count: Number(r.unread_count ?? 0),
    blocked_me: r.blocked_me,
    i_blocked: r.i_blocked,
  }));
}

export const getConversations = cache(
  async (
    userId: string,
    options: { archived?: boolean } = DEFAULT_CONVERSATION_OPTIONS,
  ): Promise<ConversationWithMeta[]> => {
    const supabase = await createClient();

    // Fast path (00148): the whole sidebar in one round trip.
    const { data: inbox, error: inboxError } = await supabase.rpc("get_inbox", {
      p_archived: options.archived ?? false,
    });
    if (!inboxError && inbox) return mapInboxRows(inbox as InboxRow[]);

    // ponytail: pre-00148 fallback — delete once the migration is applied.
    return getConversationsLegacy(userId, options);
  },
);

async function getConversationsLegacy(
  userId: string,
  options: { archived?: boolean } = DEFAULT_CONVERSATION_OPTIONS,
): Promise<ConversationWithMeta[]> {
  const supabase = await createClient();

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

  // Batched: one members query for all conversations (was N per-conversation queries).
  const { data: allMembers } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id, last_read_at")
    .in("conversation_id", conversationIds);

  const membersByConv = {} as Record<string, { user_id: string; last_read_at: string | null }[]>;
  for (const m of allMembers ?? []) {
    (membersByConv[m.conversation_id] ??= []).push(m);
  }

  const allUserIds = [
    ...new Set(
      Object.values(membersByConv).flatMap((members) => members.map((m) => m.user_id)),
    ),
  ];

  const { data: profiles } = await createAdminClient()
    // SECURITY: conversation list already scoped to caller's RLS-visible memberships above; admin used only for public profile lookup.
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", allUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  // One RPC for all conversations' last message (was one query per conversation).
  // SECURITY INVOKER: RLS limits rows to conversations the caller belongs to.
  const { data: lastRows } = await supabase.rpc("get_last_messages", {
    p_conversation_ids: conversationIds,
  });
  const lastMessageRows = (lastRows ?? []) as {
    conversation_id: string;
    message_id: string;
    content: string;
    created_at: string | null;
    sender_id: string;
    received_at: string | null;
  }[];

  // One batch query to know which last messages carry attachments (empty content
  // in the sidebar would otherwise render a blank preview).
  const { data: lastAttRows } =
    lastMessageRows.length > 0
      ? await supabase
          .from("chat_message_attachments")
          .select("message_id")
          .in("message_id", lastMessageRows.map((r) => r.message_id))
      : { data: [] as { message_id: string }[] };
  const messagesWithAttachments = new Set((lastAttRows ?? []).map((r) => r.message_id));

  const lastMessageByConv = Object.fromEntries(
    lastMessageRows.map((r) => [r.conversation_id, r]),
  ) as Record<string, (typeof lastMessageRows)[number] | undefined>;

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
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id,
            received_at: lastMsg.received_at,
            has_attachments: messagesWithAttachments.has(lastMsg.message_id),
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

/** Messages per page for keyset pagination of a conversation. */
export const MESSAGES_PAGE_SIZE = 50;

export interface MessagesPage {
  messages: MessageWithSender[];
  /** True when older messages exist before the oldest message in this page. */
  hasMore: boolean;
}

// ponytail: per-instance signed-URL cache — storage signing is a network hop,
// so reuse URLs until near expiry instead of re-minting on every page load.
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_SKEW_MS = 60_000;

export async function getMessages(
  conversationId: string,
  opts: { before?: string | null; beforeId?: string | null } = {},
): Promise<MessagesPage> {
  const supabase = await createClient();

  // Keyset pagination: fetch newest-first with limit+1 to probe for older
  // pages, then reverse for the UI's ascending order. Cursor is
  // (created_at, id) — equal timestamps across messages are common enough
  // (batch inserts share a transaction clock) that id breaks the tie.
  const query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, image_url, created_at, edited_at, received_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE + 1);
  if (opts.before) {
    query.or(
      opts.beforeId
        ? `created_at.lt.${opts.before},and(created_at.eq.${opts.before},id.lt.${opts.beforeId})`
        : `created_at.lt.${opts.before}`,
    );
  }
  const { data } = await query;

  if (!data || data.length === 0) return { messages: [], hasMore: false };

  const hasMore = data.length > MESSAGES_PAGE_SIZE;
  const messages = (hasMore ? data.slice(0, MESSAGES_PAGE_SIZE) : data).reverse();

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];

  const [{ data: profiles }, { data: attachments }] = await Promise.all([
    // SECURITY: messages read via RLS-scoped client above (non-members get empty); admin used only for public profile lookup.
    createAdminClient()
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .in("id", senderIds),
    supabase
      .from("chat_message_attachments")
      .select("id, message_id, conversation_id, uploader_id, type, storage_path, filename, mime_type, file_size, duration_seconds, provider, external_id, metadata, created_at")
      .in("message_id", messages.map((m) => m.id))
      .order("created_at", { ascending: true }),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  // Group attachments by message_id and resolve signed URLs server-side
  const attachmentsByMessage = new Map<string, ChatAttachmentForMessage[]>();
  if (attachments && attachments.length > 0) {
    // SECURITY: conversation membership verified via RLS read above; admin used only for signed-URL minting.
    // Additionally bind paths to this conversation so a crafted
    // cross-conversation storage_path value can never be signed here.
    const admin = createAdminClient();
    const signable = (attachments as ChatAttachmentForMessage[]).filter(
      (att) =>
        att.storage_path !== null &&
        isChatMediaMarker(`${CHAT_MEDIA_PREFIX}${att.storage_path}`) &&
        att.storage_path.startsWith(`chat/${conversationId}/`),
    );
    const now = Date.now();
    const paths = [...new Set(signable.map((att) => att.storage_path!))];
    const signedByPath = new Map<string, string>();
    const missing: string[] = [];
    for (const path of paths) {
      const cached = signedUrlCache.get(path);
      if (cached && cached.expiresAt > now) signedByPath.set(path, cached.url);
      else missing.push(path);
    }
    // Batch: one storage call for all uncached attachments (was one call per attachment).
    if (missing.length > 0) {
      const { data: signed } = await admin.storage
        .from(CHAT_MEDIA_BUCKET)
        .createSignedUrls(missing, CHAT_MEDIA_SIGNED_URL_TTL);
      const expiresAt = now + CHAT_MEDIA_SIGNED_URL_TTL * 1000 - SIGNED_URL_SKEW_MS;
      for (const s of (signed ?? []) as { path: string; signedUrl: string; error: string | null }[]) {
        if (!s.error && s.signedUrl) {
          signedByPath.set(s.path, s.signedUrl);
          signedUrlCache.set(s.path, { url: s.signedUrl, expiresAt });
        }
      }
    }
    for (const att of attachments as ChatAttachmentForMessage[]) {
      const signedUrl =
        att.storage_path && signedByPath.has(att.storage_path)
          ? signedByPath.get(att.storage_path)!
          : null;
      const arr = attachmentsByMessage.get(att.message_id) ?? [];
      arr.push({ ...att, signedUrl });
      attachmentsByMessage.set(att.message_id, arr);
    }
  }

  return {
    hasMore,
    messages: messages.map((msg) => ({
      ...msg,
      sender: profileMap.get(msg.sender_id) ?? null,
      attachments: attachmentsByMessage.get(msg.id) ?? [],
    })),
  };
}

export async function getConversationBlockState(conversationId: string): Promise<{
  /** True when the other participant has blocked the current user. */
  am_blocked: boolean;
  /** True when the current user has blocked the other participant. */
  i_blocked: boolean;
}> {
  const supabase = await createClient();

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


