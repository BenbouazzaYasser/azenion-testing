"use client";

import { useMemo, useState } from "react";
import { Route, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { useTranslation } from "@/components/translation/translation-provider";
import type { RoadmapLevel, RoadmapSummary } from "@/lib/roadmaps/types";
import { ROADMAP_LEVELS } from "@/lib/roadmaps/types";
import { RoadmapCard } from "./roadmap-card";

const inputClass =
  "w-full rounded-full bg-surface px-4 py-3 text-sm text-ink-50 placeholder:text-ink-600 shadow-card outline-none backdrop-blur-xl transition-all duration-300 focus:border-accent-400/60 focus:bg-surface-hover focus:ring-2 focus:ring-accent-400/30";

interface RoadmapsBrowserProps {
  roadmaps: RoadmapSummary[];
}

/**
 * Discovery section for /academy/roadmaps. Mirrors the Courses/Labs
 * browser pattern (search input + filter bubbles + card grid + honest
 * empty state) and is ready to consume real roadmap data once the
 * catalog loader is wired to Supabase — no UI changes needed.
 */
export function RoadmapsBrowser({ roadmaps }: RoadmapsBrowserProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roadmaps.filter((roadmap) => {
      const matchesLevel =
        !level || roadmap.level === (level as RoadmapLevel);
      const matchesQuery =
        !q ||
        roadmap.title.toLowerCase().includes(q) ||
        roadmap.description.toLowerCase().includes(q);
      return matchesLevel && matchesQuery;
    });
  }, [roadmaps, query, level]);

  return (
    <section
      className="relative py-16 sm:py-20 lg:py-24"
      aria-labelledby="roadmaps-browser-heading"
    >
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("academy.searchRoadmaps")}
                aria-label={t("academy.searchRoadmaps")}
                className={cn(inputClass, "pl-12")}
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-600">
              {t("academy.filtersDifficulty")}
            </span>
            <FilterBubbles
              options={ROADMAP_LEVELS.map((l) => ({
                id: l,
                label: l.charAt(0).toUpperCase() + l.slice(1),
              }))}
              selected={level}
              onSelect={setLevel}
            />
          </div>
        </Reveal>

        <Reveal delay={160}>
          {filtered.length > 0 ? (
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((roadmap) => (
                <RoadmapCard key={roadmap.slug} roadmap={roadmap} />
              ))}
            </div>
          ) : (
            <div className="relative mt-14 overflow-hidden rounded-2xl card-surface-soft shadow-card backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(244,245,248,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(244,245,248,0.04)_1px,transparent_1px)] bg-[size:32px_32px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
              />

              <div className="relative flex flex-col items-center px-8 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-accent-300 shadow-[0_0_40px_-12px_rgba(40,40,255,0.5)]">
                  <Route size={32} aria-hidden />
                </div>
                <h3
                  id="roadmaps-browser-heading"
                  className="mt-8 text-2xl font-semibold text-ink-50 sm:text-3xl"
                >
                  {roadmaps.length === 0
                    ? t("academy.listRoadmapsNone")
                    : t("academy.listRoadmapsEmpty")}
                </h3>
                <p className="mt-4 max-w-md text-balance text-[0.95rem] leading-relaxed text-ink-400">
                  {roadmaps.length === 0
                    ? t("academy.listRoadmapsNoneSub")
                    : t("academy.listRoadmapsEmptySub")}
                </p>
                {roadmaps.length === 0 ? (
                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600">
                    {t("academy.comingTo")}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
