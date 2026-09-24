import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Plus, Server, Users } from "lucide-react";
import { getSessionUser } from "@/lib/supabase/user";
import { getUserServers, type ServerSummary } from "@/data/servers";
import { serverT } from "@/lib/translation/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Servers | Azenion — The Limitless Network",
  description: "Your Azenion servers for teams, branches and communities.",
};

function ServerMark({
  server,
  className,
}: {
  server: ServerSummary;
  className?: string;
}) {
  if (server.icon_url) {
    return (
      // Server icons are user-controlled external URLs; a plain image avoids
      // forcing every icon host into next/image configuration.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={server.icon_url}
        alt=""
        className={cn("shrink-0 object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-accent font-semibold text-white",
        className,
      )}
    >
      {(server.name[0] ?? "?").toUpperCase()}
    </span>
  );
}

export default async function ServersPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/servers")}`);
  }

  const servers = await getUserServers(user.id);
  const [kindLabels, roleLabels] = await Promise.all([
    Promise.all([
      serverT("servers.kindTeam"),
      serverT("servers.kindBranch"),
      serverT("servers.kindCommunity"),
    ]),
    Promise.all([
      serverT("servers.roleOwner"),
      serverT("servers.roleAdmin"),
      serverT("servers.roleMember"),
    ]),
  ]);

  const kindLabel = (kind: ServerSummary["kind"]) =>
    kindLabels[kind === "team" ? 0 : kind === "branch" ? 1 : 2];
  const roleLabel = (role: ServerSummary["role"]) =>
    roleLabels[role === "owner" ? 0 : role === "admin" ? 1 : 2];
  const [featured, ...remaining] = servers;
  const [
    createLabel,
    createSubLabel,
    allServersLabel,
    openServerLabel,
    titleLabel,
    welcomeLabel,
    noneYetLabel,
    noneYetSubLabel,
  ] = await Promise.all([
    serverT("servers.createServer"),
    serverT("servers.createSub"),
    serverT("servers.allServers"),
    serverT("servers.openServer"),
    serverT("servers.title"),
    serverT("servers.welcomeSub"),
    serverT("servers.noneYet"),
    serverT("servers.noneYetSub"),
  ]);

  return (
    <main
      id="main"
      className="relative min-h-dvh overflow-hidden pb-20 pt-[100px] sm:pt-[110px]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="flex items-end justify-between gap-6 border-b border-border-strong pb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">
              {titleLabel}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
              {welcomeLabel}
            </p>
          </div>
          <span
            className="hidden font-mono text-xs tabular-nums text-ink-500 sm:block"
            dir="ltr"
          >
            {servers.length.toString().padStart(2, "0")}
          </span>
        </header>

        {featured ? (
          <>
            <section
              className="mt-6 grid gap-3 md:grid-cols-12"
              aria-label={titleLabel}
            >
              <Link
                href={`/servers/${featured.slug}`}
                aria-label={`${openServerLabel}: ${featured.name}`}
                className="group relative min-h-64 overflow-hidden border border-border-strong bg-surface/55 p-5 transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-accent-400/50 hover:bg-surface md:col-span-8 md:min-h-[19rem] md:p-7 focus-visible:z-10"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
                <ServerMark
                  server={featured}
                  className="h-16 w-16 rounded-2xl text-2xl sm:h-20 sm:w-20"
                />

                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-5 md:inset-x-7 md:bottom-7">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-accent-300">
                      {kindLabel(featured.kind)} · {roleLabel(featured.role)}
                    </p>
                    <h2 className="mt-1.5 max-w-[min(100%,32rem)] break-words text-3xl font-semibold leading-tight tracking-tight text-ink-50 sm:text-4xl">
                      {featured.name}
                    </h2>
                  </div>
                  <span className="mb-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:flex">
                    <ArrowUpRight size={19} aria-hidden />
                  </span>
                </div>
              </Link>

              <Link
                href="/servers/create"
                className="group flex min-h-44 flex-col justify-between border border-dashed border-border-strong bg-void-900/55 p-5 transition-[color,background-color,border-color] duration-300 hover:border-accent-400/60 hover:bg-accent/[0.07] hover:text-ink-50 md:col-span-4 md:min-h-[19rem] md:p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-ink-300 transition-colors group-hover:border-accent-400/60 group-hover:text-accent-300">
                  <Plus size={18} aria-hidden />
                </span>
                <div>
                  <p className="text-lg font-semibold text-ink-100">
                    {createLabel}
                  </p>
                  <p className="mt-1.5 text-sm leading-5 text-ink-500">
                    {createSubLabel}
                  </p>
                </div>
              </Link>
            </section>

            {remaining.length > 0 ? (
              <section className="mt-10" aria-labelledby="all-servers-heading">
                <div className="flex items-center justify-between gap-4 border-b border-border-strong pb-3">
                  <h2
                    id="all-servers-heading"
                    className="text-sm font-semibold text-ink-200"
                  >
                    {allServersLabel}
                  </h2>
                  <span className="flex items-center gap-1.5 text-xs tabular-nums text-ink-500">
                    <Users size={13} aria-hidden />
                    {remaining.length}
                  </span>
                </div>
                <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
                  {remaining.map((server) => (
                    <li
                      key={server.id}
                      className="border-b border-border/60 sm:[&:nth-child(odd)]:border-r xl:[&:nth-child(odd)]:border-r-0 xl:[&:nth-child(3n+1)]:border-r xl:[&:nth-child(3n+2)]:border-r"
                    >
                      <Link
                        href={`/servers/${server.slug}`}
                        aria-label={`${openServerLabel}: ${server.name}`}
                        className="group flex min-h-24 items-center gap-3.5 px-1 py-4 transition-colors hover:bg-surface/45 focus-visible:bg-surface/45 sm:px-4"
                      >
                        <ServerMark
                          server={server}
                          className="h-11 w-11 rounded-xl text-base"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-100 group-hover:text-ink-50">
                            {server.name}
                          </span>
                          <span className="mt-1 block truncate text-xs text-ink-500">
                            {kindLabel(server.kind)} · {roleLabel(server.role)}
                          </span>
                        </span>
                        <ArrowUpRight
                          size={16}
                          className="shrink-0 text-ink-600 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-300"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <section className="mt-6 grid min-h-[420px] border border-border-strong bg-surface/35 md:grid-cols-12">
            <div className="flex items-center justify-center border-b border-border-strong p-8 md:col-span-7 md:border-b-0 md:border-r">
              <div className="relative flex h-48 w-full max-w-md items-center justify-center border border-border-strong bg-void-900/50 sm:h-60">
                <span
                  aria-hidden
                  className="absolute inset-5 border border-accent-400/20"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-10 top-1/2 h-px bg-accent-400/20"
                />
                <span
                  aria-hidden
                  className="absolute inset-y-10 left-1/2 w-px bg-accent-400/20"
                />
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_18px_50px_-24px_rgba(40,40,255,0.9)]">
                  <Server size={25} aria-hidden />
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center p-7 md:col-span-5 md:p-10">
              <h2 className="text-2xl font-semibold tracking-tight text-ink-50">
                {noneYetLabel}
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-400">
                {noneYetSubLabel}
              </p>
              <Link
                href="/servers/create"
                className="mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-500"
              >
                <Plus size={16} aria-hidden />
                {createLabel}
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
