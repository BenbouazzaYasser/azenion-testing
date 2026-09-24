"use client";

import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, useSyncExternalStore } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { compressImageFile } from "@/lib/compress-image";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Users, Menu, Phone, Video } from "lucide-react";import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer, type ChatComposerHandle } from "@/components/chat/chat-composer";
import { createMemoryCache, mergeMessages, getCachedProfile, setCachedProfile, type ConversationSnapshot } from "@/lib/chat-cache";
import { uploadChatMediaBlob, uploadBatch, setUploadProgress, clearUploadProgress, type UploadFileInput, type UploadTaskResult, type UploadResult, type UploadError } from "@/components/chat/chat-upload";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import {
  sendMessage,
  sendMessageWithAttachments,
  markConversationRead,
  markMessagesReceived,
  loadOlderMessages,
} from "@/actions/chat.actions";
import { setActiveConversation } from "@/lib/chat-unread";
import { MessageStatus, type MessageStatusKind } from "@/components/chat/message-status";
import { formatDate } from "@/lib/date";
import { useMobileConversations } from "@/components/chat/mobile-conversations-context";
import type { ChatAttachmentForMessage } from "@/data/chat";
import {
  CHAT_IMAGE_MIMES,
  CHAT_FILE_MIMES,
  CHAT_MAX_IMAGE_SIZE,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_AUDIO_SIZE,
  CHAT_MAX_AUDIO_DURATION_SECONDS,
  CHAT_MEDIA_SIGNED_URL_TTL,
  getChatMediaObjectPath,
  sanitizeFilename,
} from "@/lib/chat-media";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { getCurrentUserProfile } from "@/lib/current-user-profile";
import Image from "next/image";
import type { GifResult } from "@/lib/gif/provider";
import type { Sticker as StickerType } from "@/lib/stickers/catalog";

// Above this many loaded messages the list switches to virtualization.
// Below it, plain DOM rows scroll natively — mixed-height chat rows make
// height estimates jitter, and the resulting scrollTop compensation writes
// are what make scrolling up feel like the page is being pulled down.
const VIRTUALIZE_THRESHOLD = 250;

// No external store: hydration flag via useSyncExternalStore.
const emptySubscribe = () => () => {};

interface Message {
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
  /** Client-only send pipeline state (retry queue — never persisted). */
  sendState?: "pending" | "failed";
  sendError?: string;
}

interface ChatConversationProps {
  conversationId: string;
  initialMessages: Message[];
  /** Whether older messages exist above the initial page. */
  initialHasMore?: boolean;
  currentUserId: string;
  amBlocked?: boolean;
  peer?: {
    id: string;
    full_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
}

type QueuedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
  _spoiler?: boolean;
  _tags?: string[];
};

/** Separate queues for images and files (like Haven) */
type ImageQueue = QueuedFile[];
type FileQueue = QueuedFile[];

