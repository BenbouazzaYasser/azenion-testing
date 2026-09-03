"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  CallEventType,
  IcePayload,
  OfferPayload,
  AnswerPayload,
  ScreenPayload,
} from "@/lib/call/types";

export interface CallEventRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  call_id: string;
  event_type: CallEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Thin, typed wrapper around the call_events signaling table.
 *
 * All signaling travels through Supabase's existing realtime infrastructure
 * (the same publication used by chat), so it inherits the same RLS guarantees:
 * only conversation members can insert/read, and Realtime refuses to deliver
 * to non-members. Actual audio/video never touches the database.
 */
export const callSignaling = {
  _currentUserId: null as string | null,
  _userIdPromise: null as Promise<string | null> | null,
  _getCurrentUserId(): Promise<string | null> {
    if (this._currentUserId) return Promise.resolve(this._currentUserId);
    if (!this._userIdPromise) {
      this._userIdPromise = createClient()
        .auth.getUser()
        .then(({ data }) => {
          this._currentUserId = data.user?.id ?? null;
          return this._currentUserId;
        })
        .catch(() => null);
    }
    return this._userIdPromise;
  },

  /**
   * Thin, typed wrapper around the call_events signaling table.
   *
   * All signaling travels through Supabase's existing realtime infrastructure
   * (the same publication used by chat), so it inherits the same RLS guarantees:
   * only conversation members can insert/read, and Realtime refuses to deliver
   * to non-members. Actual audio/video never touches the database.
   *
   * sender_id is always set to the authenticated user and is re-validated by
   * the INSERT policy (sender_id = auth.uid()), so clients cannot spoof another
   * user's identity.
   */
  async send(
    conversationId: string,
    callId: string,
    eventType: CallEventType,
    payload: Record<string, unknown>,
  ): Promise<{ error?: string }> {
    const supabase = createClient();
    const userId = await this._getCurrentUserId();
    if (!userId) return { error: "Not signed in." };
    const { error } = await supabase.from("call_events").insert({
      conversation_id: conversationId,
      sender_id: userId,
      call_id: callId,
      event_type: eventType,
      payload: payload as unknown as object,
    } as never);
    return error ? { error: error.message } : {};
  },

  sendOffer(
    conversationId: string,
    callId: string,
    payload: OfferPayload,
  ) {
    return this.send(conversationId, callId, "offer", payload as unknown as Record<string, unknown>);
  },

  sendAnswer(
    conversationId: string,
    callId: string,
    payload: AnswerPayload,
  ) {
    return this.send(conversationId, callId, "answer", payload as unknown as Record<string, unknown>);
  },

  sendIce(
    conversationId: string,
    callId: string,
    payload: IcePayload,
  ) {
    return this.send(conversationId, callId, "ice", payload as unknown as Record<string, unknown>);
  },

  sendDecline(conversationId: string, callId: string) {
    return this.send(conversationId, callId, "decline", {});
  },

  sendCancel(conversationId: string, callId: string) {
    return this.send(conversationId, callId, "cancel", {});
  },

  sendBusy(conversationId: string, callId: string) {
    return this.send(conversationId, callId, "busy", {});
  },

  sendEnd(conversationId: string, callId: string) {
    return this.send(conversationId, callId, "end", {});
  },

  sendScreen(
    conversationId: string,
    callId: string,
    payload: ScreenPayload,
  ) {
    return this.send(conversationId, callId, "screen", payload as unknown as Record<string, unknown>);
  },

  async getCallPeer(
    conversationId: string,
    userId: string,
  ): Promise<{ peer?: import("@/lib/call/types").CallPeer; error?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("get_call_peer", { p_conversation_id: conversationId, p_user_id: userId })
      .maybeSingle();
    if (error || !data) {
      return { error: error?.message ?? "Could not identify the caller." };
    }
    const row = data as { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
    return {
      peer: {
        id: row.id,
        full_name: row.full_name,
        username: row.username ?? row.id.slice(0, 8),
        avatar_url: row.avatar_url,
      },
    };
  },
};
