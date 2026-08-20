"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Listener = () => void;

interface RegisteredListener {
  userId: string;
  listener: Listener;
}

let supabase: ReturnType<typeof createClient> | null = null;
let channel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let nextListenerId = 0;
const listeners = new Map<number, RegisteredListener>();

function getSupabase() {
  if (!supabase) supabase = createClient();
  return supabase;
}

function handleInsert(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const row = payload.new as { user_id?: string | null } | null;
  if (!row?.user_id || row.user_id !== activeUserId) return;
  for (const { userId, listener } of listeners.values()) {
    if (userId === activeUserId) listener();
  }
}

function teardown() {
  if (channel) {
    void getSupabase().removeChannel(channel);
  }
  channel = null;
}

function ensureChannel() {
  if (channel || !activeUserId) return;
  channel = getSupabase()
    .channel(`notifications-unread-${activeUserId}`)
    .on<Record<string, unknown>>(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${activeUserId}`,
      },
      handleInsert,
    )
    .subscribe();
}

/**
 * Shares a single Supabase Realtime channel across every mounted
 * NotificationCenter (desktop + mobile navbar instances both render the
 * component at the same time). Each caller receives a callback for new
 * notifications inserted for `userId`, and the channel is torn down once the
 * last caller unsubscribes.
 */
export function subscribeToNotifications(userId: string, listener: Listener): () => void {
  const id = ++nextListenerId;
  listeners.set(id, { userId, listener });

  if (activeUserId && activeUserId !== userId) {
    teardown();
    activeUserId = userId;
  } else if (!activeUserId) {
    activeUserId = userId;
  }
  ensureChannel();

  return () => {
    listeners.delete(id);
    if (listeners.size === 0) {
      teardown();
      activeUserId = null;
    }
  };
}
