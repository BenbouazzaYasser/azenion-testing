import { ArrowLeft, Clock, FlaskConical, GraduationCap, Milestone } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { RoadmapDetail } from "@/lib/roadmaps/types";
import { getRoadmapCompletion } from "@/lib/roadmaps/types";
import { RoadmapProgress } from "./roadmap-progress";
import { RoadmapPath } from "./roadmap-path";
import { RoadmapNodeStatusBadge } from "./roadmap-node";

const LEVEL_CLASS: Record<RoadmapDetail["level"], string> = {
  beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  intermediate: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  advanced: "border-red-500/30 bg-red-500/10 text-red-300",
};

const LEVEL_LABEL: Record<RoadmapDetail["level"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

interface RoadmapDetailViewProps {
  roadmap: RoadmapDetail;
  backLabel: string;
  backHref?: string;
  progressLabel: string;
  pathHeadingId?: string;
  signedIn?: boolean;
}

/**
 * Detail-page foundation: title, description, level metadata,
 * estimated time/progress area, and the ordered stage → node path.
 * Renders any RoadmapDetail the catalog layer returns, so wiring
 * Supabase later needs no UI changes.
 */
export function RoadmapDetailView({
  roadmap,
  backLabel,
  backHref = "/academy/roadmaps",
  progressLabel,
  pathHeadingId = "roadmap-path-heading",
  signedIn = false,
}: RoadmapDetailViewProps) {
  const completion = getRoadmapCompletion(roadmap.stages);
  const progress = roadmap.progress ?? completion;

  return (
    <div className="mx-auto w-full max-w-[880px] px-5 pb-16 sm:px-8 sm:pb-20">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-ink-400 transition-colors hover:border-accent-400/40 hover:text-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
      >
        <ArrowLeft size={14} aria-hidden />
        {backLabel}
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
            LEVEL_CLASS[roadmap.level],
          )}
        >
          {LEVEL_LABEL[roadmap.level]}
        </span>
        {typeof roadmap.estimatedHours === "number" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
            <Clock size={11} aria-hidden />
            {roadmap.estimatedHours}h estimated
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
          <Milestone size={11} aria-hidden />
          {roadmap.stageCount} {roadmap.stageCount === 1 ? "stage" : "stages"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-400">
          {roadmap.nodeCount} {roadmap.nodeCount === 1 ? "step" : "steps"}
        </span>
      </div>

      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
        {roadmap.title}
      </h1>
      <p className="mt-3 max-w-2xl text-pretty text-[1.02rem] leading-relaxed text-ink-400">
        {roadmap.description}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl card-surface-soft px-4 py-4 shadow-card backdrop-blur-xl">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-ink-500">
            <GraduationCap size={12} aria-hidden />
            Courses
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-50">
            {roadmap.courseCount}
          </p>
        </div>
        <div className="rounded-2xl card-surface-soft px-4 py-4 shadow-card backdrop-blur-xl">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-ink-500">
            <FlaskConical size={12} aria-hidden />
            Labs
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-ink-50">
            {roadmap.labCount}
          </p>
        </div>
        <div className="rounded-2xl card-surface-soft px-4 py-4 shadow-card backdrop-blur-xl">
          <RoadmapProgress value={progress} label={progressLabel} />
        </div>
      </div>

      <h2
        id={pathHeadingId}
        className="mt-12 text-xl font-semibold text-ink-50 sm:text-2xl"
      >
        Learning path
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
        Complete each stage in order — finishing a stage unlocks the next one.
      </p>

      <div className="mt-8">
        <RoadmapPath
          stages={roadmap.stages}
          labelledBy={pathHeadingId}
          roadmapSlug={roadmap.slug}
          signedIn={signedIn}
        />
      </div>

      <div
        aria-label="Node status legend"
        className="mt-10 flex items-center gap-2 text-[11px] font-medium uppercase tracking-normal text-ink-600"
      >
        <span>Legend:</span>
        <span className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
          <RoadmapNodeStatusBadge status="completed" />
          <RoadmapNodeStatusBadge status="current" />
          <RoadmapNodeStatusBadge status="upcoming" />
          <RoadmapNodeStatusBadge status="locked" />
        </span>
      </div>
    </div>
  );
}
