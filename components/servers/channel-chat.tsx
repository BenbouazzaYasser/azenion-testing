"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Hash, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { ChannelBubble } from "@/components/servers/channel-bubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import { useServerChannel } from "@/hooks/use-server-channel";
import { serverGateway, type ChannelCursor, type GatewayMessage } from "@/lib/server-gateway";
import type { ChannelMessageWithSender } from "@/data/servers";
import type { DictKey } from "@/lib/translation/types";
import { useTranslation } from "@/components/translation/translation-provider";

interface ChannelChatProps {
  channelId: string;
  channelName: string;
  topic?: string | null;
  currentUserId: string;
  initialMessages: ChannelMessageWithSender[];
  initialHasMore?: boolean;
  initialCursor?: ChannelCursor | null;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const emptySubscribe = () => () => {};
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
  initialHasMore = false,
  initialCursor = null,
}: ChannelChatProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const lastTypingSentAt = useRef(0);
  const stickToBottom = useRef(true);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const {
    messages,
    hasMore,
    isLoadingOlder,
    loadOlder,
    send,
    setTyping,
    typingUsers,
  } = useServerChannel({
    channelId,
    currentUserId,
    initialMessages,
    initialHasMore,
    initialCursor,
  });

  const virtualizer = useVirtualizer({
    enabled: hydrated,
    count: hydrated ? messages.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const grouped = useMemo(() => {
    const FIVE_MIN = 5 * 60 * 1000;
    return messages.map((msg, index) => {
      const previous = messages[index - 1];
      const next = messages[index + 1];
      const label = getDayLabel(msg.created_at, t);
      const showDivider = label !== null && label !== getDayLabel(previous?.created_at ?? null, t);
      const timestamp = new Date(msg.created_at ?? 0).getTime();
      const groupedWithPrevious =
        !!previous &&
        previous.sender_id === msg.sender_id &&
        !showDivider &&
        timestamp - new Date(previous.created_at ?? 0).getTime() < FIVE_MIN;
      const continuesNext =
        !!next &&
        next.sender_id === msg.sender_id &&
        new Date(next.created_at ?? 0).getTime() - timestamp < FIVE_MIN;
      return { msg, showDivider, label, isGrouped: groupedWithPrevious, showAvatar: !continuesNext };
    });
  }, [messages, t]);

  const scrollToBottom = useCallback(() => {
    if (!hydrated || messages.length === 0) return;
    virtualizer.scrollToIndex(messages.length - 1, { align: "end", behavior: "auto" });
  }, [hydrated, messages.length, virtualizer]);

  useLayoutEffect(() => {
    if (!hydrated) return;
    const anchor = prependAnchor.current;
    if (anchor && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight - anchor.height + anchor.top;
      prependAnchor.current = null;
      return;
    }
    if (stickToBottom.current) scrollToBottom();
  }, [grouped.length, hydrated, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const element = parentRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distanceFromBottom < 180;
    if (element.scrollTop < 240 && hasMore && !isLoadingOlder) {
      prependAnchor.current = { height: element.scrollHeight, top: element.scrollTop };
      void loadOlder();
    }
  }, [hasMore, isLoadingOlder, loadOlder]);

  useEffect(() => {
    if (hydrated) scrollToBottom();
  }, [channelId, hydrated, scrollToBottom]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;
    setInput("");
    setIsSending(true);
    const result = await send(content);
    setIsSending(false);
    if (result.error) {
      setInput(content);
      toast.error(result.error);
    } else {
      stickToBottom.current = true;
      scrollToBottom();
    }
  };

  const handleRetry = async (message: GatewayMessage) => {
    serverGateway.removeMessage(message.id);
    const result = await send(message.content);
    if (result.error) toast.error(result.error);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!value.trim()) {
      lastTypingSentAt.current = 0;
      setTyping(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSentAt.current > 1500) {
      lastTypingSentAt.current = now;
      setTyping(true);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex shrink-0 items-center gap-2.5 border-b border-border bg-void-950 px-4 py-3 sm:px-5">
        <Hash size={16} className="shrink-0 text-accent-300" />
        <h1 className="truncate text-sm font-semibold text-ink-50">{channelName}</h1>
        {typingUsers.length > 0 ? (
          <span className="hidden items-center gap-1.5 text-xs text-accent-300 sm:flex">
            <Users size={13} />
            {typingUsers.length} typing…
          </span>
        ) : topic ? (
          <>
            <span aria-hidden className="h-4 w-px shrink-0 bg-border-strong" />
            <p className="hidden truncate text-xs text-ink-500 sm:block">{topic}</p>
          </>
        ) : null}
      </header>

      <div
        ref={parentRef}
        onScroll={handleScroll}
        className={cn("relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4", SCROLLBAR_CLASSES)}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface text-accent-300">
              <Hash size={26} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-ink-50">
              {t("servers.welcomeTo")} #{channelName}
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-ink-400">{t("servers.chatEmptySub")}</p>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: hydrated ? virtualizer.getTotalSize() : undefined }}
          >
            {hydrated
              ? virtualizer.getVirtualItems().map((virtualItem) => {
                  const row = grouped[virtualItem.index];
                  if (!row) return null;
                  return (
                    <div
                      key={row.msg.id}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      className="absolute left-0 top-0 w-full"
                      style={{ transform: `translateY(${virtualItem.start}px)` }}
                    >
                      <Fragment>
                        {row.showDivider ? (
                          <div
                            className="flex items-center gap-3 py-2"
                            role="separator"
                            aria-label={row.label ?? undefined}
                          >
                            <span aria-hidden className="h-px flex-1 bg-border" />
                            <span
                              suppressHydrationWarning
                              className="rounded-full bg-void-900/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-normal text-ink-500"
                            >
                              {row.label}
                            </span>
                            <span aria-hidden className="h-px flex-1 bg-border" />
                          </div>
                        ) : null}
                        <ChannelBubble
                          id={row.msg.id}
                          content={row.msg.content}
                          created_at={row.msg.created_at}
                          edited_at={row.msg.edited_at}
                          sender_id={row.msg.sender_id}
                          sender_name={row.msg.sender?.full_name ?? row.msg.sender?.username ?? null}
                          sender_avatar={row.msg.sender?.avatar_url ?? null}
                          isOwn={row.msg.sender_id === currentUserId}
                          isGrouped={row.isGrouped}
                          showAvatar={row.showAvatar}
                          delivery={row.msg.delivery}
                          error={row.msg.error}
                          onRetry={() => void handleRetry(row.msg)}
                          onUpdated={(content, editedAt) =>
                            serverGateway.updateMessage(row.msg.id, { content, edited_at: editedAt })
                          }
                          onDeleted={() => serverGateway.removeMessage(row.msg.id)}
                        />
                      </Fragment>
                    </div>
                  );
                })
              : null}
          </div>
        )}
      </div>

      <div className="relative z-10 shrink-0 border-t border-border bg-void-950 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-4">
        <form
          className="flex items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
        >
          <input
            type="text"
            aria-label={`${t("servers.messageTo")} #${channelName}`}
            placeholder={`${t("servers.messageTo")} #${channelName}`}
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            onBlur={() => setTyping(false)}
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-600 focus:border-accent-400/60"
          />
          <Button
            type="submit"
            aria-label={t("servers.sendMessage")}
            disabled={!input.trim() || isSending}
            className="h-12 w-12 shrink-0 rounded-lg p-0"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
}
