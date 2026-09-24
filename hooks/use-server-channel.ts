"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendChannelMessage } from "@/actions/server.actions";
import type { ChannelMessageWithSender } from "@/data/servers";
import {
  serverGateway,
  type ChannelCache,
  type ChannelCursor,
  type GatewayMessage,
  type GatewayStatus,
  type TypingUser,
} from "@/lib/server-gateway";

interface UseServerChannelOptions {
  channelId: string;
  currentUserId: string;
  initialMessages: ChannelMessageWithSender[];
  initialHasMore: boolean;
  initialCursor: ChannelCursor | null;
}

interface SendResult {
  temporaryId: string;
  error?: string;
}

export function useServerChannel({
  channelId,
  currentUserId,
  initialMessages,
  initialHasMore,
  initialCursor,
}: UseServerChannelOptions) {
  const [cache, setCache] = useState<ChannelCache>(() => {
    const cached = serverGateway.getChannel(channelId);
    if (cached.loaded && cached.messages.length > 0) return cached;
    return {
      messages: initialMessages.map((message) => ({ ...message, delivery: "sent" })),
      cursor: initialCursor,
      hasMore: initialHasMore,
      loaded: true,
    };
  });
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadingOlder = useRef(false);
  const [status, setStatus] = useState<GatewayStatus>(serverGateway.getStatus());
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>(serverGateway.getTyping(channelId));

  useEffect(() => {
    let active = true;
    const update = () => {
      if (!active) return;
      setCache(serverGateway.getChannel(channelId));
      setStatus(serverGateway.getStatus());
      setTypingUsers(serverGateway.getTyping(channelId));
    };

    serverGateway.connect(currentUserId);
    void serverGateway.hydrateChannel(channelId, initialMessages, initialHasMore, initialCursor);
    const unsubscribe = serverGateway.subscribe(update);
    update();

    return () => {
      active = false;
      unsubscribe();
    };
    // Initial server data is intentionally read only when the channel identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, currentUserId]);

  const loadOlder = useCallback(async () => {
    const cursor = serverGateway.getChannel(channelId).cursor;
    if (!cursor || loadingOlder.current || !serverGateway.getChannel(channelId).hasMore) return;
    loadingOlder.current = true;
    setIsLoadingOlder(true);
    try {
      await serverGateway.loadOlder(channelId, cursor);
    } finally {
      loadingOlder.current = false;
      setIsLoadingOlder(false);
    }
  }, [channelId]);

  const send = useCallback(
    async (content: string): Promise<SendResult> => {
      const trimmed = content.trim();
      if (!trimmed) return { temporaryId: "", error: "Message cannot be empty" };
      const temporaryId = serverGateway.appendOptimistic(channelId, currentUserId, trimmed);
      try {
        const result = await sendChannelMessage(channelId, trimmed);
        if (result.error) {
          serverGateway.markFailed(channelId, temporaryId, result.error);
          return { temporaryId, error: result.error };
        }
        const serverMessage: GatewayMessage = {
          id: result.id,
          channel_id: channelId,
          sender_id: currentUserId,
          content: trimmed,
          image_url: null,
          created_at: result.created_at ?? new Date().toISOString(),
          edited_at: null,
          sender: serverGateway.getProfile(currentUserId),
          delivery: "sent",
        };
        serverGateway.reconcile(channelId, temporaryId, serverMessage);
        return { temporaryId };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send message.";
        serverGateway.markFailed(channelId, temporaryId, message);
        return { temporaryId, error: message };
      }
    },
    [channelId, currentUserId],
  );

  const setTyping = useCallback(
    (typing: boolean) => serverGateway.setTyping(channelId, typing),
    [channelId],
  );

  return {
    ...cache,
    messages: cache.messages,
    status,
    typingUsers,
    isLoadingOlder,
    loadOlder,
    send,
    setTyping,
  };
}