/** Dispatch a request to the global CallProvider to start a call. */
export function requestCall(
  conversationId: string,
  kind: "audio" | "video",
  peer: ChatConversationProps["peer"],
  options?: { autoScreen?: boolean },
) {
  if (!peer?.id) {
    toast.error("This conversation partner is unavailable.");
    return;
  }
  window.dispatchEvent(
    new CustomEvent("azenion:call-request", {
      detail: {
        conversationId,
        peer: {
          id: peer.id,
          full_name: peer.full_name,
          username: peer.username,
          avatar_url: peer.avatar_url,
        },
        kind,
        autoScreen: options?.autoScreen ?? false,
      },
    }),
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDayLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return formatDate(dateStr);
}

function classifyFile(file: File): { type: "image" | "file"; valid: boolean; error?: string } {
  const mime = file.type;
  const size = file.size;
  const isImageMime = (CHAT_IMAGE_MIMES as readonly string[]).includes(mime);
  const isFileMime = (CHAT_FILE_MIMES as readonly string[]).includes(mime);
  // Fallback: treat any image/* as image for preview, but still validate allowlist
  if (isImageMime) {
    if (size > CHAT_MAX_IMAGE_SIZE) return { type: "image", valid: false, error: `Image too large (max ${Math.round(CHAT_MAX_IMAGE_SIZE / 1024 / 1024)}MB)` };
    return { type: "image", valid: true };
  }
  if (isFileMime) {
    if (size > CHAT_MAX_FILE_SIZE) return { type: "file", valid: false, error: `File too large (max ${Math.round(CHAT_MAX_FILE_SIZE / 1024 / 1024)}MB)` };
    return { type: "file", valid: true };
  }
  // Allow generic image/* that still might be in allowlist variation (e.g., heic) — if not in list, reject
  if (mime.startsWith("image/")) {
    return { type: "image", valid: false, error: `Image type ${mime} not supported` };
  }
  return { type: "file", valid: false, error: `File type ${mime} not supported` };
}

// Client-side per-conversation message cache (pillar 1), kept at module scope
// so it survives component remounts across SPA navigations. Switching back to
// a conversation in the same session renders its cached messages instantly and
// merges the fresh server page into the SAME render — no blank, no stale
// flash, no server-latency gate on revisits. (Store lives in lib/chat-cache.)
const conversationCache = createMemoryCache<string, ConversationSnapshot<Message>>();

export function ChatConversation({
  conversationId,
  initialMessages,
  initialHasMore = false,
  currentUserId,
  amBlocked = false,
  peer = null,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);
  /** Scroll metrics captured before a prepend (for pre-paint scroll anchoring). */
  const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [actionsMessageId, setActionsMessageId] = useState<string | null>(null);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  // Separate queues for images and files (like Haven)
  const [imageQueue, setImageQueue] = useState<ImageQueue>([]);
  const [fileQueue, setFileQueue] = useState<FileQueue>([]);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const conversationRef = useRef<HTMLDivElement>(null);
  // Imperative handle into the isolated composer leaf (draft lives there).
  const composerRef = useRef<ChatComposerHandle>(null);
  // Realtime batching: incoming INSERTs coalesce into one setMessages per frame.
  const realtimeBatchRef = useRef<Message[]>([]);
  const realtimeRafRef = useRef<number | null>(null);
  const lastMarkReceivedRef = useRef(0);
  // Snapshot of optimistically-deleted messages for revert-on-failure.
  const recentlyDeletedRef = useRef(new Map<string, Message>());

  // Virtualize the message list (only enabled past VIRTUALIZE_THRESHOLD):
  // render visible messages + dividers, plain DOM below the threshold.
  const virtualizer = useVirtualizer({
    enabled: messages.length > VIRTUALIZE_THRESHOLD,
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 72, // avg message height in px (measured dynamically)
    overscan: 12, // render 12 extra messages above/below viewport
    // Key measurements by message id — the default index keys misattribute
    // every cached height after a prepend, causing corrective jumps at the
    // top of the list.
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  // Compensate any row entirely above the viewport regardless of scroll
  // direction. The library default skips re-measures during upward scroll,
  // which visibly jumps the list while scrolling up. (Public instance field —
  // the options object doesn't accept it.)
  useLayoutEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) =>
      item.start + item.size <= (instance.scrollOffset ?? 0);
  }, [virtualizer]);

  const voice = useVoiceRecorder();

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });

  // Render-phase sync (same pattern as chat-sidebar): on conversationId change
  // the new thread's messages adopt in the same render cycle the new props
  // arrive — the old thread's content never paints, and draft/attachments/
  // read-state/scroll reset in one batched pass instead of a cascade of
  // per-switch effects. Cached conversations merge instantly (0ms).
  const [seenConvId, setSeenConvId] = useState(conversationId);
  if (seenConvId !== conversationId) {
    const leaving = seenConvId;
    if (leaving) {
      // messagesRef still holds the last committed list of the thread we're
      // leaving — snapshot it before adopting the next one.
      conversationCache.set(leaving, {
        messages: messagesRef.current,
        hasMore: hasMoreOlder,
      });
    }
    setSeenConvId(conversationId);
    const cached = conversationCache.get(conversationId);
    setMessages(cached ? mergeMessages(cached.messages, initialMessages) : initialMessages);
    setHasMoreOlder(initialHasMore);
    setImageQueue([]);
    setFileQueue([]);
    setActiveAttachmentId(null);
    setOtherLastReadAt(null);
    stickToBottomRef.current = true;
  }

  // The composer leaf is keyed by conversationId so switching threads remounts
  // it — draft, picker visibility and voice preview reset in one go. (The
  // imperative handle is used only for send-accept/restore, never in render.)

  // Own profile for optimistic sends. Seeded synchronously from any own
  // message already in history (sender is embedded), then warmed from the
  // shared one-flight fetch — so inserting an optimistic message never
  // awaits a profiles round trip. `ownProfileRef` is a ref, not state: the
  // send handlers don't need to re-render when it fills in.
  const ownProfileRef = useRef<Message["sender"]>(null);
  useEffect(() => {
    const seeded = initialMessages.find((m) => m.sender_id === currentUserId)?.sender ?? null;
    if (seeded) ownProfileRef.current = seeded;
    void getCurrentUserProfile().then((profile) => {
      if (profile && profile.id === currentUserId) ownProfileRef.current = profile;
    });
  }, [initialMessages, currentUserId]);

  // Infinite scroll: fetch one older page (keyset on the oldest loaded
  // message) and anchor the viewport back to the previously-first message.
  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current) return;
    const oldest = messagesRef.current[0];
    if (!oldest?.created_at) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await loadOlderMessages(conversationId, oldest.created_at, oldest.id);
      setHasMoreOlder(page.hasMore);
      if (page.messages.length > 0) {
        const el = scrollContainerRef.current;
        prependAnchorRef.current = el
          ? { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop }
          : null;
        setMessages((prev) => [...page.messages, ...prev]);
      }
    } catch {
      // Silent — scrolling to the top again retries.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [conversationId]);

  // Pre-paint scroll anchoring across a prepend: content above grew, so
  // shift scrollTop by exactly that delta — the viewport never visibly
  // moves, and there is no post-paint frame to see. Estimate-based for
  // rows not yet rendered; the virtualizer's first-measure adjustments
  // correct the residual as they measure.
  useLayoutEffect(() => {
    const anchor = prependAnchorRef.current;
    if (!anchor) return;
    prependAnchorRef.current = null;
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = anchor.scrollTop + (el.scrollHeight - anchor.scrollHeight);
  }, [messages]);

  // Stable identity so MessageBubble's memo isn't defeated.
  const removeMessageById = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const removed = prev.find((m) => m.id === id);
        if (removed) {
          // Keep a snapshot so an optimistic delete can be reverted if the
          // server call fails (bounded — 30 deleted messages max per session).
          if (recentlyDeletedRef.current.size >= 30) {
            const oldest = recentlyDeletedRef.current.keys().next().value;
            if (oldest) recentlyDeletedRef.current.delete(oldest);
          }
          recentlyDeletedRef.current.set(id, removed);
        }
        return prev.filter((m) => m.id !== id);
      });
    },
    [],
  );

  // Re-insert a message whose optimistic delete failed on the server.
  const restoreMessage = useCallback((id: string) => {
    const msg = recentlyDeletedRef.current.get(id);
    if (!msg) return;
    recentlyDeletedRef.current.delete(id);
    setMessages((prev) => {
      if (prev.some((m) => m.id === id)) return prev;
      const next = [...prev, msg];
      return next.sort((x, y) => (x.created_at ?? "").localeCompare(y.created_at ?? ""));
    });
  }, []);

  const refetchMessages = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, image_url, created_at, edited_at, received_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (msgs) {
        const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
        const [{ data: profiles }, { data: attachments }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url, username").in("id", senderIds),
          supabase
            .from("chat_message_attachments")
            .select("id, message_id, conversation_id, uploader_id, type, storage_path, filename, mime_type, file_size, duration_seconds, provider, external_id, metadata, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true }),
        ]);
        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        const attachmentsByMessage = new Map<string, ChatAttachmentForMessage[]>();
        if (attachments && attachments.length > 0) {
          const admin = createClient();
          const withUrls = await Promise.all(
            (attachments as ChatAttachmentForMessage[]).map(async (att) => {
              let signedUrl: string | null = null;
              if (att.storage_path) {
                const { data } = await admin.storage.from("chat-media").createSignedUrl(att.storage_path, CHAT_MEDIA_SIGNED_URL_TTL);
                signedUrl = data?.signedUrl ?? null;
              }
              return { ...att, signedUrl };
            }),
          );
          for (const att of withUrls) {
            const arr = attachmentsByMessage.get(att.message_id) ?? [];
            arr.push(att);
            attachmentsByMessage.set(att.message_id, arr);
          }
        }
        setMessages((msgs) =>
          msgs.map((m) => ({
            ...m,
            sender: profileMap.get(m.sender_id) ?? null,
            attachments: attachmentsByMessage.get(m.id) ?? [],
          })),
        );
      }
    } catch {
      // Silent failure; existing messages remain
    }
  }, [conversationId]);

  useEffect(() => {
    // One round trip: read receipt + received receipts + peer read-at.
    void markConversationRead(conversationId).then((result) => {
      if ("otherLastReadAt" in result && result.otherLastReadAt) {
        setOtherLastReadAt(result.otherLastReadAt);
      }
    });
    setActiveConversation(conversationId);
    stickToBottomRef.current = true;
    setOtherLastReadAt(null);
    return () => setActiveConversation(null);
  }, [conversationId]);

  // Row structure (day dividers/avatar grouping) comes from getDayLabel,
  // which uses local timezone, locale, and `new Date()` — the server renders
  // in UTC and cannot reproduce the client's answer, and the divergence is
  // structural (element present/absent), which suppressHydrationWarning
  // cannot fix. Server snapshot false / client snapshot true: SSR HTML and
  // the hydration render both show no rows, then they fill in.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages, imageQueue, fileQueue, hydrated]);

  const rafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    // Synchronously: any upward scroll drops bottom-sticking before the rAF
    // runs, so an incoming message can never yank the viewport down
    // mid-gesture.
    if (el) {
      if (el.scrollTop < lastScrollTopRef.current) {
        stickToBottomRef.current = false;
      }
      lastScrollTopRef.current = el.scrollTop;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 160;
      // Near the top with older pages remaining → fetch them.
      if (hasMoreOlder && el.scrollTop < 200 && !loadingOlderRef.current) {
        void loadOlder();
      }
    });
  }, [hasMoreOlder, loadOlder]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (conversationRef.current && !conversationRef.current.contains(e.target as Node)) {
        setActiveMessageId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleBlur(e: React.FocusEvent) {
    if (conversationRef.current && !conversationRef.current.contains(e.relatedTarget as Node)) {
      setActiveMessageId(null);
    }
  }

  // Cleanup object URLs on unmount only — per-change cleanup revokes blobs
  // still referenced by optimistic messages mid-send.
  const queueRef = useRef({ imageQueue, fileQueue });
  useEffect(() => {
    queueRef.current = { imageQueue, fileQueue };
  });
  useEffect(() => {
    return () => {
      queueRef.current.imageQueue.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
      queueRef.current.fileQueue.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Ignore own messages — already handled via optimistic reconciliation.
          if (newMsg.sender_id === currentUserId) return;

          // Pillar 5: render the inbound message instantly with zero
          // round-trips. In a 1:1 DM the sender is always `peer` (in props);
          // the one-flight profile cache covers any other sender.
          let sender: Message["sender"] = null;
          if (peer?.id && newMsg.sender_id === peer.id) {
            sender = peer;
          } else {
            sender = getCachedProfile(newMsg.sender_id) ?? null;
            if (!sender) {
              try {
                const { data } = await supabase
                  .from("profiles")
                  .select("id, full_name, avatar_url, username")
                  .eq("id", newMsg.sender_id)
                  .single();
                if (data) setCachedProfile(data);
                sender = data ?? null;
              } catch {
                sender = null;
              }
            }
          }

          // Batch: rapid incoming messages coalesce into ONE setMessages per
          // animation frame (dedupe by id guards re-subscribe replays).
          realtimeBatchRef.current.push({ ...newMsg, sender, attachments: [] });
          if (realtimeRafRef.current == null) {
            realtimeRafRef.current = requestAnimationFrame(() => {
              realtimeRafRef.current = null;
              const batch = realtimeBatchRef.current;
              realtimeBatchRef.current = [];
              if (batch.length === 0) return;
              setMessages((prev) => {
                const existing = new Set(prev.map((m) => m.id));
                const fresh = batch.filter((m) => !existing.has(m.id));
                return fresh.length > 0 ? [...prev, ...fresh] : prev;
              });
            });
          }

          // Read-receipt RPC is throttled, not fired per message.
          const now = Date.now();
          if (now - lastMarkReceivedRef.current > 1500) {
            lastMarkReceivedRef.current = now;
            void markMessagesReceived(conversationId);
          }

          // Attachments enrich asynchronously AFTER the message renders, so
          // an inbound message never waits on a storage round-trip to appear.
          try {
            const { data: rows } = await supabase
              .from("chat_message_attachments")
              .select("id, message_id, conversation_id, uploader_id, type, storage_path, filename, mime_type, file_size, duration_seconds, provider, external_id, metadata, created_at")
              .eq("message_id", newMsg.id);
            if (rows && rows.length > 0) {
              const attachments = await Promise.all(
                (rows as ChatAttachmentForMessage[]).map(async (att) => {
                  if (!att.storage_path) return { ...att, signedUrl: null };
                  const { data } = await supabase.storage.from("chat-media").createSignedUrl(att.storage_path, CHAT_MEDIA_SIGNED_URL_TTL);
                  return { ...att, signedUrl: data?.signedUrl ?? null };
                }),
              );
              setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, attachments } : m)));
            }
          } catch {
            // ignore — attachments fail silently; the message text already rendered
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? {
                    ...m,
                    content: row.content,
                    edited_at: row.edited_at,
                    received_at: row.received_at,
                  }
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Peer deleted a message — remove it locally (replica identity full
          // on messages means payload.old carries the row).
          const oldRow = payload.old as { id?: string };
          if (oldRow.id) {
            setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    const readChannel = supabase
      .channel(`chat-read:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; last_read_at: string | null };
          if (row.user_id !== currentUserId) {
            setOtherLastReadAt(row.last_read_at ?? null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(readChannel);
      // Drop any in-flight batched inserts — they belonged to the thread
      // we're leaving and will be re-fetched on its next open.
      if (realtimeRafRef.current != null) {
        cancelAnimationFrame(realtimeRafRef.current);
        realtimeRafRef.current = null;
      }
      realtimeBatchRef.current = [];
    };
  }, [conversationId, currentUserId, peer]);

  const participant = useMemo(() => {
    const other = initialMessages.find((m) => m.sender_id !== currentUserId);
    return other?.sender ?? null;
  }, [initialMessages, currentUserId]);

  const otherReadTs = otherLastReadAt ? new Date(otherLastReadAt).getTime() : null;

  const lastSeenOwnIndex = useMemo(() => {
    if (otherReadTs == null) return -1;
    let anchor = -1;
    messages.forEach((msg, i) => {
      if (msg.sender_id !== currentUserId) return;
      const ts = msg.created_at ? new Date(msg.created_at).getTime() : null;
      if (ts != null && ts <= otherReadTs) anchor = i;
    });
    return anchor;
  }, [messages, otherReadTs, currentUserId]);

  const getMessageStatus = useCallback(
    (msg: Message, index: number): MessageStatusKind | null => {
      if (msg.sender_id !== currentUserId) return null;
      const ts = msg.created_at ? new Date(msg.created_at).getTime() : null;
      const isSeen = ts !== null && otherReadTs !== null && ts <= otherReadTs;
      if (isSeen) return index === lastSeenOwnIndex ? "seen" : null;
      if (msg.received_at) return "received";
      return "sent";
    },
    [currentUserId, otherReadTs, lastSeenOwnIndex],
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    
    // Calculate total queued across both queues
    const totalQueued = imageQueue.length + fileQueue.length;
    const remainingSlots = 10 - totalQueued;
    
    if (remainingSlots <= 0) {
      toast.error("Too many files. Max 10 per message.");
      return;
    }
    
    const nextImages: QueuedFile[] = [];
    const nextFiles: QueuedFile[] = [];
    
    for (const file of list.slice(0, remainingSlots)) {
      const cls = classifyFile(file);
      if (!cls.valid) {
        toast.error(cls.error ?? "Unsupported file type");
        continue;
      }
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      const queuedFile: QueuedFile = {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        status: "queued",
        _spoiler: false,
        _tags: [],
      };

      if (file.type.startsWith("image/")) {
        nextImages.push(queuedFile);
        // Background compression: preview already shows the original blob URL;
        // swap the queued file for the downscaled WebP when it's ready. If it
        // never lands, the upload falls back to the original — never blocks.
        void compressImageFile(file).then((compressed) => {
          if (compressed === file) return;
          setImageQueue((prev) =>
            prev.map((q) => (q.id === queuedFile.id ? { ...q, file: compressed } : q)),
          );
        });
      } else {
        nextFiles.push(queuedFile);
      }
    }
    
    if (nextImages.length > 0) {
      setImageQueue((prev) => [...prev, ...nextImages]);
      // Set first image as active for tagging
      const first = nextImages[0];
      if (first) setActiveAttachmentId(first.id);
    }
    if (nextFiles.length > 0) {
      setFileQueue((prev) => [...prev, ...nextFiles]);
      // Only set active if no images
      if (nextImages.length === 0) {
        const first = nextFiles[0];
        if (first) setActiveAttachmentId(first.id);
      }
    }
  }, [imageQueue.length, fileQueue.length]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const removeQueued = useCallback(
    (id: string) => {
      clearUploadProgress(id);
      // Remove from whichever queue contains it
      setImageQueue((prev) => {
        const item = prev.find((q) => q.id === id);
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        return prev.filter((q) => q.id !== id);
      });
      setFileQueue((prev) => {
        const item = prev.find((q) => q.id === id);
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        return prev.filter((q) => q.id !== id);
      });
      // Clear active if removed
      if (activeAttachmentId === id) {
        setActiveAttachmentId(null);
      }
    },
    [activeAttachmentId],
  );

  const clearImageQueue = useCallback(() => {
    imageQueue.forEach((q) => clearUploadProgress(q.id));
    setImageQueue((prev) => {
      prev.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
      return [];
    });
  }, [imageQueue]);

  const clearFileQueue = useCallback(() => {
    fileQueue.forEach((q) => clearUploadProgress(q.id));
    setFileQueue((prev) => {
      prev.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
      return [];
    });
  }, [fileQueue]);

  const clearAllAttachments = useCallback(() => {
    clearImageQueue();
    clearFileQueue();
    setActiveAttachmentId(null);
  }, [clearImageQueue, clearFileQueue]);

  const toggleSpoiler = useCallback((id: string) => {
    setImageQueue((prev) => prev.map((q) => (q.id === id ? { ...q, _spoiler: !q._spoiler } : q)));
    setFileQueue((prev) => prev.map((q) => (q.id === id ? { ...q, _spoiler: !q._spoiler } : q)));
  }, []);

  const addTagToAttachment = useCallback((id: string, tag: string) => {
    const clean = tag.trim().slice(0, 20);
    if (!clean) return;
    const apply = (q: QueuedFile) => {
      if (q.id !== id) return q;
      const tags = q._tags ?? [];
      if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return q;
      if (tags.length >= 3) {
        toast.error("Max 3 tags per attachment");
        return q;
      }
      return { ...q, _tags: [...tags, clean] };
    };
    setImageQueue((prev) => prev.map(apply));
    setFileQueue((prev) => prev.map(apply));
  }, []);

  const removeTagFromAttachment = useCallback((id: string, tag: string) => {
    const strip = (q: QueuedFile) =>
      q.id === id ? { ...q, _tags: (q._tags ?? []).filter((t) => t !== tag) } : q;
    setImageQueue((prev) => prev.map(strip));
    setFileQueue((prev) => prev.map(strip));
  }, []);

  const retryQueued = useCallback(
    async (id: string) => {
      // Find in either queue
      const q = imageQueue.find((x) => x.id === id) || fileQueue.find((x) => x.id === id);
      if (!q || q.status !== "error") return;

      const updateStatus = (status: QueuedFile["status"], error?: string) => {
        setImageQueue((prev) => prev.map((x) => (x.id === id ? { ...x, status, error } : x)));
        setFileQueue((prev) => prev.map((x) => (x.id === id ? { ...x, status, error } : x)));
      };

      updateStatus("uploading");
      setUploadProgress(id, 0);

      try {
        const attachmentId = q.id;
        const safeName = sanitizeFilename(q.file.name);
        const path = getChatMediaObjectPath(conversationId, attachmentId, safeName);

        const results = await uploadBatch(
          [{
            id: q.id,
            path,
            blob: q.file,
            mimeType: q.file.type || "application/octet-stream",
          }],
          (_, progress) => setUploadProgress(id, Math.round(progress.percentage)),
        );

        const result = results[0];
        if (!result || "error" in result) {
          updateStatus("error", result?.error ?? "Retry failed");
          toast.error(`Retry failed: ${result?.error ?? "Unknown error"}`);
        } else {
          updateStatus("success");
          setUploadProgress(id, 100);
          clearUploadProgress(id);
        }
      } catch {
        updateStatus("error", "Retry failed");
        toast.error("Retry failed");
      }
    },
    [imageQueue, fileQueue, conversationId],
  );

  const handleGifSelect = useCallback(
    async (gif: GifResult, content: string) => {
      if (isSendingRef.current) return;
      if (imageQueue.length > 0 || fileQueue.length > 0) {
        toast.error("Please send or remove attached files before sending a GIF");
        return;
      }
      if (voice.isRecording || voice.blob) {
        toast.error("Finish or cancel voice recording before sending GIF");
        return;
      }
      // Client-side domain check (server re-validates)
      try {
        const host = new URL(gif.url).hostname.toLowerCase();
        const allowed = [
          "giphy.com",
          "media.giphy.com",
          "media0.giphy.com",
          "media1.giphy.com",
          "media2.giphy.com",
          "media3.giphy.com",
          "media4.giphy.com",
          "i.giphy.com",
          "tenor.com",
          "media.tenor.com",
        ];
        const ok = allowed.some((h) => host === h || host.endsWith(`.${h}`));
        if (!ok) {
          toast.error("Invalid GIF provider");
          return;
        }
      } catch {
        toast.error("Invalid GIF");
        return;
      }

      isSendingRef.current = true;
      setIsSending(true);

      const profile: Message["sender"] = ownProfileRef.current ?? {
        id: currentUserId,
        full_name: null,
        avatar_url: null,
        username: "",
      };

      const gifAtt: ChatAttachmentForMessage = {
        id: crypto.randomUUID(),
        message_id: "optimistic",
        conversation_id: conversationId,
        uploader_id: currentUserId,
        type: "gif",
        storage_path: null,
        filename: null,
        mime_type: null,
        file_size: null,
        duration_seconds: null,
        provider: gif.provider,
        external_id: gif.id,
        metadata: {
          url: gif.url,
          previewUrl: gif.previewUrl,
          title: gif.title,
          width: gif.width,
          height: gif.height,
        } as Record<string, unknown>,
        created_at: new Date().toISOString(),
        signedUrl: null,
      };

      const optimistic: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        image_url: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        received_at: null,
        sender: profile,
        attachments: [gifAtt],
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const result = await sendMessageWithAttachments(conversationId, content, [
          {
            type: "gif",
            provider: gif.provider,
            external_id: gif.id,
            metadata: {
              url: gif.url,
              previewUrl: gif.previewUrl,
              title: gif.title,
              width: gif.width,
              height: gif.height,
            },
          } as unknown as import("@/actions/chat.actions").SendMessageAttachmentInput,
        ]);

        if (result && "error" in result && result.error) {
          // Retry queue: keep the optimistic message marked failed so the
          // user can retry in place instead of re-picking the GIF.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? { ...m, sendState: "failed" as const, sendError: result.error as string }
                : m,
            ),
          );
          // Reconcile with the server in case the insert actually landed.
          setTimeout(() => void refetchMessages(), 500);
          toast.error(result.error);
        } else if (result && "success" in result && result.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? {
                    ...m,
                    id: result.id as string,
                    created_at: (result.created_at as string) ?? m.created_at,
                    attachments: [{ ...gifAtt, message_id: result.id as string }],
                  }
                : m,
            ),
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? { ...m, sendState: "failed" as const, sendError: "GIF could not be sent." }
              : m,
          ),
        );
        setTimeout(() => void refetchMessages(), 500);
        toast.error("GIF could not be sent.");
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
        void markConversationRead(conversationId);
      }
    },
    [imageQueue.length, fileQueue.length, voice, conversationId, currentUserId, refetchMessages],
  );

  const handleStickerSelect = useCallback(
    async (sticker: StickerType, content: string) => {
      if (isSendingRef.current) return;
      if (imageQueue.length > 0 || fileQueue.length > 0) {
        toast.error("Please send or remove attached files before sending a sticker");
        return;
      }
      if (voice.isRecording || voice.blob) {
        toast.error("Finish or cancel voice recording before sending sticker");
        return;
      }
      isSendingRef.current = true;
      setIsSending(true);

      const profile: Message["sender"] = ownProfileRef.current ?? {
        id: currentUserId,
        full_name: null,
        avatar_url: null,
        username: "",
      };

      const stickerAtt: ChatAttachmentForMessage = {
        id: crypto.randomUUID(),
        message_id: "optimistic",
        conversation_id: conversationId,
        uploader_id: currentUserId,
        type: "sticker",
        storage_path: null,
        filename: null,
        mime_type: null,
        file_size: null,
        duration_seconds: null,
        provider: "local",
        external_id: sticker.id,
        metadata: {
          url: sticker.url,
          packId: sticker.packId,
          name: sticker.name,
          width: sticker.width,
          height: sticker.height,
        } as Record<string, unknown>,
        created_at: new Date().toISOString(),
        signedUrl: null,
      };

      const optimistic: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        image_url: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        received_at: null,
        sender: profile,
        attachments: [stickerAtt],
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const result = await sendMessageWithAttachments(conversationId, content, [
          {
            type: "sticker",
            provider: "local",
            external_id: sticker.id,
            metadata: {
              url: sticker.url,
              packId: sticker.packId,
              name: sticker.name,
              width: sticker.width,
              height: sticker.height,
            },
          } as unknown as import("@/actions/chat.actions").SendMessageAttachmentInput,
        ]);

        if (result && "error" in result && result.error) {
          // Retry queue: keep the optimistic message marked failed so the
          // user can retry in place instead of re-picking the sticker.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? { ...m, sendState: "failed" as const, sendError: result.error as string }
                : m,
            ),
          );
          // Reconcile with the server in case the insert actually landed.
          setTimeout(() => void refetchMessages(), 500);
          toast.error(result.error);
        } else if (result && "success" in result && result.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? {
                    ...m,
                    id: result.id as string,
                    created_at: (result.created_at as string) ?? m.created_at,
                    attachments: [{ ...stickerAtt, message_id: result.id as string }],
                  }
                : m,
            ),
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? { ...m, sendState: "failed" as const, sendError: "Sticker could not be sent." }
              : m,
          ),
        );
        setTimeout(() => void refetchMessages(), 500);
        toast.error("Sticker could not be sent.");
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
        void markConversationRead(conversationId);
      }
    },
    [imageQueue.length, fileQueue.length, voice, conversationId, currentUserId, refetchMessages],
  );

  // Voice helpers
  const handleMicClick = async () => {
    if (voice.isRecording) {
      voice.stop();
      return;
    }
    if (voice.blob) return;
    if (!voice.isSupported) {
      toast.error("Voice messages are not supported in this browser.");
      return;
    }
    if (imageQueue.length > 0 || fileQueue.length > 0) {
      toast.error("Please send or remove attached files before recording.");
      return;
    }
    const err = await voice.start();
    if (err) toast.error(err);
  };

  const handleCancelVoice = () => {
    voice.cancel();
  };

  const handleDiscardVoice = () => {
    voice.clear();
  };

  const handleSendVoice = async () => {
    if (!voice.blob || !voice.previewUrl || isSendingRef.current) return;
    const blob = voice.blob;
    if (blob.size > CHAT_MAX_AUDIO_SIZE) {
      toast.error(`Voice message too large (max ${Math.round(CHAT_MAX_AUDIO_SIZE / 1024 / 1024)}MB)`);
      return;
    }
    const dur = voice.duration > 0 ? voice.duration : Math.round(blob.size / 4000); // fallback 32kbps Opus
    if (dur > CHAT_MAX_AUDIO_DURATION_SECONDS) {
      toast.error(`Voice message too long (max ${CHAT_MAX_AUDIO_DURATION_SECONDS}s)`);
      return;
    }
    isSendingRef.current = true;
    setIsSending(true);
    const profile: Message["sender"] = ownProfileRef.current ?? {
      id: currentUserId,
      full_name: null,
      avatar_url: null,
      username: "",
    };
    const supabase = createClient();

    const attachmentId = crypto.randomUUID();
    const mime = voice.mimeType ?? blob.type ?? "audio/webm";
    const ext = mime.includes("wav") ? "wav" : mime.includes("aac") ? "aac" : mime.includes("m4a") || mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : "webm";
    const filename = `voice-message.${ext}`;
    const path = getChatMediaObjectPath(conversationId, attachmentId, filename);

    // Create a separate object URL for optimistic rendering so revoking the recorder's preview doesn't break it
    const optimisticPreviewUrl = URL.createObjectURL(blob);
    const optimisticVoiceAtt: ChatAttachmentForMessage = {
      id: attachmentId,
      message_id: "optimistic",
      conversation_id: conversationId,
      uploader_id: currentUserId,
      type: "audio",
      storage_path: path,
      filename,
      mime_type: mime,
      file_size: blob.size,
      duration_seconds: dur,
      provider: null,
      external_id: null,
      metadata: null,
      created_at: new Date().toISOString(),
      signedUrl: optimisticPreviewUrl,
    };

    const optimistic: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: "",
      image_url: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      received_at: null,
      sender: profile,
      attachments: [optimisticVoiceAtt],
    };
    setMessages((prev) => [...prev, optimistic]);

    let committed = false;
    try {
      const { error: upErr } = await uploadChatMediaBlob(path, blob, mime);
      if (upErr) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        URL.revokeObjectURL(optimisticPreviewUrl);
        toast.error(upErr);
        return;
      }

      const result = await sendMessageWithAttachments(conversationId, "", [
        {
          type: "audio",
          storage_path: path,
          filename,
          mime_type: mime,
          file_size: blob.size,
          duration_seconds: dur,
        },
      ]);

      if (result && "error" in result && result.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        URL.revokeObjectURL(optimisticPreviewUrl);
        toast.error(result.error);
        await supabase.storage.from("chat-media").remove([path]).catch(() => {});
      } else if (result && "success" in result && result.id) {
        committed = true;
        // Swap the local blob preview for a real signed URL, then free the blob.
        const { data: signed } = await supabase.storage
          .from("chat-media")
          .createSignedUrl(path, CHAT_MEDIA_SIGNED_URL_TTL);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? {
                  ...m,
                  id: result.id as string,
                  created_at: (result.created_at as string) ?? m.created_at,
                  attachments: [{ ...optimisticVoiceAtt, message_id: result.id as string, signedUrl: signed?.signedUrl ?? optimisticVoiceAtt.signedUrl }],
                }
              : m,
          ),
        );
        if (signed?.signedUrl) URL.revokeObjectURL(optimisticPreviewUrl);
        voice.clear();
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      URL.revokeObjectURL(optimisticPreviewUrl);
      // Don't orphan an uploaded object when the DB insert throws.
      if (!committed) {
        await supabase.storage.from("chat-media").remove([path]).catch(() => {});
      }
      toast.error("Voice message could not be sent.");
    } finally {
      isSendingRef.current = false;
    setIsSending(false);
      void markConversationRead(conversationId);
    }
  };

  const handleSend = async (content: string) => {
    const hasText = content.trim().length > 0;
    const hasFiles = imageQueue.length > 0 || fileQueue.length > 0;
    if (isSendingRef.current) {
      // Race: the leaf cleared the draft before the ref's state flushed.
      composerRef.current?.restoreDraft(content);
      return;
    }
    if (!hasText && !hasFiles) return;

    // Validate queued files still valid (size check again)
    const allQueued = [...imageQueue, ...fileQueue];
    for (const q of allQueued) {
      if (q.status === "error") {
        toast.error("Please remove or retry failed files before sending");
        composerRef.current?.restoreDraft(content);
        return;
      }
    }

    isSendingRef.current = true;
    setIsSending(true);
    // Safety net: if isSending stays true for 60s, force-reset so the
    // composer is never permanently locked (e.g. a hung server action).
    const sendTimeout = setTimeout(() => {
      if (isSendingRef.current) {
        isSendingRef.current = false;
        setIsSending(false);
        toast.error("Sending took too long — please retry.");
      }
    }, 60_000);

    const supabase = createClient();
    const profile: Message["sender"] = ownProfileRef.current ?? {
      id: currentUserId,
      full_name: null,
      avatar_url: null,
      username: "",
    };

    // Prepare optimistic attachments with preview URLs
    const optimisticAttachments: ChatAttachmentForMessage[] = allQueued.map((q) => {
      const cls = classifyFile(q.file);
      return {
        id: q.id,
        message_id: "optimistic",
        conversation_id: conversationId,
        uploader_id: currentUserId,
        type: cls.type,
        storage_path: null,
        filename: q.file.name,
        mime_type: q.file.type,
        file_size: q.file.size,
        duration_seconds: null,
        provider: null,
        external_id: null,
        metadata:
          q._spoiler || (q._tags && q._tags.length > 0)
            ? {
                ...(q._spoiler ? { spoiler: true } : {}),
                ...(q._tags && q._tags.length > 0 ? { tags: q._tags } : {}),
              }
            : null,
        created_at: new Date().toISOString(),
        signedUrl: q.previewUrl,
      };
    });

    const optimistic: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      image_url: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      received_at: null,
      sender: profile,
      attachments: optimisticAttachments,
    };

    setMessages((prev) => [...prev, optimistic]);

    // Snapshot queued files for upload
    const toUpload = [...allQueued];
    // Mark uploading
    setImageQueue((prev) => prev.map((q) => ({ ...q, status: "uploading" as const })));
    setFileQueue((prev) => prev.map((q) => ({ ...q, status: "uploading" as const })));
    toUpload.forEach((q) => setUploadProgress(q.id, 0));

    let attachmentInputs: { type: "image" | "file"; storage_path: string; filename: string; mime_type: string; file_size: number; metadata: Record<string, unknown> | null }[] = [];
    let committed = false;
    try {
      if (toUpload.length > 0) {
        // Prepare upload inputs with deterministic paths
        const uploadInputs: UploadFileInput[] = toUpload.map((q) => {
          const attachmentId = q.id;
          const safeName = sanitizeFilename(q.file.name);
          const path = getChatMediaObjectPath(conversationId, attachmentId, safeName);
          return {
            id: q.id,
            path,
            blob: q.file,
            mimeType: q.file.type || "application/octet-stream",
          };
        });

        // Upload batch with concurrent limit (max 3) and progress tracking
        const uploadResults: UploadTaskResult[] = await uploadBatch(
          uploadInputs,
          (id, progress) => setUploadProgress(id, Math.round(progress.percentage)),
        );

        const failed = uploadResults.filter((r): r is UploadError => "error" in r);
        if (failed.length > 0) {
          // Remove optimistic message
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          // Update queue with errors
          setImageQueue((prev) =>
            prev.map((q) => {
              const f = failed.find((x) => x.id === q.id);
              return f ? { ...q, status: "error" as const, error: f.error } : q;
            }),
          );
          setFileQueue((prev) =>
            prev.map((q) => {
              const f = failed.find((x) => x.id === q.id);
              return f ? { ...q, status: "error" as const, error: f.error } : q;
            }),
          );
          toast.error(`Upload failed for ${failed.length} file(s)`);
          // Cleanup successful uploads to avoid orphans
          const succeeded = uploadResults.filter((r): r is UploadResult => !("error" in r));
          if (succeeded.length > 0) {
            const paths = succeeded.map((s) => s.storage_path);
            await supabase.storage.from("chat-media").remove(paths).catch(() => {});
          }
          return;
        }

        // All succeeded
        const succeeded = uploadResults as UploadResult[];
        attachmentInputs = succeeded.map((s, i) => {
          const q = toUpload.find((x) => x.id === s.id)!;
          const cls = classifyFile(q.file);
          const metadata: Record<string, unknown> | null =
            q._spoiler || (q._tags && q._tags.length > 0)
              ? {
                  ...(q._spoiler ? { spoiler: true } : {}),
                  ...(q._tags && q._tags.length > 0 ? { tags: q._tags } : {}),
                }
              : null;
          return {
            type: cls.type as "image" | "file",
            storage_path: s.storage_path,
            filename: s.filename,
            mime_type: s.mime_type,
            file_size: s.file_size,
            metadata,
          };
        });

        // Mark all as success in queue
        setImageQueue((prev) => prev.map((q) => ({ ...q, status: "success" as const })));
        setFileQueue((prev) => prev.map((q) => ({ ...q, status: "success" as const })));
      }

      // Clear queue optimistically (will be cleared on success)
      toUpload.forEach((q) => clearUploadProgress(q.id));
      setImageQueue([]);
      setFileQueue([]);
      setActiveAttachmentId(null);

      let result;
      if (attachmentInputs.length > 0) {
        result = await sendMessageWithAttachments(conversationId, content, attachmentInputs);
      } else {
        result = await sendMessage(conversationId, content);
      }

      if (result && "error" in result && result.error) {
        if (toUpload.length === 0) {
          // Pure-text failure → retry queue: keep the message marked failed
          // with Retry/Dismiss in the bubble (Discord model).
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? { ...m, sendState: "failed" as const, sendError: result.error as string }
                : m,
            ),
          );
        } else {
          // Blob send failure → drop the optimistic message and restore the
          // queues: the attachment queue already offers per-file Retry.
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          composerRef.current?.restoreDraft(content);
          setImageQueue(toUpload.filter((q) => q.file.type.startsWith("image/")).map((q) => ({ ...q, status: "queued" as const })));
          setFileQueue(toUpload.filter((q) => !q.file.type.startsWith("image/")).map((q) => ({ ...q, status: "queued" as const })));
        }
        toast.error(result.error);
        // Cleanup uploaded storage if DB insert failed (sendMessageWithAttachments already tries, but for safety)
        if (attachmentInputs.length > 0) {
          const paths = attachmentInputs.map((a) => a.storage_path);
          await supabase.storage.from("chat-media").remove(paths).catch(() => {});
        }
      } else if (result && "success" in result && result.id) {
        committed = true;
        // Reconcile optimistic id -> real id and swap blob previews for real
        // signed URLs so attachments don't point at revoked object URLs.
        const signedUrls = await Promise.all(
          attachmentInputs.map((a) =>
            supabase.storage
              .from("chat-media")
              .createSignedUrl(a.storage_path, CHAT_MEDIA_SIGNED_URL_TTL)
              .then(({ data }) => data?.signedUrl ?? null),
          ),
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? {
                  ...m,
                  id: result.id as string,
                  created_at: (result.created_at as string) ?? m.created_at,
                  attachments: optimisticAttachments.map((att, i) => ({
                    ...att,
                    message_id: result.id as string,
                    signedUrl: signedUrls[i] ?? att.signedUrl,
                  })),
                }
              : m,
          ),
        );
        // Free preview blobs only after real URLs are in place.
        if (signedUrls.every((u) => u !== null)) {
          toUpload.forEach((q) => {
            if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
          });
        }
      }
    } catch {
      if (toUpload.length === 0) {
        // Pure-text failure → retry queue.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? { ...m, sendState: "failed" as const, sendError: "Message could not be sent. Please try again." }
              : m,
          ),
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        composerRef.current?.restoreDraft(content);
        setImageQueue(toUpload.filter((q) => q.file.type.startsWith("image/")).map((q) => ({ ...q, status: "queued" as const })));
        setFileQueue(toUpload.filter((q) => !q.file.type.startsWith("image/")).map((q) => ({ ...q, status: "queued" as const })));
      }
      // Don't orphan uploaded objects when the send throws after upload.
      if (!committed && attachmentInputs.length > 0) {
        await supabase.storage
          .from("chat-media")
          .remove(attachmentInputs.map((a) => a.storage_path))
          .catch(() => {});
      }
      toast.error("Message could not be sent. Please try again.");
    } finally {
      clearTimeout(sendTimeout);
      isSendingRef.current = false;
      setIsSending(false);
      void markConversationRead(conversationId);
    }
  };

  const participantName = participant?.full_name ?? participant?.username ?? "Conversation";
  const participantInitial = (participant?.full_name?.[0] ?? participant?.username?.[0] ?? "?").toUpperCase();
  const mobileConversations = useMobileConversations();

  // ---- Retry queue (pillar 2) ----------------------------------------
  // A failed pure-text/GIF/sticker send stays in the list marked "failed"
  // instead of vanishing. Retry re-submits the same payload; Dismiss drops it.
  const retryFailedMessage = useCallback(
    async (msg: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, sendState: "pending" as const, sendError: undefined } : m)),
      );
      try {
        // Blob-backed attachments (files/voice) never take this path — they
        // restore the composer queue instead — but guard anyway.
        let result;
        if (msg.attachments.length > 0) {
          const hasBlob = msg.attachments.some((a) => a.storage_path);
          if (hasBlob) {
            toast.error("This message needs resending — please retype it.");
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, sendState: "failed" as const, sendError: "Blob attachments need resending." } : m)),
            );
            return;
          }
          result = await sendMessageWithAttachments(
            msg.conversation_id,
            msg.content,
            msg.attachments.map((a) => ({
              type: a.type as import("@/actions/chat.actions").SendMessageAttachmentInput["type"],
              storage_path: a.storage_path ?? null,
              filename: a.filename ?? null,
              mime_type: a.mime_type ?? null,
              file_size: a.file_size ?? null,
              duration_seconds: a.duration_seconds ?? null,
              provider: a.provider ?? null,
              external_id: a.external_id ?? null,
              metadata: (a.metadata as Record<string, unknown> | null) ?? null,
            })),
          );
        } else {
          result = await sendMessage(msg.conversation_id, msg.content);
        }

        if (result && "error" in result && result.error) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, sendState: "failed" as const, sendError: result.error as string } : m)),
          );
          toast.error(result.error);
          return;
        }
        if (!result || !("success" in result) || !result.id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, sendState: "failed" as const, sendError: "Retry failed." } : m)),
          );
          toast.error("Retry failed.");
          return;
        }
        // Reconciled: swap the temp id for the server id and drop the flag.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  id: result.id as string,
                  created_at: (result.created_at as string) ?? m.created_at,
                  sendState: undefined,
                  sendError: undefined,
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, sendState: "failed" as const, sendError: "Retry failed — try again." } : m)),
        );
        toast.error("Retry failed.");
      }
    },
    [],
  );

  const handleRetryFailed = useCallback(
    (id: string) => {
      const msg = messagesRef.current.find((m) => m.id === id);
      if (msg) void retryFailedMessage(msg);
    },
    [retryFailedMessage],
  );

  const handleDismissFailed = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ---- Optimistic edit (pillar 2) ------------------------------------
  // The bubble applies the edit locally before the server round-trip; this
  // updates the list, and a failed call reverts content + edited_at.
  const handleEdited = useCallback((id: string, content: string, restoreEditedAt: string | null) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              content,
              edited_at: restoreEditedAt !== null ? restoreEditedAt : new Date().toISOString(),
            }
          : m,
      ),
    );
  }, []);

  // Handle an inbound ?call=audio|video query param (from the conversation menu
  // or any deep link) by starting a call once the peer is known.
  const searchParams = useSearchParams();
  const callParam = searchParams.get("call");
  const handledCallParam = useRef<string | null>(null);
  useEffect(() => {
    if (amBlocked) return;
    if (!callParam) return;
    if (handledCallParam.current === callParam) return;
    if (!peer?.id) return;
    handledCallParam.current = callParam;
    if (callParam === "audio") {
      requestCall(conversationId, "audio", peer);
    } else if (callParam === "video") {
      requestCall(conversationId, "video", peer);
    } else if (callParam === "screen") {
      // Starting a call and immediately sharing the screen.
      requestCall(conversationId, "video", peer, { autoScreen: true });
    }
    // Only fire once.
  }, [callParam, peer, conversationId, amBlocked]);

  const isVirtualized = messages.length > VIRTUALIZE_THRESHOLD;

  // Precomputed row structure (day divider / avatar grouping / status) for
  // both the plain list and the virtualized list. Memoized so per-keystroke
  // renders don't redo date math per row (same pattern as channel-chat.tsx).
  const grouped = useMemo(
    () =>
      messages.map((msg, i) => {
        const prevMsg = messages[i - 1];
        const nextMsg = messages[i + 1];
        const label = getDayLabel(msg.created_at);
        const showDivider = label !== null && label !== getDayLabel(prevMsg?.created_at ?? null);
        const isGrouped = !!prevMsg && prevMsg.sender_id === msg.sender_id && !showDivider;
        const showAvatar =
          !nextMsg || nextMsg.sender_id !== msg.sender_id || getDayLabel(nextMsg.created_at) !== label;
        return { showDivider, label, isGrouped, showAvatar, status: getMessageStatus(msg, i) };
      }),
    [messages, getMessageStatus],
  );

  // Shared row body for both the plain list and the virtualized list:
  // day divider + spacing + message (index-based grouping logic).
  const renderRowContent = (msg: Message, i: number) => {
    const row = grouped[i];
    if (!row) return null;
    const { showDivider, label, isGrouped, showAvatar, status } = row;

    return (
      <>
        {showDivider && (
          <div className="flex items-center gap-3 py-2" role="separator" aria-label={label ?? undefined}>
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span suppressHydrationWarning className="rounded-full bg-void-900/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-normal text-ink-500 backdrop-blur-sm">
              {label}
            </span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
        )}

        <div className={getMessageSpacing(i, isGrouped)}>
          <MessageBubble
            id={msg.id}
            content={msg.content}
            created_at={msg.created_at}
            edited_at={msg.edited_at}
            sender_id={msg.sender_id}
            sender_name={msg.sender?.full_name ?? msg.sender?.username ?? null}
            sender_avatar={msg.sender?.avatar_url ?? null}
            isOwn={msg.sender_id === currentUserId}
            isGrouped={isGrouped}
            showAvatar={showAvatar}
            status={msg.sendState ? null : status}
            statusAvatarUrl={participant?.avatar_url ?? null}
            statusAvatarName={participantName}
            active={msg.id === activeMessageId}
            showActions={actionsMessageId === msg.id}
            attachments={msg.attachments}
            sendState={msg.sendState}
            sendError={msg.sendError}
            onSelect={(id) => {
              setActiveMessageId(id);
              setActionsMessageId(null);
            }}
            onToggleActions={(id) => {
              setActionsMessageId((prev) => (prev === id ? null : id));
              setActiveMessageId(id);
            }}
            onDeleted={removeMessageById}
            onRestore={restoreMessage}
            onEdited={handleEdited}
            onRetryFailed={handleRetryFailed}
            onDismissFailed={handleDismissFailed}
          />
        </div>
      </>
    );
  };

  return (
    <div
      ref={conversationRef}
      onBlur={handleBlur}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={handleDrop}
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border bg-void-950 px-4 py-3 sm:px-6">
        {mobileConversations ? (
          <button
            type="button"
            onClick={mobileConversations.open}
            aria-label="Open conversations"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors duration-200 ease-out hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 md:hidden"
          >
            <Menu size={18} />
          </button>
        ) : null}

        {participant?.avatar_url ? (
          <Image
            src={participant.avatar_url}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent-400/25 bg-accent text-sm font-semibold text-white">
            {participant ? participantInitial : <Users size={16} className="text-accent-300" />}
          </span>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-ink-50">{participantName}</h1>
          {participant?.username ? (
            <p className="truncate text-xs text-ink-500">@{participant.username}</p>
          ) : (
            <p className="text-xs text-ink-500">Private chat</p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!peer?.id || !!amBlocked}
              onClick={() => requestCall(conversationId, "audio", peer)}
              aria-label={`Start a voice call with ${participantName}`}
              title={`Start a voice call with ${participantName}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong text-ink-300 transition-colors duration-200 ease-out hover:border-accent-400/50 hover:bg-accent/[0.08] hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 disabled:pointer-events-none disabled:opacity-40"
            >
              <Phone size={16} />
            </button>
            <button
              type="button"
              disabled={!peer?.id || !!amBlocked}
              onClick={() => requestCall(conversationId, "video", peer)}
              aria-label={`Start a video call with ${participantName}`}
              title={`Start a video call with ${participantName}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong text-ink-300 transition-colors duration-200 ease-out hover:border-accent-400/50 hover:bg-accent/[0.08] hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60 disabled:pointer-events-none disabled:opacity-40"
            >
              <Video size={16} />
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-sm border border-accent-400/20 bg-accent/[0.06] px-2.5 py-1">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-medium uppercase tracking-normal text-accent-300">Private</span>
          </div>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn("relative z-10 flex-1 min-h-0 overflow-x-scroll overflow-y-auto px-2 pb-4 pt-2 sm:px-3", SCROLLBAR_CLASSES)}
      >
        {messages.length === 0 && imageQueue.length === 0 && fileQueue.length === 0 && (
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-surface text-accent-300">
              <MessageSquare size={26} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-ink-50">No messages yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-ink-400">Send a message to start the conversation.</p>
          </div>
        )}

        <div className="flex flex-col">
          {!hydrated ? null : isVirtualized ? (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const msg = messages[virtualRow.index];
                if (!msg) return null;
                return (
                  <div
                    key={msg.id}
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {renderRowContent(msg, virtualRow.index)}
                  </div>
                );
              })}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id}>{renderRowContent(msg, i)}</div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {loadingOlder && (
        <div
          role="status"
          className="absolute left-1/2 top-[76px] z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-border-strong bg-surface/95 px-3 py-1 text-xs text-ink-400 shadow-md"
        >
          Loading earlier messages…
        </div>
      )}

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-accent/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-accent bg-void-900/80 px-6 py-4 text-sm font-medium text-ink-50 shadow-lg">
            Drop files to attach
          </div>
        </div>
      )}

      <ChatComposer
        key={conversationId}
        ref={composerRef}
        participantName={participantName}
        participantUsername={participant?.username ?? null}
        amBlocked={amBlocked}
        voice={voice}
        isSending={isSending}
        imageQueue={imageQueue}
        fileQueue={fileQueue}
        activeAttachmentId={activeAttachmentId}
        onSendText={handleSend}
        onSendVoice={handleSendVoice}
        onMicClick={handleMicClick}
        onCancelVoice={handleCancelVoice}
        onDiscardVoice={handleDiscardVoice}
        onGifSelect={handleGifSelect}
        onStickerSelect={handleStickerSelect}
        onAddFiles={addFiles}
        onPaste={handlePaste}
        onRemoveQueued={removeQueued}
        onClearAll={clearAllAttachments}
        onSetActive={setActiveAttachmentId}
        onToggleSpoiler={toggleSpoiler}
        onAddTag={addTagToAttachment}
        onRemoveTag={removeTagFromAttachment}
        onRetryQueued={retryQueued}
      />
    </div>
  );
}

function getMessageSpacing(index: number, isGrouped: boolean) {
  if (index === 0) return "";
  return isGrouped ? "mt-1.5" : "mt-4";
}
