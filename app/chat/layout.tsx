import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/supabase/user";
import { ChatLayout } from "@/components/chat/chat-layout";
import { getConversations } from "@/data/chat";

// Chat shell: mounts ONCE for all /chat/* routes. Switching conversations
// re-renders only the page (message pane) below — the sidebar, its scroll
// position, and its data stay put. Auth redirects keep living in each page
// (correct `next` param); getSessionUser/getConversations are React-cached
// so the layout + page share one execution per request.
//
// Full-bleed app shell (Haven-style): no global Navbar here — navigation
// lives inside the sidebar (Home link). Navbar stays on marketing pages.
export default async function ChatShellLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  const conversations = user ? await getConversations(user.id) : [];

  return (
    <main id="main" className="flex h-dvh overflow-hidden">
      <ChatLayout conversations={conversations} currentUserId={user?.id ?? ""}>
        {children}
      </ChatLayout>
    </main>
  );
}
