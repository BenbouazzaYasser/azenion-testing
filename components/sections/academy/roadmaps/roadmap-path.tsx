import { Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  RoadmapStage,
  RoadmapStageState,
} from "@/lib/roadmaps/types";
import { getStageState } from "@/lib/roadmaps/types";
import { RoadmapNode } from "./roadmap-node";

const STAGE_STATE_META: Record<
  RoadmapStageState,
  { label: string; badgeClass: string }
> = {
  completed: {
    label: "Stage complete",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  active: {
    label: "In progress",
    badgeClass: "border-accent-400/40 bg-accent/[0.12] text-accent-300",
  },
  upcoming: {
    label: "Upcoming",
    badgeClass: "border-border-strong bg-surface text-ink-400",
  },
  locked: {
    label: "Locked",
    badgeClass: "border-border-strong bg-surface text-ink-600",
  },
};

interface RoadmapPathProps {
  stages: RoadmapStage[];
  /** id of the labelled heading for the path region. */
  labelledBy: string;
}

/**
 * Ordered learning path: Roadmap → Stage → Course/Lab → Completion.
 * Stages render in position order on a vertical rail; completion flows
 * top-to-bottom so "next stage" is always visually the next section.
 */
export function RoadmapPath({ stages, labelledBy }: RoadmapPathProps) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div role="region" aria-labelledby={labelledBy} className="relative">
      <ol className="relative space-y-10">
        {ordered.map((stage) => (
          <RoadmapStageSection key={stage.id} stage={stage} />
        ))}
      </ol>
    </div>
  );
}

function RoadmapStageSection({ stage }: { stage: RoadmapStage }) {
  const state = getStageState(stage);
  const meta = STAGE_STATE_META[state];
  const StateIcon = state === "completed" ? Check : state === "locked" ? Lock : null;
  const orderedNodes = stage.nodes;

  return (
    <li className="relative">
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full border border-accent-400/30 bg-accent/[0.08] text-sm font-semibold tabular-nums text-accent-300"
        >
          {stage.position}
        </span>
        <h3 className="text-lg font-semibold text-ink-50">{stage.title}</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            meta.badgeClass,
          )}
        >
          {StateIcon ? <StateIcon size={11} aria-hidden /> : null}
          {meta.label}
        </span>
      </div>
      {stage.description ? (
        <p className="mt-1.5 max-w-2xl ps-11 text-sm leading-relaxed text-ink-400">
          {stage.description}
        </p>
      ) : null}

      {orderedNodes.length > 0 ? (
        <ol className="relative mt-5 space-y-4 ps-3 sm:ps-4">
          <span
            aria-hidden
            className="absolute bottom-5 left-[30px] top-5 w-px bg-gradient-to-b from-accent-400/40 via-border-strong to-transparent sm:left-[34px]"
          />
          {orderedNodes.map((node, index) => (
            <li key={node.id} className="relative">
              <RoadmapNode
                title={node.title}
                description={node.description}
                kind={node.kind}
                status={node.status}
                href={node.href}
                estimatedMinutes={node.estimatedMinutes}
                isOptional={node.isOptional}
                position={index + 1}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-border-strong bg-white/[0.01] px-4 py-5 ps-11 text-sm text-ink-500">
          Content for this stage hasn&apos;t been published yet.
        </p>
      )}
    </li>
  );
}
