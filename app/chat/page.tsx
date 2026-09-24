import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/user";
import { getConversations } from "@/data/chat";

// Code-split: the interactive sidebar (search, archived view, unread state)
// hydrates after the empty-state shell paints.
const ChatSidebar = nextDynamic(
  () =>
    import("@/components/chat/chat-sidebar").then((mod) => ({
      default: mod.ChatSidebar,
    })),
  {
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-xl bg-surface/50" />
    ),
  },
);

export const metadata: Metadata = {
  title: "Chat — Azenion",
  description: "Private messaging on Azenion.",
};

export default async function ChatPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/chat")}`);
  }

  // getConversations is React-cached: the chat layout already fetched it
  // this request, so this call reuses that result (feeds the mobile sidebar).
  const conversations = await getConversations(user.id);

  return (
    <>
      <div className="relative min-h-0 flex-1 overflow-hidden md:hidden">
        <ChatSidebar conversations={conversations} currentUserId={user.id} />
      </div>
      <div className="relative hidden min-h-0 flex-1 items-center justify-center overflow-hidden border-l border-border md:flex">
            <div className="relative flex flex-col items-center px-6 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-lg bg-surface card-surface-soft text-accent-300">
                <MessageSquare size={28} className="relative" />
              </div>
              <h2 className="relative mt-6 text-xl font-semibold tracking-tight text-ink-50">
                Select a conversation
              </h2>
              <p className="relative mt-2 max-w-[320px] text-sm leading-relaxed text-ink-500">
                Choose a conversation from the sidebar or search for someone to message. Your messages stay private and secure.
              </p>
            </div>
          </div>
    </>
  );
}
