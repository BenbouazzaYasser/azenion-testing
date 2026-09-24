import { redirect, notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/supabase/user";
import { ServerRail } from "@/components/servers/server-rail";
import { ChannelSidebar } from "@/components/servers/channel-sidebar";
import { MemberPanel } from "@/components/servers/member-panel";
import { MobileChannelStrip } from "@/components/servers/mobile-channel-strip";
import { ServerGatewayMount } from "@/components/servers/server-gateway-mount";
import { getServerView, getServerMembers, getUserServers } from "@/data/servers";

interface ServerLayoutProps {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}

// Full-bleed app shell (Haven-style): rail | channels | chat | members.
// No global Navbar here — navigation lives in the rail (Home link).
export default async function ServerLayout({ params, children }: ServerLayoutProps) {
  const { slug } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/servers/${slug}`)}`);
  }

  const [view, servers] = await Promise.all([
    getServerView(slug),
    getUserServers(user.id),
  ]);

  if (!view) notFound();

  const members = await getServerMembers(view.server.id);

  return (
    <main id="main" className="flex h-dvh overflow-hidden">
      <ServerGatewayMount userId={user.id} serverId={view.server.id} />
      <ServerRail servers={servers} activeSlug={view.server.slug} />

      <div className="hidden w-[260px] shrink-0 border-r border-border bg-void-950/60 md:block">
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobileChannelStrip serverSlug={view.server.slug} channels={view.channels} />
        {children}
      </div>

      <MemberPanel
        serverName={view.server.name}
        members={members}
        memberCount={view.memberCount}
      />
    </main>
  );
}
