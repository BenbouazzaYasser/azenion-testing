import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/user";
import { getConversations, getMessages, getConversationBlockState } from "@/data/chat";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Code-split: the ~1500-line interactive conversation (pickers, realtime,
// call wiring) hydrates after the shell paints; the Suspense fallback below
// covers the loading state.
const ChatConversation = nextDynamic(
  () =>
    import("@/components/chat/chat-conversation").then((mod) => ({
      default: mod.ChatConversation,
    })),
  { loading: () => null },
);

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/chat/${conversationId}`)}`);
  }

  // getConversations is React-cached: the chat layout already fetched it
  // this request, so this call reuses that result (peer lookup only).
  const [conversations, messages, blockState] = await Promise.all([
    getConversations(user.id),
    getMessages(conversationId),
    getConversationBlockState(conversationId),
  ]);

  const thisConversation = conversations.find((c) => c.id === conversationId);
  const otherUser = thisConversation?.other_user ?? null;
  const peer =
    otherUser && otherUser.id
      ? {
          id: otherUser.id,
          full_name: otherUser.full_name,
          username: otherUser.username,
          avatar_url: otherUser.avatar_url,
        }
      : null;

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-ink-500">
          Loading conversation…
        </div>
      }
    >
      <ErrorBoundary
        fallbackTitle="Chat failed to load"
        fallbackMessage="Unable to load the conversation. You can try reloading or navigate back to your chats."
      >
        <ChatConversation
          conversationId={conversationId}
          initialMessages={messages}
          currentUserId={user.id}
          amBlocked={blockState.am_blocked}
          peer={peer}
        />
      </ErrorBoundary>
    </Suspense>
  );
}
