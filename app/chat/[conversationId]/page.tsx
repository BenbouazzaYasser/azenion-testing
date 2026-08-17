import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { getConversations, getMessages, getConversationBlockState } from "@/data/chat";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/chat/${conversationId}`)}`);
  }

  const [conversations, messages, blockState] = await Promise.all([
    getConversations(user.id),
    getMessages(conversationId),
    getConversationBlockState(conversationId),
  ]);

  return (
    <>
      <Navbar />
      <main className="relative flex h-dvh flex-col overflow-hidden pt-[80px] sm:pt-[90px]">
        <ChatLayout conversations={conversations} currentUserId={user.id}>
          <ChatConversation
            conversationId={conversationId}
            initialMessages={messages}
            currentUserId={user.id}
            amBlocked={blockState.am_blocked}
          />
        </ChatLayout>
      </main>
    </>
  );
}
