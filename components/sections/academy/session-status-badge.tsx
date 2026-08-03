import { cn } from "@/lib/utils";
import type { LiveSessionStatus } from "@/lib/validations/live-session.schema";

const STATUS_CONFIG: Record<
  LiveSessionStatus,
  { label: string; className: string; pulse?: boolean; dot?: boolean }
> = {
  LIVE: {
    label: "Live Now",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    pulse: true,
  },
  UPCOMING: {
    label: "Upcoming",
    className: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    dot: true,
  },
  ENDED: {
    label: "Ended",
    className: "border-ink-700/50 bg-white/[0.03] text-ink-500",
  },
};

export function SessionStatusBadge({ status }: { status: LiveSessionStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        config.className
      )}
    >
      {config.pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      ) : config.dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {config.label}
    </span>
  );
}
