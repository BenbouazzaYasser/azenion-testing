import { ArrowUpRight, Clock, Milestone, Route } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { RoadmapSummary } from "@/lib/roadmaps/types";
import { RoadmapProgress } from "./roadmap-progress";

const LEVEL_CLASS: Record<RoadmapSummary["level"], string> = {
  beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  intermediate: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  advanced: "border-red-500/30 bg-red-500/10 text-red-300",
};

const LEVEL_LABEL: Record<RoadmapSummary["level"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Discovery card for a roadmap. Mirrors the CourseCard/LabCard visual
 * language (same surface, hover lift, meta pills, footer CTA) so Roadmaps
 * feels like a first-class Academy section rather than a new design system.
 */
export function RoadmapCard({ roadmap }: { roadmap: RoadmapSummary }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg card-surface-soft transition-colors duration-200 ease-out hover:border-accent-400/40">
      <div className="relative flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-400/30 bg-accent/10 text-accent-300">
            <Route size={20} aria-hidden />
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
              LEVEL_CLASS[roadmap.level],
            )}
          >
            {LEVEL_LABEL[roadmap.level]}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-ink-50">
          <Link
            href={`/academy/roadmaps/${roadmap.slug}`}
            className="transition-colors group-hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 rounded"
          >
            {roadmap.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-400">
          {roadmap.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-ink-400">
          {typeof roadmap.estimatedHours === "number" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
              <Clock size={11} aria-hidden />
              {roadmap.estimatedHours}h total
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
            <Milestone size={11} aria-hidden />
            {roadmap.stageCount} {roadmap.stageCount === 1 ? "stage" : "stages"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
            {roadmap.courseCount} {roadmap.courseCount === 1 ? "course" : "courses"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
            {roadmap.labCount} {roadmap.labCount === 1 ? "lab" : "labs"}
          </span>
        </div>

        <RoadmapProgress
          value={roadmap.progress}
          label="Roadmap progress"
          className="mt-4"
        />

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Link
            href={`/academy/roadmaps/${roadmap.slug}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-medium text-white transition-all duration-300 ease-premium hover:bg-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
          >
            View roadmap
            <ArrowUpRight size={13} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
