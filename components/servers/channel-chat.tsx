"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Hash, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ChannelBubble } from "@/components/servers/channel-bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { sendChannelMessage } from "@/actions/server.actions";
import type { ChannelMessageWithSender } from "@/data/servers";
import type { DictKey } from "@/lib/translation/types";
import { useTranslation } from "@/components/translation/translation-provider";

interface ChannelChatProps {
  channelId: string;
  channelName: string;
  topic?: string | null;
  currentUserId: string;
  initialMessages: ChannelMessageWithSender[];
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

type TranslateFn = (key: DictKey, fallback?: string) => string;

function getDayLabel(dateStr: string | null, t: TranslateFn): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return t("servers.today");
  if (diffDays === 1) return t("servers.yesterday");
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString();
}

export function ChannelChat({
  channelId,
  channelName,
  topic,
  currentUserId,
  initialMessages,
}: ChannelChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChannelMessageWithSender[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime: new messages from other members appear live.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`channel-messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const row = payload.new as Omit<ChannelMessageWithSender, "sender">;

          if (row.sender_id !== currentUserId) {
            setMessages((prev) =>
              prev.some((m) => m.id === row.id)
                ? prev
                : [...prev, { ...(row as ChannelMessageWithSender), sender: null }],
            );

            // Fetch the sender profile for display.
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url, username")
              .eq("id", row.sender_id)
              .single();

            setMessages((prev) =>
              prev.map((m) => (m.id === row.id ? { ...m, sender: profile ?? null } : m)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId]);

  const grouped = useMemo(() => {
    const FIVE_MIN = 5 * 60 * 1000;
    return messages.map((msg, i) => {
      const prevMsg = messages[i - 1];
      const nextMsg = messages[i + 1];
      const label = getDayLabel(msg.created_at, t);
      const showDivider = label !== null && label !== getDayLabel(prevMsg?.created_at ?? null, t);
      const ts = new Date(msg.created_at ?? 0).getTime();
      const groupsWithPrev =
        !!prevMsg &&
        prevMsg.sender_id === msg.sender_id &&
        !showDivider &&
        ts - new Date(prevMsg.created_at ?? 0).getTime() < FIVE_MIN;
      // Avatar shows on the last message of a consecutive run.
      const nextContinues =
        !!nextMsg &&
        nextMsg.sender_id === msg.sender_id &&
        new Date(nextMsg.created_at ?? 0).getTime() - ts < FIVE_MIN;
      return { msg, showDivider, label, isGrouped: groupsWithPrev, showAvatar: !nextContinues };
    });
  }, [messages, t]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const content = input.trim();
    setInput("");

    const optimistic: ChannelMessageWithSender = {
      id: crypto.randomUUID(),
      channel_id: channelId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      sender: null,
    };

    setMessages((prev) => [...prev, optimistic]);

    const result = await sendChannelMessage(channelId, content);

    if (result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error(result.error);
      setInput(content);
    }

    setIsSending(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex shrink-0 items-center gap-2.5 bg-void-900/50 px-4 py-3 backdrop-blur-xl sm:px-5">
        <Hash size={16} className="shrink-0 text-accent-300" />
        <h1 className="truncate text-sm font-semibold text-ink-50">{channelName}</h1>
        {topic ? (
          <>
            <span aria-hidden className="h-4 w-px shrink-0 bg-border-strong" />
            <p className="hidden truncate text-xs text-ink-500 sm:block">{topic}</p>
          </>
        ) : null}
      </header>

      <div className={cn("relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4", SCROLLBAR_CLASSES)}>
        {messages.length === 0 ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-accent-300 shadow-input">
              <Hash size={26} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-ink-50">{t("servers.welcomeTo")} #{channelName}</h2>
            <p className="mt-1.5 max-w-xs text-sm text-ink-400">
              {t("servers.chatEmptySub")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {grouped.map(({ msg, showDivider, label, isGrouped, showAvatar }) => (
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
                <ChannelBubble
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
                />
              </Fragment>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="relative z-10 shrink-0 bg-[linear-gradient(180deg,rgb(var(--surface)/0.3),rgb(var(--surface)/0.88))] px-3 pb-3 pt-2.5 backdrop-blur-xl sm:px-4 sm:pb-4">
        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            aria-label={`${t("servers.messageTo")} #${channelName}`}
            placeholder={`${t("servers.messageTo")} #${channelName}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 border-0 focus:border-accent-400/60 focus:bg-surface focus:outline-none"
          />
          <Button
            type="submit"
            aria-label={t("servers.sendMessage")}
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
