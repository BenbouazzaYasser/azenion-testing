import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { getConversations } from "@/data/chat";

export const metadata: Metadata = {
  title: "Chat — Azenion",
  description: "Private messaging on Azenion.",
};

export default async function ChatPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const conversations = await getConversations(user.id);

  return (
    <>
      <Navbar />
      <main className="relative flex min-h-screen pt-[80px] sm:pt-[90px]">
        <div className="flex w-full max-w-[1200px] mx-auto">
          <aside className="w-[360px] shrink-0 hidden md:block">
            <ChatSidebar conversations={conversations} currentUserId={user.id} />
          </aside>
          <div className="flex-1 flex items-center justify-center border-l border-border-strong">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-ink-200">Select a conversation</h2>
              <p className="mt-2 text-sm text-ink-500">
                Choose a conversation from the sidebar or search for someone to message.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
