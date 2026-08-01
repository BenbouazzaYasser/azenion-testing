"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "@/components/chat/message-bubble";
import { sendMessage } from "@/actions/chat.actions";

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

export function ChatConversation({
  conversationId,
  initialMessages,
  currentUserId,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    await sendMessage(conversationId, content);
    setIsSending(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <MessageSquare size={32} className="text-ink-600" />
            <p className="mt-3 text-sm text-ink-500">No messages yet</p>
            <p className="mt-1 text-xs text-ink-600">
              Send a message to start the conversation.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              id={msg.id}
              content={msg.content}
              created_at={msg.created_at}
              edited_at={msg.edited_at}
              sender_id={msg.sender_id}
              sender_name={msg.sender?.full_name ?? msg.sender?.username ?? null}
              sender_avatar={msg.sender?.avatar_url ?? null}
              isOwn={msg.sender_id === currentUserId}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border-strong p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 rounded-xl border border-border-strong bg-white/[0.03] px-4 py-2.5 text-sm text-ink-50 placeholder:text-ink-600 transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-glow-sm transition-all duration-300 ease-premium hover:bg-accent-glow hover:shadow-glow hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
