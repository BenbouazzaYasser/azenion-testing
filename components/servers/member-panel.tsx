"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_CLASSES } from "@/components/ui/scrollbar";
import type { ServerMemberRow } from "@/data/servers";
import type { DictKey } from "@/lib/translation/types";
import { useTranslation } from "@/components/translation/translation-provider";

const ROLE_ORDER: ServerMemberRow["role"][] = ["owner", "admin", "member"];

const ROLE_LABEL: Record<ServerMemberRow["role"], DictKey> = {
  owner: "servers.roleOwner",
  admin: "servers.roleAdmin",
  member: "servers.roleMember",
};

interface MemberPanelProps {
  serverName: string;
  members: ServerMemberRow[];
  memberCount: number;
}

export function MemberPanel({ serverName, members, memberCount }: MemberPanelProps) {
  const { t } = useTranslation();

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: t(ROLE_LABEL[role]),
    rows: members
      .filter((m) => m.role === role)
      .sort((a, b) =>
        (a.profile?.full_name ?? a.profile?.username ?? "").localeCompare(
          b.profile?.full_name ?? b.profile?.username ?? "",
        ),
      ),
  })).filter((g) => g.rows.length > 0);

  return (
    <aside
      aria-label={t("servers.members")}
      className="hidden w-[240px] shrink-0 flex-col overflow-hidden border-l border-border bg-void-950/60 lg:flex"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Users size={14} className="shrink-0 text-ink-500" />
        <h2 className="text-[11px] font-semibold uppercase tracking-normal text-ink-400">
          {t("servers.members")}
        </h2>
        <span className="ml-auto text-[11px] font-medium tabular-nums text-ink-600">
          {memberCount}
        </span>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto px-2 py-3", SCROLLBAR_CLASSES)}>
        {grouped.map((group) => (
          <div key={group.role} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-normal text-ink-600">
              {group.label} — {group.rows.length}
            </p>
            <ul className="flex flex-col">
              {group.rows.map((m) => {
                const name = m.profile?.full_name ?? m.profile?.username ?? "Member";
                const initial = (m.profile?.username?.[0] ?? m.profile?.full_name?.[0] ?? "?").toUpperCase();
                return (
                  <li key={m.user_id}>
                    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-surface/40">
                      {m.profile?.avatar_url ? (
                        <Image
                          src={m.profile.avatar_url}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                            "bg-accent",
                          )}
                        >
                          {initial}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-200">{name}</span>
                      {m.role !== "member" && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                            m.role === "owner"
                              ? "bg-accent/15 text-accent-300"
                              : "bg-surface-hover text-ink-400",
                          )}
                        >
                          {t(ROLE_LABEL[m.role])}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="px-2 py-4 text-xs leading-relaxed text-ink-600">
            {serverName} has no members yet.
          </p>
        )}
      </div>
    </aside>
  );
}