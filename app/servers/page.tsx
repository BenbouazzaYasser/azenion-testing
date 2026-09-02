import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Hash, Plus, Server } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { PageAtmosphere } from "@/components/graphics/page-atmosphere";
import { getUserServers } from "@/data/servers";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Servers | Azenion — The Limitless Network",
  description: "Your Azenion servers for teams, branches and communities.",
};

const KIND_LABEL = {
  team: "servers.kindTeam",
  branch: "servers.kindBranch",
  user: "servers.kindCommunity",
} as const;

export default async function ServersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/servers")}`);
  }

  const servers = await getUserServers(user.id);

  return (
    <>
      <Navbar />
      <main className="relative min-h-dvh overflow-hidden pb-20 pt-[100px] sm:pt-[110px]">
        <PageAtmosphere />
        <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink-50">{serverT("servers.title")}</h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
                {serverT("servers.welcomeSub")}
              </p>
            </div>
            <Link
              href="/servers/create"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-glow transition-all duration-300 hover:bg-accent/90"
            >
              <Plus size={16} />
              {serverT("servers.createServer")}
            </Link>
          </div>

          {servers.length === 0 ? (
            <div className="mt-12 flex flex-col items-center rounded-3xl bg-surface/40 px-6 py-16 text-center backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface card-surface-soft text-accent-300 shadow-input">
                <Server size={24} />
              </div>
              <p className="mt-4 text-lg font-semibold text-ink-50">{serverT("servers.noneYet")}</p>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">
                {serverT("servers.noneYetSub")}
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <Link
                  key={server.id}
                  href={`/servers/${server.slug}`}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-surface/50 p-4 shadow-card backdrop-blur-xl transition-all duration-300 ease-premium hover:bg-surface/70 hover:shadow-glow-sm"
                >
                  {server.icon_url ? (
                    <img
                      src={server.icon_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-base font-semibold text-white">
                      {(server.name[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-50">{server.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                      <Hash size={11} className="shrink-0" />
                      {serverT(KIND_LABEL[server.kind])}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
