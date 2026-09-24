"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSidebar, type Conversation } from "@/components/chat/chat-sidebar";
import { MobileConversationsContext } from "@/components/chat/mobile-conversations-context";
import { useDialogFocus, useDialogOpen } from "@/lib/use-dialog-focus";

interface ChatLayoutProps {
  conversations: Conversation[];
  currentUserId: string;
  children: ReactNode;
}

export function ChatLayout({ conversations, currentUserId, children }: ChatLayoutProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = useCallback(() => setOpen(false), []);

  const { mounted } = useDialogOpen(open, close);

  return (
    <MobileConversationsContext.Provider value={{ open: () => setOpen(true) }}>
      <div className="flex h-full min-h-0 w-full">
        <aside className="hidden w-[360px] shrink-0 overflow-hidden border-r border-border bg-void-950 md:block">
          <ChatSidebar conversations={conversations} currentUserId={currentUserId} />
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[70] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Conversations"
        >
          <button
            type="button"
            aria-label="Close conversations"
            className="absolute inset-0 bg-void-950/80 transition-opacity duration-200"
            style={{ opacity: mounted ? 1 : 0 }}
            onClick={close}
          />
          <div
            ref={dialogFocusRef}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-[330px] flex-col overflow-hidden border-r border-border bg-glass transition-[opacity,transform] duration-200 ease-out focus:outline-none"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-3.5">
              <h1 className="text-sm font-semibold text-ink-50">Conversations</h1>
              <button
                type="button"
                onClick={close}
                aria-label="Close conversations"
                className={cn(
                  "-mr-1.5 -mt-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-ink-400 transition-colors duration-200 ease-out",
                  "hover:bg-surface-hover hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatSidebar conversations={conversations} currentUserId={currentUserId} onNavigate={close} />
            </div>
          </div>
        </div>
      ) : null}
    </MobileConversationsContext.Provider>
  );
}