"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getChatUnreadCounts } from "@/actions/chat.actions";
import { waitForRealtimeAuthReady } from "@/lib/realtime-auth";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ChatUnreadMap = Record<string, number>;

type Listener = () => void;

let supabase: ReturnType<typeof createClient> | null = null;
let channel: RealtimeChannel | null = null;
let currentUserId: string | null = null;
let activeConversationId: string | null = null;
let unreadMap: ChatUnreadMap = {};
let bootstrappedFor: string | null = null;
let bootstrapPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

function notify() {
  for (const listener of listeners) listener();
}

function resetState() {
  unreadMap = {};
  activeConversationId = null;
  bootstrappedFor = null;
  bootstrapPromise = null;
}

function bootstrap(userId: string): Promise<void> {
  if (bootstrappedFor === userId) return bootstrapPromise ?? Promise.resolve();
  bootstrappedFor = userId;
  bootstrapPromise = (async () => {
    try {
      const rows = await getChatUnreadCounts();
      if (currentUserId !== userId) return;
      const next: ChatUnreadMap = {};
      for (const row of rows) {
        if (next[row.conversation_id] === undefined) next[row.conversation_id] = row.unread_count;
      }
      if (activeConversationId) next[activeConversationId] = 0;
      unreadMap = next;
      notify();
    } catch {
      // Bootstrap failed; unread stays empty until the next load.
    } finally {
      bootstrapPromise = null;
    }
  })();
  return bootstrapPromise;
}

function handleInsert(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  if (!currentUserId) return;
  const row = payload.new as { sender_id?: string; conversation_id?: string } | null;
  if (!row?.conversation_id || !row.sender_id) return;
  if (row.sender_id === currentUserId) return;
  if (row.conversation_id === activeConversationId) return;
  unreadMap = { ...unreadMap, [row.conversation_id]: (unreadMap[row.conversation_id] ?? 0) + 1 };
  notify();
}

async function ensureChannel() {
  if (channel) return;
  const supabase = getSupabase();
  await waitForRealtimeAuthReady(supabase);
  if (channel || listeners.size === 0) return;
  channel = supabase
    .channel("chat-unread-nav")
    .on<Record<string, unknown>>(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      handleInsert,
    )
    .subscribe();
}

function teardown() {
  if (channel) {
    void getSupabase().removeChannel(channel);
  }
  channel = null;
}

/**
 * Shares a single Supabase Realtime channel and unread map across every
 * consumer (navbar chat indicator + chat sidebar instances). Reuses the same
 * unread counting as the chat pages: per-conversation counts bootstrapped from
 * the `get_unread_counts` RPC, then incremented live on message inserts.
 */
export function subscribeToChatUnread(userId: string, listener: Listener): () => void {
  if (currentUserId && currentUserId !== userId) {
    teardown();
    resetState();
  }
  if (!currentUserId) {
    currentUserId = userId;
  }
  listeners.add(listener);
  void bootstrap(userId);
  void ensureChannel();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      teardown();
      resetState();
      currentUserId = null;
    }
  };
}

/**
 * Marks a conversation as the one currently being read. Its stored unread is
 * cleared and future messages in it are not counted until it is set to null.
 */
export function setActiveConversation(conversationId: string | null) {
  let changed = activeConversationId !== conversationId;
  activeConversationId = conversationId;
  if (conversationId && (unreadMap[conversationId] ?? 0) > 0) {
    unreadMap = { ...unreadMap, [conversationId]: 0 };
    changed = true;
  }
  if (changed) notify();
}

/**
 * Clears the unread count for a single conversation. Used by the sidebar's
 * "Mark as seen" action so the dot disappears immediately without waiting for
 * a server round-trip.
 */
export function clearConversationUnread(conversationId: string) {
  if ((unreadMap[conversationId] ?? 0) === 0) return;
  unreadMap = { ...unreadMap, [conversationId]: 0 };
  notify();
}

export function useChatUnread(userId: string | null): ChatUnreadMap {
  const [map, setMap] = useState<ChatUnreadMap>(() => (userId ? { ...unreadMap } : {}));

  useEffect(() => {
    if (!userId) {
      setMap({});
      return;
    }
    setMap({ ...unreadMap });
    return subscribeToChatUnread(userId, () => setMap({ ...unreadMap }));
  }, [userId]);

  return map;
}