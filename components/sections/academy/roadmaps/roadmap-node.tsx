import {
  Check,
  Circle,
  FlaskConical,
  GraduationCap,
  Lock,
  Play,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  RoadmapContentKind,
  RoadmapNodeStatus,
} from "@/lib/roadmaps/types";
import { isNodeActionable } from "@/lib/roadmaps/types";
import { RoadmapCompleteButton } from "./roadmap-complete-button";

/** Single source of truth for node/status presentation across roadmap UI. */
export const ROADMAP_STATUS_META: Record<
  RoadmapNodeStatus,
  { label: string; icon: typeof Check; chipClass: string; dotClass: string }
> = {
  completed: {
    label: "Completed",
    icon: Check,
    chipClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dotClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  },
  current: {
    label: "Current",
    icon: Play,
    chipClass: "border-accent-400/40 bg-accent/[0.12] text-accent-300",
    dotClass:
      "border-accent-400/40 bg-accent/[0.12] text-accent-300 shadow-control",
  },
  upcoming: {
    label: "Upcoming",
    icon: Circle,
    chipClass: "border-border-strong bg-surface text-ink-400",
    dotClass: "border-border-strong bg-surface text-ink-500",
  },
  locked: {
    label: "Locked",
    icon: Lock,
    chipClass: "border-border-strong bg-surface text-ink-600",
    dotClass: "border-border-strong bg-surface text-ink-600",
  },
};

export const ROADMAP_KIND_META: Record<
  RoadmapContentKind,
  { label: string; icon: typeof GraduationCap }
> = {
  course: { label: "Course", icon: GraduationCap },
  lab: { label: "Lab", icon: FlaskConical },
};

export function RoadmapNodeStatusBadge({
  status,
}: {
  status: RoadmapNodeStatus;
}) {
  const meta = ROADMAP_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        meta.chipClass,
      )}
    >
      <Icon size={11} aria-hidden />
      {meta.label}
    </span>
  );
}

interface RoadmapNodeProps {
  title: string;
  description?: string | null;
  kind: RoadmapContentKind;
  status: RoadmapNodeStatus;
  href?: string;
  estimatedMinutes?: number | null;
  isOptional?: boolean;
  /** Rendered inside an <ol>; keeps markers aligned on the path rail. */
  position: number;
  /** Referring roadmap node id; needed for the "Mark complete" action. */
  nodeId?: string;
  /** Slug of the containing roadmap; revalidated when completing. */
  roadmapSlug?: string;
  /** Whether the visitor is signed in (completion requires auth). */
  signedIn?: boolean;
  /** Referenced content is not currently available; renders the node inert. */
  unavailable?: boolean;
}

/**
 * One step on the learning path. Completed/current nodes link to their
 * course or lab; upcoming/locked nodes render inert so learners can't skip
 * prerequisites by keyboard or click. Nodes whose referenced content is no
 * longer available render inert with an "Unavailable" chip instead (decision
 * #8: no silent access to content that was unpublished or archived later).
 */
export function RoadmapNode({
  title,
  description,
  kind,
  status,
  href,
  estimatedMinutes,
  isOptional,
  position,
  nodeId,
  roadmapSlug,
  signedIn,
  unavailable,
}: RoadmapNodeProps) {
  const statusMeta = ROADMAP_STATUS_META[status];
  const kindMeta = ROADMAP_KIND_META[kind];
  const KindIcon = kindMeta.icon;
  const StatusIcon = statusMeta.icon;
  const actionable = isNodeActionable(status) && href && !unavailable;
  const interactiveClass =
    "transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950";

  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
          statusMeta.dotClass,
        )}
      >
        <StatusIcon size={15} />
        <span className="sr-only">{`Step ${position}: ${statusMeta.label}`}</span>
      </span>
      <span className="min-w-0 flex-1 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 backdrop-blur-xl">
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-ink-500">
            <KindIcon size={12} aria-hidden />
            {kindMeta.label}
          </span>
          {typeof estimatedMinutes === "number" ? (
            <span className="text-[11px] tabular-nums text-ink-600">
              {estimatedMinutes} min
            </span>
          ) : null}
          {isOptional ? (
            <span className="rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-medium uppercase tracking-normal text-ink-500">
              Optional
            </span>
          ) : null}
          <span className="ms-auto">
            {unavailable ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                <span aria-hidden className="size-1.5 rounded-full bg-amber-400/70" />
                Unavailable
              </span>
            ) : (
              <RoadmapNodeStatusBadge status={status} />
            )}
          </span>
        </span>
        <span className="mt-1.5 block truncate text-[15px] font-semibold text-ink-50">
          {title}
        </span>
        {description ? (
          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-ink-400">
            {description}
          </span>
        ) : null}
      </span>
    </>
  );

  const showComplete =
    status === "current" && signedIn && roadmapSlug && nodeId && !unavailable;

  if (actionable) {
    // Never nest interactive controls inside the anchor (invalid HTML): when
    // the "Mark complete" button is shown it renders as a sibling beneath the
    // current-step card.
    if (showComplete) {
      return (
        <span className="block">
          <a
            href={href}
            aria-label={`${title} — ${kindMeta.label}, ${statusMeta.label}`}
            className={cn(
              "group flex items-start gap-4 rounded-2xl hover:[&>span:last-child]:border-accent-400/40",
              interactiveClass,
            )}
          >
            {inner}
          </a>
          <span className="ms-14 mt-1">
            <RoadmapCompleteButton nodeId={nodeId} slug={roadmapSlug} />
          </span>
        </span>
      );
    }
    return (
      <a
        href={href}
        aria-label={`${title} — ${kindMeta.label}, ${statusMeta.label}`}
        className={cn(
          "group flex items-start gap-4 rounded-2xl hover:[&>span:last-child]:border-accent-400/40",
          interactiveClass,
        )}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      aria-label={`${title} — ${kindMeta.label}, ${statusMeta.label}`}
      aria-disabled={status === "locked" || unavailable}
      className={cn(
        "flex items-start gap-4",
        (status === "locked" || unavailable) && "opacity-70",
      )}
    >
      {inner}
    </div>
  );
}
