"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/data/servers";

interface MobileChannelStripProps {
  serverSlug: string;
  channels: ChannelSummary[];
}

export function MobileChannelStrip({ serverSlug, channels }: MobileChannelStripProps) {
  const pathname = usePathname();
  const activeChannelSlug = pathname.split("/")[3];

  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-void-900/50 px-3 py-2 backdrop-blur-xl md:hidden">
      {channels.map((ch) => {
        const active = ch.slug === activeChannelSlug;
        return (
          <Link
            key={ch.id}
            href={`/servers/${serverSlug}/${ch.slug}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-premium",
              active
                ? "bg-surface-hover text-ink-50 shadow-[0_0_14px_-6px_rgba(90,120,255,0.6)]"
                : "bg-surface text-ink-300 hover:text-ink-100",
            )}
          >
            <Hash size={12} className={cn("shrink-0", active ? "text-accent-300" : "text-ink-600")} />
            {ch.name}
          </Link>
        );
      })}
    </div>
  );
}