import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { getConversations, getMessages, getConversationBlockState } from "@/data/chat";

interface Props {
  params: { conversationId: string };
}

export default async function ConversationPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/chat/${params.conversationId}`)}`);
  }

  const [conversations, messages, blockState] = await Promise.all([
    getConversations(user.id),
    getMessages(params.conversationId),
    getConversationBlockState(params.conversationId),
  ]);

  const thisConversation = conversations.find((c) => c.id === params.conversationId);
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
    <>
      <Navbar />
      <main className="relative flex h-dvh flex-col overflow-hidden pt-[80px] sm:pt-[90px]">
        <ChatLayout conversations={conversations} currentUserId={user.id}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-ink-500">
                Loading conversation…
              </div>
            }
          >
            <ChatConversation
              conversationId={params.conversationId}
              initialMessages={messages}
              currentUserId={user.id}
              amBlocked={blockState.am_blocked}
              peer={peer}
            />
          </Suspense>
        </ChatLayout>
      </main>
    </>
  );
}
