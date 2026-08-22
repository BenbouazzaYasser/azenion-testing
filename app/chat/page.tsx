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
          <div className="relative hidden min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_22%_0%,rgba(40,40,255,0.09),transparent_42%),radial-gradient(circle_at_88%_92%,rgba(109,109,255,0.06),transparent_40%)] md:flex">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-accent/[0.05] blur-[120px]" />
              <div className="absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-accent-glow/[0.04] blur-[130px]" />
              <div className="absolute left-1/2 top-1/2 h-[360px] w-[520px] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(to_right,rgba(244,245,248,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_75%)] opacity-40" />
            </div>
            <div className="relative flex flex-col items-center px-6 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-surface card-surface-soft text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.45)]">
                <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl bg-accent/[0.06] blur-xl" />
                <MessageSquare size={28} className="relative" />
              </div>
              <h2 className="relative mt-6 text-xl font-semibold tracking-tight text-ink-50">
                Select a conversation
              </h2>
              <p className="relative mt-2 max-w-[320px] text-sm leading-relaxed text-ink-500">
                Choose a conversation from the sidebar or search for someone to message. Your messages stay private and secure.
              </p>
              <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-600">
                Private · Secure · Real-time
              </p>
            </div>
          </div>
        </ChatLayout>
      </main>
    </>
  );
}
