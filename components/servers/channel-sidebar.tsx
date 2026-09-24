"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hash, Loader2, Plus, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createServerChannel } from "@/actions/server.actions";
import type { ChannelSummary } from "@/data/servers";
import { useTranslation } from "@/components/translation/translation-provider";

interface ChannelSidebarProps {
  serverId: string;
  serverSlug: string;
  serverName: string;
  kind: "team" | "branch" | "user";
  myRole: string | null;
  memberCount: number;
  channels: ChannelSummary[];
}

export function ChannelSidebar({
  serverId,
  serverSlug,
  serverName,
  kind,
  myRole,
  memberCount,
  channels,
}: ChannelSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const activeChannelSlug = pathname.split("/")[3];
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [optimisticChannels, setOptimisticChannels] = useState<ChannelSummary[]>([]);

  const visibleChannels = useMemo(() => {
    const merged = new Map<string, ChannelSummary>();
    for (const channel of [...optimisticChannels, ...channels]) {
      if (!merged.has(channel.slug)) merged.set(channel.slug, channel);
    }
    const allChannels = [...merged.values()];
    const q = query.trim().toLowerCase();
    if (!q) return allChannels;
    return allChannels.filter(
      (ch) => ch.name.toLowerCase().includes(q) || (ch.topic ?? "").toLowerCase().includes(q),
    );
  }, [channels, optimisticChannels, query]);

  const isAdmin = myRole === "owner" || myRole === "admin";

  const kindLabel =
    kind === "team" ? t("servers.kindTeam") : kind === "branch" ? t("servers.kindBranch") : t("servers.kindServer");

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-glass/60 backdrop-blur-xl">
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-ink-50">{serverName}</h1>
          <p className="text-[10px] font-semibold uppercase tracking-normal text-ink-600">
            {kindLabel}
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            aria-label={t("servers.createChannelAria")}
            title={t("servers.createChannelAria")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-hover hover:text-ink-100"
          >
            {showForm ? <X size={15} /> : <Plus size={16} />}
          </button>
        ) : null}
      </div>

      {showForm && isAdmin ? (
        <form
          className="mx-3 mb-3 shrink-0 rounded-xl bg-surface/70 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || isPending) return;
            const channelName = name.trim();
            const temporaryId = `local:${crypto.randomUUID()}`;
            const temporarySlug = channelName
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 60);
            setOptimisticChannels((current) => [
              ...current,
              { id: temporaryId, name: channelName, slug: temporarySlug, topic: null, project_id: null },
            ]);
            const fd = new FormData();
            fd.set("server_id", serverId);
            fd.set("server_slug", serverSlug);
            fd.set("name", channelName);
            startTransition(async () => {
              const result = await createServerChannel(fd);
              if (result.error) {
                setOptimisticChannels((current) => current.filter((channel) => channel.id !== temporaryId));
                toast.error(result.error);
              } else {
                setOptimisticChannels((current) =>
                  current.map((channel) =>
                    channel.id === temporaryId ? { ...channel, id: result.channelId ?? channel.id } : channel,
                  ),
                );
                setName("");
                setShowForm(false);
                router.refresh();
              }
            });
          }}
        >
          <label htmlFor="channel-name" className="mb-1.5 block text-xs font-medium text-ink-300">
            {t("servers.newChannel")}
          </label>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-sm text-ink-600">#</span>
            <input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="channel-name"
              maxLength={40}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-1 py-1 text-sm text-ink-50 placeholder:text-ink-600 focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={!name.trim() || isPending}>
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {t("servers.addChannel")}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="px-1 pb-2 pt-2.5">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
            <input
              type="search"
              aria-label={t("servers.searchChannels")}
              placeholder={t("servers.searchChannels")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-lg bg-surface/70 py-2 pl-8 pr-3 text-sm text-ink-50 placeholder:text-ink-600 border-0 outline-none transition-[box-shadow] duration-200 focus:ring-2 focus:ring-accent-400/40"
            />
          </div>
        </div>

        <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
          {t("servers.textChannels")}
        </p>
        <ul className="flex flex-col gap-0.5">
          {visibleChannels.map((ch) => {
            const active = ch.slug === activeChannelSlug;
            return (
              <li key={ch.id}>
                <Link
                  href={`/servers/${serverSlug}/${ch.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-premium",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/60",
                    ch.project_id ? "pl-6" : "",
                    active
                      ? "bg-surface-hover font-medium text-ink-50"
                      : "text-ink-400 hover:bg-surface/60 hover:text-ink-200",
                  )}
                  title={ch.project_id ? t("servers.projectChannelTitle") : undefined}
                >
                  <Hash size={14} className={cn("shrink-0", active ? "text-accent-300" : "text-ink-600")} />
                  <span className="truncate">{ch.name}</span>
                  {ch.project_id ? (
                    <span className="ml-auto shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-300">
                      {t("servers.projectBadge")}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
          {visibleChannels.length === 0 ? (
            <li className="px-3 py-4 text-xs leading-relaxed text-ink-500">
              {t("servers.noChannelsVisible")}
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 px-4 py-3 text-xs text-ink-500">
        <Users size={13} className="shrink-0" />
        <span className="tabular-nums">{memberCount} {memberCount === 1 ? t("teams.memberOne") : t("teams.memberMany")}</span>
        {myRole ? (
          <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
            {myRole}
          </span>
        ) : null}
      </div>
    </aside>
  );
}
