"use client";

import { Fragment, useMemo, useRef, useState, useEffect } from "react";
import { Send, MessageSquare, Users, Menu } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { sendMessage } from "@/actions/chat.actions";
import { formatDate } from "@/lib/date";
import { useMobileConversations } from "@/components/chat/mobile-conversations-context";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  created_at: string | null;
  edited_at: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string;
  } | null;
}

interface ChatConversationProps {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
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

export function ChatConversation({
  conversationId,
  initialMessages,
  currentUserId,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          if (newMsg.sender_id === currentUserId) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, username")
            .eq("id", newMsg.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender: profile },
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  const participant = useMemo(() => {
    const other = initialMessages.find((m) => m.sender_id !== currentUserId);
    return other?.sender ?? null;
  }, [initialMessages, currentUserId]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const content = input.trim();
    setInput("");

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .eq("id", currentUserId)
      .single();

    const optimistic: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      image_url: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      sender: profile,
    };

    setMessages((prev) => [...prev, optimistic]);
    try {
      const result = await sendMessage(conversationId, content);
      if (result && "error" in result && result.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(result.error);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error("Message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const participantName = participant?.full_name ?? participant?.username ?? "Conversation";
  const participantInitial = (participant?.full_name?.[0] ?? participant?.username?.[0] ?? "?").toUpperCase();
  const mobileConversations = useMobileConversations();

  return (
    <div
      ref={conversationRef}
      onBlur={handleBlur}
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

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-border bg-void-900/50 px-4 py-3 backdrop-blur-xl sm:px-6">
        {mobileConversations ? (
          <button
            type="button"
            onClick={mobileConversations.open}
            aria-label="Open conversations"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong/[0.12] text-ink-400 transition-all duration-300 ease-premium hover:scale-105 hover:border-accent-400/40 hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 md:hidden"
          >
            <Menu size={18} />
          </button>
        ) : null}

        {participant?.avatar_url ? (
          <img
            src={participant.avatar_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-border-strong/[0.12] object-cover shadow-[0_0_20px_-8px_rgba(109,109,255,0.5)]"
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

        <div className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-accent-400/20 bg-accent/[0.06] px-2.5 py-1 sm:flex">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-400" />
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-accent-300">
            Private
          </span>
        </div>
      </header>

      <div className={cn("relative z-10 flex-1 min-h-0 overflow-y-auto p-5 sm:p-6", SCROLLBAR_CLASSES)}>
        {messages.length === 0 && (
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-surface text-accent-300 shadow-input">
              <MessageSquare size={26} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-ink-50">No messages yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-ink-400">
              Send a message to start the conversation.
            </p>
          </div>
        )}

        <div className="flex flex-col">
          {messages.map((msg, i) => {
            const prevMsg = messages[i - 1];
            const label = getDayLabel(msg.created_at);
            const showDivider = label !== null && label !== getDayLabel(prevMsg?.created_at ?? null);
            const isGrouped =
              !!prevMsg && prevMsg.sender_id === msg.sender_id && !showDivider;

            return (
              <Fragment key={msg.id}>
                {showDivider && (
                  <div className="flex items-center gap-3 py-2" role="separator" aria-label={label ?? undefined}>
                    <span aria-hidden className="h-px flex-1 bg-border" />
                    <span className="rounded-full border border-border bg-void-900/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-500 backdrop-blur-sm">
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
                    active={msg.id === activeMessageId}
                    onSelect={setActiveMessageId}
                  />
                </div>
              </Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-border/60 bg-[linear-gradient(180deg,rgb(var(--surface)/0.3),rgb(var(--surface)/0.88))] px-3 pb-3 pt-2.5 backdrop-blur-xl sm:px-4 sm:pb-4 sm:pt-3">
        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            aria-label="Type a message"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-border-strong bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 transition-all duration-300 ease-premium hover:border-border focus:border-accent-400/60 focus:bg-accent/[0.04] focus:outline-none focus:ring-2 focus:ring-accent-400/25"
          />
          <Button
            type="submit"
            aria-label="Send message"
            disabled={!input.trim() || isSending}
            className="h-12 w-12 shrink-0 rounded-2xl p-0"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function getMessageSpacing(index: number, isGrouped: boolean) {
  if (index === 0) return "";
  return isGrouped ? "mt-1.5" : "mt-4";
}
