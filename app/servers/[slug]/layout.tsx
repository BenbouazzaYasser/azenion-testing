import { redirect, notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ServerRail } from "@/components/servers/server-rail";
import { ChannelSidebar } from "@/components/servers/channel-sidebar";
import { getServerView, getUserServers } from "@/data/servers";

interface ServerLayoutProps {
  params: { slug: string };
  children: ReactNode;
}

export default async function ServerLayout({ params, children }: ServerLayoutProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/servers/${params.slug}`)}`);
  }

  const [view, servers] = await Promise.all([
    getServerView(params.slug),
    getUserServers(user.id),
  ]);

  if (!view) notFound();

  return (
    <>
      <Navbar />
      <main className="relative h-dvh overflow-hidden pt-[80px] sm:pt-[90px]">
        <div className="mx-auto flex h-full w-full max-w-[1440px] gap-2 p-2 sm:gap-3 sm:p-4">
          <ServerRail servers={servers} activeSlug={view.server.slug} />

          <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface/30 shadow-card backdrop-blur-xl">
            <div className="hidden w-[248px] shrink-0 md:block">
              <ChannelSidebar
                serverId={view.server.id}
                serverSlug={view.server.slug}
                serverName={view.server.name}
                kind={view.server.kind}
                myRole={view.myRole}
                memberCount={view.memberCount}
                channels={view.channels}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Mobile channel strip (sidebar is hidden below md) */}
              <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-void-900/50 px-3 py-2 backdrop-blur-xl md:hidden">
                {view.channels.map((ch) => (
                  <a
                    key={ch.id}
                    href={`/servers/${view.server.slug}/${ch.slug}`}
                    className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-300"
                  >
                    # {ch.name}
                  </a>
                ))}
              </div>
              {children}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
