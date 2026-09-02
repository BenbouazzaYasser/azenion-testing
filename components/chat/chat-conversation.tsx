"use client";

import { Fragment, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Send, MessageSquare, Users, Menu, Ban, Paperclip, Mic, Square, Trash2, Play, Pause, Smile, Film } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "@/components/chat/message-bubble";
import { QueuedAttachmentCard } from "@/components/chat/chat-attachment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import {
  sendMessage,
  sendMessageWithAttachments,
  markConversationRead,
  markMessagesReceived,
  getConversationRecipientReadAt,
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
  getChatMediaObjectPath,
  sanitizeFilename,
} from "@/lib/chat-media";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { GifPicker } from "@/components/chat/gif-picker";
import type { GifResult } from "@/lib/gif/provider";

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
}

interface ChatConversationProps {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  amBlocked?: boolean;
}

type QueuedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "queued" | "uploading" | "error";
  error?: string;
};

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

export function ChatConversation({
  conversationId,
  initialMessages,
  currentUserId,
  amBlocked = false,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [actionsMessageId, setActionsMessageId] = useState<string | null>(null);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [queued, setQueued] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceRecorder();
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    void markConversationRead(conversationId);
    void markMessagesReceived(conversationId);
    setActiveConversation(conversationId);
    setOtherLastReadAt(null);
    void getConversationRecipientReadAt(conversationId).then(setOtherLastReadAt);
    return () => setActiveConversation(null);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, queued]);

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

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      queued.forEach((q) => {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
      });
    };
  }, [queued]);

  useEffect(() => {
    if (!showEmojiPicker && !showGifPicker) return;
    function handleOutside(e: MouseEvent) {
      if (
        (showEmojiPicker || showGifPicker) &&
        emojiContainerRef.current &&
        !emojiContainerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
        setShowGifPicker(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
        setShowGifPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showEmojiPicker, showGifPicker]);

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
          // Ignore own messages — already handled via optimistic reconciliation
          if (newMsg.sender_id === currentUserId) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, username")
            .eq("id", newMsg.sender_id)
            .single();

          void markMessagesReceived(conversationId);

          // Fetch attachments for this message (if any) — enrich via signed URLs client-side
          let attachments: ChatAttachmentForMessage[] = [];
          try {
            const { data: rows } = await supabase
              .from("chat_message_attachments")
              .select("id, message_id, conversation_id, uploader_id, type, storage_path, filename, mime_type, file_size, duration_seconds, provider, external_id, metadata, created_at")
              .eq("message_id", newMsg.id);
            if (rows && rows.length > 0) {
              attachments = await Promise.all(
                (rows as ChatAttachmentForMessage[]).map(async (att) => {
                  if (!att.storage_path) return { ...att, signedUrl: null };
                  const { data } = await supabase.storage.from("chat-media").createSignedUrl(att.storage_path, 60);
                  return { ...att, signedUrl: data?.signedUrl ?? null };
                }),
              );
            }
          } catch {
            // ignore
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, sender: profile, attachments }];
          });
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
    };
  }, [conversationId, currentUserId]);

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

  function getMessageStatus(msg: Message, index: number): MessageStatusKind | null {
    if (msg.sender_id !== currentUserId) return null;
    const ts = msg.created_at ? new Date(msg.created_at).getTime() : null;
    const isSeen = ts !== null && otherReadTs !== null && ts <= otherReadTs;
    if (isSeen) return index === lastSeenOwnIndex ? "seen" : null;
    if (msg.received_at) return "received";
    return "sent";
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (queued.length + list.length > 10) {
      toast.error("Too many files. Max 10 per message.");
      return;
    }
    const next: QueuedFile[] = [];
    for (const file of list) {
      const cls = classifyFile(file);
      if (!cls.valid) {
        toast.error(cls.error ?? "Unsupported file type");
        continue;
      }
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      next.push({ id: crypto.randomUUID(), file, previewUrl, status: "queued" });
    }
    if (next.length > 0) setQueued((prev) => [...prev, ...next]);
  }, [queued.length]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

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

  const removeQueued = (id: string) => {
    setQueued((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const retryQueued = async (id: string) => {
    setQueued((prev) => prev.map((q) => (q.id === id ? { ...q, status: "queued" as const, error: undefined } : q)));
  };

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = inputRef.current;
      if (!el) {
        setInput((prev) => prev + emoji);
        return;
      }
      const start = el.selectionStart ?? input.length;
      const end = el.selectionEnd ?? input.length;
      const next = input.slice(0, start) + emoji + input.slice(end);
      setInput(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + emoji.length;
        try {
          el.setSelectionRange(pos, pos);
        } catch {}
      });
    },
    [input],
  );

  const handleGifSelect = useCallback(
    async (gif: GifResult) => {
      setShowGifPicker(false);
      setShowEmojiPicker(false);
      if (isSending) return;
      if (queued.length > 0) {
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

      const content = input.trim();
      setInput("");
      setIsSending(true);
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .eq("id", currentUserId)
        .single();

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
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          toast.error(result.error);
          setInput(content);
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
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error("GIF could not be sent.");
        setInput(content);
      } finally {
        setIsSending(false);
        void markConversationRead(conversationId);
      }
    },
    [input, isSending, queued.length, voice, conversationId, currentUserId],
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
    if (queued.length > 0) {
      toast.error("Please send or remove attached files before recording.");
      return;
    }
    await voice.start();
    if (voice.error) toast.error(voice.error);
  };

  const handleCancelVoice = () => {
    voice.cancel();
    setIsPlayingPreview(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  };

  const handleDiscardVoice = () => {
    voice.clear();
    setIsPlayingPreview(false);
  };

  const togglePreviewPlayback = () => {
    const el = previewAudioRef.current;
    if (!el || !voice.previewUrl) return;
    if (isPlayingPreview) {
      el.pause();
    } else {
      el.play().catch(() => toast.error("Could not play preview"));
    }
  };

  const handleSendVoice = async () => {
    if (!voice.blob || !voice.previewUrl || isSending) return;
    const blob = voice.blob;
    if (blob.size > CHAT_MAX_AUDIO_SIZE) {
      toast.error(`Voice message too large (max ${Math.round(CHAT_MAX_AUDIO_SIZE / 1024 / 1024)}MB)`);
      return;
    }
    const dur = voice.duration > 0 ? voice.duration : Math.round(blob.size / 16000); // fallback estimate
    if (dur > CHAT_MAX_AUDIO_DURATION_SECONDS) {
      toast.error(`Voice message too long (max ${CHAT_MAX_AUDIO_DURATION_SECONDS}s)`);
      return;
    }
    setIsSending(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .eq("id", currentUserId)
      .single();

    const attachmentId = crypto.randomUUID();
    const mime = voice.mimeType ?? blob.type ?? "audio/webm";
    const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : "webm";
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

    try {
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, blob, {
        contentType: mime,
        upsert: false,
      });
      if (upErr) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        URL.revokeObjectURL(optimisticPreviewUrl);
        toast.error(upErr.message);
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? { ...m, id: result.id as string, created_at: (result.created_at as string) ?? m.created_at, attachments: [{ ...optimisticVoiceAtt, message_id: result.id as string }] }
              : m,
          ),
        );
        voice.clear();
        setIsPlayingPreview(false);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      URL.revokeObjectURL(optimisticPreviewUrl);
      toast.error("Voice message could not be sent.");
    } finally {
      setIsSending(false);
      void markConversationRead(conversationId);
    }
  };

  const handleSend = async () => {
    const hasText = input.trim().length > 0;
    const hasFiles = queued.length > 0;
    if ((!hasText && !hasFiles) || isSending) return;

    // Validate queued files still valid (size check again)
    for (const q of queued) {
      if (q.status === "error") {
        toast.error("Please remove or retry failed files before sending");
        return;
      }
    }

    setIsSending(true);
    const content = input.trim();
    setInput("");

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .eq("id", currentUserId)
      .single();

    // Prepare optimistic attachments with preview URLs
    const optimisticAttachments: ChatAttachmentForMessage[] = queued.map((q) => {
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
        metadata: null,
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
    const toUpload = [...queued];
    // Mark uploading
    setQueued((prev) => prev.map((q) => ({ ...q, status: "uploading" as const })));

    try {
      let attachmentInputs: { type: "image" | "file"; storage_path: string; filename: string; mime_type: string; file_size: number }[] = [];

      if (toUpload.length > 0) {
        // Upload each file to chat-media
        const uploadResults = await Promise.all(
          toUpload.map(async (q) => {
            const cls = classifyFile(q.file);
            const attachmentId = q.id; // reuse queued id as attachment id for path determinism
            const safeName = sanitizeFilename(q.file.name);
            const path = getChatMediaObjectPath(conversationId, attachmentId, safeName);
            const { error } = await supabase.storage.from("chat-media").upload(path, q.file, {
              contentType: q.file.type,
              upsert: false,
            });
            if (error) {
              return { error: error.message, q };
            }
            return {
              type: cls.type as "image" | "file",
              storage_path: path,
              filename: q.file.name,
              mime_type: q.file.type || "application/octet-stream",
              file_size: q.file.size,
            };
          }),
        );

        const failed = uploadResults.filter((r) => "error" in r) as { error: string; q: QueuedFile }[];
        if (failed.length > 0) {
          // Mark failed in queue, keep optimistic but remove it after failure? For now remove optimistic and keep queue with error
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setQueued((prev) =>
            prev.map((q) => {
              const f = failed.find((x) => x.q.id === q.id);
              return f ? { ...q, status: "error" as const, error: f.error } : q;
            }),
          );
          toast.error(`Upload failed for ${failed.length} file(s)`);
          // Attempt cleanup of successful uploads to avoid orphans
          const succeeded = uploadResults.filter((r) => !("error" in r)) as typeof attachmentInputs;
          if (succeeded.length > 0) {
            const paths = succeeded.map((s) => s.storage_path);
            await supabase.storage.from("chat-media").remove(paths).catch(() => {});
          }
          return;
        }

        attachmentInputs = uploadResults as typeof attachmentInputs;
      }

      // Clear queue optimistically (will be cleared on success)
      setQueued([]);

      let result;
      if (attachmentInputs.length > 0) {
        result = await sendMessageWithAttachments(conversationId, content, attachmentInputs);
      } else {
        result = await sendMessage(conversationId, content);
      }

      if (result && "error" in result && result.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        // Restore queue for retry if it was attachments
        if (toUpload.length > 0) {
          setQueued(toUpload.map((q) => ({ ...q, status: "queued" as const })));
        }
        toast.error(result.error);
        // Cleanup uploaded storage if DB insert failed (sendMessageWithAttachments already tries, but for safety)
        if (attachmentInputs.length > 0) {
          const paths = attachmentInputs.map((a) => a.storage_path);
          await supabase.storage.from("chat-media").remove(paths).catch(() => {});
        }
      } else if (result && "success" in result && result.id) {
        // Reconcile optimistic id -> real id, and update attachments with real message_id and signedUrls
        // We already cleared queue, but we need to update optimistic message's id and attachments
        // Fetch the created attachments' signedUrls via a quick refetch? Instead, keep optimistic attachments but update id.
        // The server's getMessages will have proper signedUrls on next refresh; for now keep local preview.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? {
                  ...m,
                  id: result.id as string,
                  created_at: (result.created_at as string) ?? m.created_at,
                  attachments: optimisticAttachments.map((att) => ({
                    ...att,
                    message_id: result.id as string,
                  })),
                }
              : m,
          ),
        );
        // Revoke object URLs after a delay? Keep for optimistic display
        toUpload.forEach((q) => {
          if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setQueued(toUpload.map((q) => ({ ...q, status: "queued" as const })));
      toast.error("Message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
      void markConversationRead(conversationId);
    }
  };

  const participantName = participant?.full_name ?? participant?.username ?? "Conversation";
  const participantInitial = (participant?.full_name?.[0] ?? participant?.username?.[0] ?? "?").toUpperCase();
  const mobileConversations = useMobileConversations();

  const canSend = input.trim().length > 0 || queued.length > 0;

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
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 22% 0%, rgba(40,40,255,0.10), transparent 42%), radial-gradient(circle at 88% 92%, rgba(109,109,255,0.08), transparent 40%)",
          }}
        />
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-accent/[0.06] blur-[120px]" />
        <div className="absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-accent-glow/[0.05] blur-[130px]" />
      </div>

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-0 bg-void-900/50 px-4 py-3 backdrop-blur-xl sm:px-6">
        {mobileConversations ? (
          <button
            type="button"
            onClick={mobileConversations.open}
            aria-label="Open conversations"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 transition-all duration-300 ease-premium hover:scale-105 hover:border-accent-400/40 hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 md:hidden"
          >
            <Menu size={18} />
          </button>
        ) : null}

        {participant?.avatar_url ? (
          <img
            src={participant.avatar_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover shadow-[0_0_20px_-8px_rgba(109,109,255,0.5)]"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-400/25 bg-gradient-to-br from-accent to-accent-glow text-sm font-semibold text-white">
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

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-accent-400/20 bg-accent/[0.06] px-2.5 py-1">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow-sm" />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-accent-300">Private</span>
          </div>
        </div>
      </header>

      <div className={cn("relative z-10 flex-1 min-h-0 overflow-y-auto p-5 sm:p-6", SCROLLBAR_CLASSES)}>
        {messages.length === 0 && queued.length === 0 && (
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-accent-300 shadow-input">
              <MessageSquare size={26} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-ink-50">No messages yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-ink-400">Send a message to start the conversation.</p>
          </div>
        )}

        <div className="flex flex-col">
          {messages.map((msg, i) => {
            const prevMsg = messages[i - 1];
            const nextMsg = messages[i + 1];
            const label = getDayLabel(msg.created_at);
            const showDivider = label !== null && label !== getDayLabel(prevMsg?.created_at ?? null);
            const isGrouped =
              !!prevMsg && prevMsg.sender_id === msg.sender_id && !showDivider;
            const showAvatar =
              !nextMsg ||
              nextMsg.sender_id !== msg.sender_id ||
              getDayLabel(nextMsg.created_at) !== label;

            return (
              <Fragment key={msg.id}>
                {showDivider && (
                  <div className="flex items-center gap-3 py-2" role="separator" aria-label={label ?? undefined}>
                    <span aria-hidden className="h-px flex-1 bg-border" />
                    <span className="rounded-full bg-void-900/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-500 backdrop-blur-sm">
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
                    status={getMessageStatus(msg, i)}
                    statusAvatarUrl={participant?.avatar_url ?? null}
                    statusAvatarName={participantName}
                    active={msg.id === activeMessageId}
                    showActions={actionsMessageId === msg.id}
                    attachments={msg.attachments}
                    onSelect={(id) => {
                      setActiveMessageId(id);
                      setActionsMessageId(null);
                    }}
                    onToggleActions={(id) => {
                      setActionsMessageId((prev) => (prev === id ? null : id));
                      setActiveMessageId(id);
                    }}
                  />
                </div>
              </Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-accent/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-accent bg-void-900/80 px-6 py-4 text-sm font-medium text-ink-50 shadow-lg">
            Drop files to attach
          </div>
        </div>
      )}

      <div className="relative z-10 shrink-0 border-0 bg-[linear-gradient(180deg,rgb(var(--surface)/0.3),rgb(var(--surface)/0.88))] px-3 pb-3 pt-2.5 backdrop-blur-xl sm:px-4 sm:pb-4 sm:pt-3">
        {amBlocked ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-surface/70 px-4 py-3.5 text-center"
          >
            <Ban size={16} className="shrink-0 text-ink-500" />
            <p className="text-sm text-ink-400">
              You can&apos;t send messages to @{participant?.username ?? participantName} because they blocked you.
            </p>
          </div>
        ) : voice.isRecording ? (
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            <span className="min-w-0 flex-1 text-sm font-medium tabular-nums text-ink-50">
              {Math.floor(voice.duration / 60)}:{String(voice.duration % 60).padStart(2, "0")} / {Math.floor(CHAT_MAX_AUDIO_DURATION_SECONDS / 60)}:{String(CHAT_MAX_AUDIO_DURATION_SECONDS % 60).padStart(2, "0")}
            </span>
            <span className="text-xs text-ink-500">Recording…</span>
            <Button type="button" variant="secondary" aria-label="Cancel recording" onClick={handleCancelVoice} className="h-10 w-10 shrink-0 rounded-full p-0">
              <Trash2 size={16} />
            </Button>
            <Button type="button" aria-label="Stop recording" onClick={() => voice.stop()} className="h-10 w-10 shrink-0 rounded-full p-0">
              <Square size={14} />
            </Button>
          </div>
        ) : voice.blob && voice.previewUrl ? (
          <div className="flex flex-col gap-2">
            {voice.error && <p className="text-xs text-red-400">{voice.error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
                onClick={togglePreviewPlayback}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white"
              >
                {isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
              </button>
              <div className="min-w-0 flex-1 rounded-full bg-surface px-3 py-2 text-sm text-ink-50">
                Voice message • {Math.floor(voice.duration / 60)}:{String(voice.duration % 60).padStart(2, "0")} • {Math.round(voice.blob.size / 1024)} KB
              </div>
              <audio
                ref={(el) => {
                  previewAudioRef.current = el;
                  if (el) {
                    el.onplay = () => setIsPlayingPreview(true);
                    el.onpause = () => setIsPlayingPreview(false);
                    el.onended = () => setIsPlayingPreview(false);
                  }
                }}
                src={voice.previewUrl}
                preload="metadata"
                className="hidden"
              />
              <Button type="button" variant="secondary" aria-label="Discard voice message" onClick={handleDiscardVoice} className="h-10 w-10 shrink-0 rounded-full p-0">
                <Trash2 size={16} />
              </Button>
              <Button type="button" aria-label="Send voice message" onClick={handleSendVoice} disabled={isSending} className="h-10 w-10 shrink-0 rounded-full p-0">
                <Send size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div ref={emojiContainerRef} className="relative">
            {queued.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {queued.map((q) => (
                  <QueuedAttachmentCard
                    key={q.id}
                    file={q.file}
                    previewUrl={q.previewUrl}
                    status={q.status}
                    error={q.error}
                    onRemove={() => removeQueued(q.id)}
                    onRetry={() => retryQueued(q.id)}
                  />
                ))}
              </div>
            )}
            {voice.error && <p className="mb-2 text-xs text-red-400">{voice.error}</p>}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 z-30 mb-2">
                <EmojiPicker
                  onSelect={(emoji) => {
                    insertEmoji(emoji);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
            {showGifPicker && (
              <div className="absolute bottom-full left-12 z-30 mb-2 sm:left-16">
                <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
              </div>
            )}
            <form
              className="flex items-center gap-2 sm:gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={[...CHAT_IMAGE_MIMES, ...CHAT_FILE_MIMES].join(",")}
                className="hidden"
                onChange={handleFileInputChange}
              />
              <Button
                type="button"
                variant="secondary"
                size="default"
                aria-label="Attach file"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!voice.blob || voice.isRecording}
                className="h-12 w-12 shrink-0 rounded-2xl p-0"
              >
                <Paperclip size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="default"
                aria-label="Open emoji picker"
                onClick={() => {
                  setShowEmojiPicker((v) => !v);
                  setShowGifPicker(false);
                }}
                disabled={!!voice.blob || voice.isRecording}
                className="h-12 w-12 shrink-0 rounded-2xl p-0"
              >
                <Smile size={18} />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="default"
                aria-label="Open GIF picker"
                onClick={() => {
                  setShowGifPicker((v) => !v);
                  setShowEmojiPicker(false);
                }}
                disabled={!!voice.blob || voice.isRecording}
                className="h-12 w-12 shrink-0 rounded-2xl p-0"
              >
                <Film size={18} />
              </Button>
              <input
                ref={inputRef}
                type="text"
                aria-label="Type a message"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                disabled={!!voice.blob || voice.isRecording}
                className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 border-0 focus:border-accent-400/60 focus:bg-surface focus:outline-none disabled:opacity-50"
              />
              {canSend ? (
                <Button type="submit" aria-label="Send message" disabled={isSending} className="h-12 w-12 shrink-0 rounded-2xl p-0">
                  <Send size={18} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Record voice message"
                  onClick={handleMicClick}
                  disabled={!voice.isSupported || isSending}
                  className="h-12 w-12 shrink-0 rounded-2xl p-0"
                  title={!voice.isSupported ? "Voice not supported in this browser" : "Record voice message"}
                >
                  <Mic size={18} />
                </Button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function getMessageSpacing(index: number, isGrouped: boolean) {
  if (index === 0) return "";
  return isGrouped ? "mt-1.5" : "mt-4";
}
