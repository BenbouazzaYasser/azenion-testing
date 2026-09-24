import { cn } from "@/lib/utils";

interface RoadmapProgressProps {
  /** Completion fraction (0–1), or null when progress is unknown. */
  value: number | null;
  /** Accessible label for the progressbar. */
  label: string;
  className?: string;
}

/**
 * Shared progress presentation for roadmap cards and detail headers.
 * A null value renders an honest "not started" track rather than 0%.
 */
export function RoadmapProgress({ value, label, className }: RoadmapProgressProps) {
  const percent =
    value === null ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-400">{label}</span>
        <span
          className="text-xs font-semibold tabular-nums text-ink-200"
          aria-hidden={percent === null}
        >
          {percent === null ? "—" : `${percent}%`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={
          percent === null ? "Progress not tracked yet" : `${percent}% complete`
        }
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-premium",
            percent === null
              ? "w-0"
              : "bg-gradient-to-r from-accent-500 to-accent-400 shadow-control",
          )}
          style={{ width: percent === null ? "0%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}
