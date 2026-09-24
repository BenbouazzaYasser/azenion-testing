import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus, Server } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/user";
import { getUserServers } from "@/data/servers";
import { serverT } from "@/lib/translation/server";

export const metadata: Metadata = {
  title: "Servers | Azenion — The Limitless Network",
  description: "Your Azenion servers for teams, branches and communities.",
};

export default async function ServersPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/servers")}`);
  }

  const servers = await getUserServers(user.id);

  const kindLabels = {
    team: await serverT("servers.kindTeam"),
    branch: await serverT("servers.kindBranch"),
    user: await serverT("servers.kindCommunity"),
  } satisfies Record<(typeof servers)[number]["kind"], string>;

  return (
    <>
      <main id="main" className="relative min-h-dvh overflow-hidden pb-20 pt-[100px] sm:pt-[110px]">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-ink-50">{await serverT("servers.title")}</h1>
            <Link
              href="/servers/create"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-glow transition-all duration-300 hover:bg-accent/90"
            >
              <Plus size={15} />
              {await serverT("servers.createServer")}
            </Link>
          </div>

          {servers.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-2xl border border-border/60 bg-void-950/50 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface text-accent-300 shadow-input">
                <Server size={22} />
              </div>
              <p className="mt-4 text-base font-semibold text-ink-50">{await serverT("servers.noneYet")}</p>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">
                {await serverT("servers.noneYetSub")}
              </p>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-border/30 overflow-hidden rounded-2xl border border-border/30 bg-void-950/50">
              {servers.map((server) => (
                <li key={server.id}>
                  <Link
                    href={`/servers/${server.slug}`}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-surface/40 focus-visible:outline-none focus-visible:bg-surface/40"
                  >
                    {server.icon_url ? (
                      <img
                        src={server.icon_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-base font-semibold text-white">
                        {(server.name[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-50">{server.name}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{kindLabels[server.kind]}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="ml-auto shrink-0 text-ink-600 transition-colors duration-200 group-hover:text-ink-300"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
