"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServerSummary } from "@/data/servers";
import type { DictKey } from "@/lib/translation/types";
import { useTranslation } from "@/components/translation/translation-provider";

interface ServerRailProps {
  servers: ServerSummary[];
  activeSlug?: string;
}

const KIND_LABEL: Record<ServerSummary["kind"], DictKey> = {
  team: "servers.kindTeam",
  branch: "servers.kindBranch",
  user: "servers.kindServer",
};

export function ServerRail({ servers, activeSlug }: ServerRailProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <nav
      aria-label={t("servers.railAria")}
      className="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-void-950/60 py-3 backdrop-blur-xl"
    >
      <Link
        href="/"
        title={t("nav.home")}
        className={cn(
          "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-[color,background-color,box-shadow] duration-200 ease-premium",
          isHome
            ? "bg-accent text-white shadow-control"
            : "bg-surface text-ink-300 hover:bg-surface-hover hover:text-ink-50",
        )}
      >
        {isHome && (
          <span
            aria-hidden
            className="absolute -left-3 h-6 w-[3px] rounded-full bg-accent-300 shadow-control"
          />
        )}
        <Home size={20} />
      </Link>

      <span aria-hidden className="h-px w-8 shrink-0 bg-border-strong" />

      {servers.map((server) => (
        <Link
          key={server.id}
          href={`/servers/${server.slug}`}
          title={`${server.name} · ${t(KIND_LABEL[server.kind])}`}
          aria-current={server.slug === activeSlug ? "page" : undefined}
          className={cn(
            "group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden transition-[color,background-color,box-shadow] duration-200 ease-premium",
            "rounded-xl text-sm font-semibold",
            server.slug === activeSlug
              ? "bg-accent text-white shadow-control"
              : server.icon_url
                ? "bg-surface text-ink-200 hover:bg-surface-hover"
                : "bg-surface text-ink-200 hover:bg-surface-hover hover:text-ink-50",
          )}
        >
          {server.slug === activeSlug && (
            <span
              aria-hidden
              className="absolute -left-3 h-6 w-[3px] rounded-full bg-accent-300 shadow-control"
            />
          )}
          {server.icon_url ? (
            <img src={server.icon_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{(server.name[0] ?? "?").toUpperCase()}</span>
          )}
        </Link>
      ))}

      <Link
        href="/servers/create"
        title={t("servers.createTitle")}
        className={cn(
          "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed",
          "text-ink-500 transition-[color,background-color,border-color] duration-200 ease-premium hover:border-accent-400/60 hover:bg-accent/[0.08] hover:text-accent-300",
        )}
      >
        <Plus size={18} />
      </Link>
    </nav>
  );
}
