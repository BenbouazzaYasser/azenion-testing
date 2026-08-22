import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatLayout } from "@/components/chat/chat-layout";
import { getConversations } from "@/data/chat";

export const metadata: Metadata = {
  title: "Chat — Azenion",
  description: "Private messaging on Azenion.",
};

export default async function ChatPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/chat")}`);
  }

  const conversations = await getConversations(user.id);

  return (
    <>
      <Navbar />
      <main className="relative flex h-dvh flex-col overflow-hidden pt-[80px] sm:pt-[90px]">
        <ChatLayout conversations={conversations} currentUserId={user.id}>
          <div className="relative min-h-0 flex-1 overflow-hidden md:hidden">
            <ChatSidebar conversations={conversations} currentUserId={user.id} />
          </div>
          <div className="relative hidden min-h-0 flex-1 items-center justify-center overflow-hidden md:flex">
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
            <div className="relative flex flex-col items-center px-6 text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border-strong bg-surface text-accent-300 shadow-input">
                <MessageSquare size={26} />
              </div>
              <h2 className="relative mt-5 text-lg font-semibold text-ink-50">
                Select a conversation
              </h2>
              <p className="relative mt-1.5 max-w-xs text-sm text-ink-400">
                Choose a conversation from the sidebar or search for someone to message.
              </p>
            </div>
          </div>
        </ChatLayout>
      </main>
    </>
  );
}
