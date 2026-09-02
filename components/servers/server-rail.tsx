"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
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
  return (
    <nav
      aria-label={t("servers.railAria")}
      className="flex h-full w-[68px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-void-950/60 py-3 backdrop-blur-xl"
    >
      {servers.map((server) => (
        <Link
          key={server.id}
          href={`/servers/${server.slug}`}
          title={`${server.name} · ${t(KIND_LABEL[server.kind])}`}
          aria-current={server.slug === activeSlug ? "page" : undefined}
          className={cn(
            "group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden transition-all duration-300 ease-premium",
            "rounded-2xl text-sm font-semibold",
            server.slug === activeSlug
              ? "rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-glow"
              : server.icon_url
                ? "bg-surface text-ink-200 hover:scale-105 hover:shadow-glow-sm"
                : "bg-surface text-ink-200 hover:scale-105 hover:text-ink-50 hover:shadow-glow-sm",
          )}
        >
          {server.slug === activeSlug && (
            <span
              aria-hidden
              className="absolute -left-3 h-6 w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
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
          "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-dashed",
          "text-ink-500 transition-all duration-300 ease-premium hover:border-accent-400/60 hover:bg-accent/[0.08] hover:text-accent-300",
        )}
      >
        <Plus size={18} />
      </Link>
    </nav>
  );
}
