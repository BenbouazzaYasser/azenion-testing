"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSidebar, type Conversation } from "@/components/chat/chat-sidebar";
import { MobileConversationsContext } from "@/components/chat/mobile-conversations-context";
import { useDialogFocus } from "@/lib/use-dialog-focus";

interface ChatLayoutProps {
  conversations: Conversation[];
  currentUserId: string;
  children: ReactNode;
}

export function ChatLayout({ conversations, currentUserId, children }: ChatLayoutProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogFocusRef = useDialogFocus<HTMLDivElement>(open);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Lock page scroll for the whole chat layout so the conversation area
    // scrolls internally instead of changing the window document height.
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setMounted(true));
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      setMounted(false);
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <MobileConversationsContext.Provider value={{ open: () => setOpen(true) }}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-1 p-3 sm:p-5">
        <div className="relative flex min-h-0 w-full overflow-hidden rounded-[2rem] border border-border-strong card-surface shadow-card backdrop-blur-xl">
          <aside className="hidden w-[360px] shrink-0 md:block">
            <ChatSidebar conversations={conversations} currentUserId={currentUserId} />
          </aside>

          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
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
            className="absolute inset-0 bg-void-950/80 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: mounted ? 1 : 0 }}
            onClick={close}
          />
          <div
            ref={dialogFocusRef}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-[330px] flex-col overflow-hidden rounded-r-2xl border-r border-border-strong bg-glass shadow-dropdown transition-all duration-300 ease-premium focus:outline-none"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-100%)",
            }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
              <h1 className="text-sm font-semibold text-ink-50">Conversations</h1>
              <button
                type="button"
                onClick={close}
                aria-label="Close conversations"
                className={cn(
                  "-mr-1.5 -mt-1.5 rounded-full p-2 text-ink-400 transition-all duration-300 ease-premium",
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