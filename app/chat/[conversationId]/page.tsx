import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { getConversations, getMessages } from "@/data/chat";

interface Props {
  params: { conversationId: string };
}

export default async function ConversationPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [conversations, messages] = await Promise.all([
    getConversations(user.id),
    getMessages(params.conversationId),
  ]);

  return (
    <>
      <Navbar />
      <main className="relative flex h-screen flex-col overflow-hidden pt-[80px] sm:pt-[90px]">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px]">
          <aside className="hidden w-[360px] shrink-0 md:block">
            <ChatSidebar conversations={conversations} currentUserId={user.id} />
          </aside>
          <div className="flex min-h-0 flex-1 flex-col border-l border-border-strong">
            <ChatConversation
              conversationId={params.conversationId}
              initialMessages={messages}
              currentUserId={user.id}
            />
          </div>
        </div>
      </main>
    </>
  );
}
