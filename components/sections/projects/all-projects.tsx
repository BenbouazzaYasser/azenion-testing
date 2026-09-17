"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Users, Rocket, ArrowDownWideNarrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBubbles } from "@/components/ui/filter-bubbles";
import { ProjectCard, type ProjectCardProject } from "./project-card";
import { filterAndSort, type SortKey, SORT_OPTIONS } from "@/lib/filter-sort";
import { useTranslation } from "@/components/translation/translation-provider";
import type { DictKey } from "@/lib/translation/types";
import { getProjectsPageAction } from "@/actions/projects-list.actions";

// Must match PROJECTS_PAGE_SIZE in actions/projects-list.actions.ts (a plain
// const cannot be imported into a client component from a "use server"
// module, so the value is duplicated here).
const PAGE_SIZE = 24;

interface AllProjectsProps {
  initialProjects: ProjectCardProject[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  technologies: string[];
  categories: { id: string; name: string; slug: string }[];
}

const SORT_LABEL_KEYS: Record<SortKey, DictKey> = {
  newest: "teams.sortNewest",
  oldest: "teams.sortOldest",
  members: "teams.sortMembers",
  alpha: "teams.sortAlpha",
};

export function AllProjects({
  initialProjects,
  initialNextCursor,
  initialHasMore,
  technologies,
  categories,
}: AllProjectsProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [techFilter, setTechFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // Keyset-paginated catalog: first page is SSR'd, further pages append via
  // the getProjectsPageAction server action (cursor = created_at+id, never
  // OFFSET, so inserts never shift or duplicate page boundaries).
  const [projects, setProjects] = useState<ProjectCardProject[]>(initialProjects);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectsRef = useRef(initialProjects);
  const cursorRef = useRef(initialNextCursor);
  const hasMoreRef = useRef(initialHasMore);
  const isFetchingRef = useRef(false);
  const generationRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    setError(null);
    const generation = ++generationRef.current;
    try {
      const result = await getProjectsPageAction(cursorRef.current, PAGE_SIZE);
      if (generation !== generationRef.current) return;
      const seen = new Set(projectsRef.current.map((p) => p.id));
      const fresh = result.projects.filter((p) => !seen.has(p.id));
      const merged = [...projectsRef.current, ...fresh];
      projectsRef.current = merged;
      cursorRef.current = result.nextCursor;
      hasMoreRef.current = result.hasMore;
      setProjects(merged);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      if (generation !== generationRef.current) return;
      setError(t("projects.errorLoadMore"));
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [t]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const filtered = useMemo(() => {
    let result = filterAndSort(projects, {
      search,
      searchFields: [
        (p) => p.name,
        (p) => p.description ?? "",
        (p) => p.owner?.full_name ?? "",
        (p) => p.owner?.username ?? "",
        (p) => p.team?.name ?? "",
      ],
      sortKey: sort,
      sortDate: (p) => p.created_at,
      sortMembers: (p) => p.member_count,
      sortName: (p) => p.name,
    });

    if (techFilter.length > 0) {
      result = result.filter(
        (p) =>
          p.technologies &&
          p.technologies.some((t) =>
            techFilter.some((f) => t.toLowerCase() === f.toLowerCase())
          )
      );
    }

    if (categoryFilter.length > 0) {
      result = result.filter((p) =>
        categoryFilter.some((cid) =>
          (p.categories ?? []).some((c) => c.id === cid)
        )
      );
    }

    return result;
  }, [projects, search, sort, techFilter, categoryFilter]);

  return (
    <section id="projects" className="relative scroll-mt-24 py-20 sm:py-24 lg:py-28" aria-labelledby="all-projects-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-normal text-accent-300">
            {t("projects.allEyebrow")}
          </div>
        

        
          <h2
            id="all-projects-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            {t("projects.allTitle")}
          </h2>
        

        
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  type="text"
                  placeholder={t("projects.searchProjects")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-surface px-11 py-3 text-sm text-ink-50 placeholder:text-ink-600 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input"
                />
              </div>

              <div className="flex items-center gap-2">
                <ArrowDownWideNarrow size={14} className="text-ink-500" />
                <select
                  aria-label={t(SORT_LABEL_KEYS[sort])}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none rounded-xl bg-surface px-3 py-3 pr-8 text-sm text-ink-50 outline-none transition-colors focus:border-accent-400/60 focus:bg-surface-hover focus:shadow-input"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-surface text-ink-50">
                      {t(SORT_LABEL_KEYS[opt.value])}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {technologies.length > 0 ? (
              <FilterBubbles
                options={technologies.map((t) => ({ id: t, label: t }))}
                selected={techFilter}
                onSelect={(id) => {
                  if (id === "__clear") {
                    setTechFilter([]);
                  } else {
                    setTechFilter((prev) =>
                      prev.includes(id)
                        ? prev.filter((t) => t !== id)
                        : [...prev, id]
                    );
                  }
                }}
              />
            ) : null}

            {categories.length > 0 ? (
              <FilterBubbles
                options={categories.map((c) => ({ id: c.id, label: c.name }))}
                selected={categoryFilter}
                onSelect={(id) => {
                  if (id === "__clear") {
                    setCategoryFilter([]);
                  } else {
                    setCategoryFilter((prev) =>
                      prev.includes(id)
                        ? prev.filter((t) => t !== id)
                        : [...prev, id]
                    );
                  }
                }}
              />
            ) : null}
          </div>
        

        {filtered.length === 0 ? (
          
            <div className="mt-10 flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-accent-300">
                <Rocket className="h-7 w-7 text-accent-300" />
              </div>
              <div>
                <p className="text-base font-medium text-ink-200">
                  {search || techFilter.length > 0 || categoryFilter.length > 0
                    ? t("projects.noMatch")
                    : t("projects.noneYet")}
                </p>
                <p className="mt-1.5 text-sm text-ink-600">
                  {search || techFilter.length > 0 || categoryFilter.length > 0
                    ? t("projects.noMatchSub")
                    : t("projects.noneYetSub")}
                </p>
              </div>
              {!search && techFilter.length === 0 && categoryFilter.length === 0 ? (
                <Button asChild variant="secondary" size="sm" className="mt-2">
                  <Link href="/projects/create">{t("projects.createFirst")}</Link>
                </Button>
              ) : null}
            </div>
          
        ) : (
          <>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>

            {error ? (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-ink-500">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
                  {t("projects.loadMore")}
                </Button>
              </div>
            ) : null}

            {isLoadingMore ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl bg-surface p-6 shadow-card backdrop-blur-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-ink-500/20" />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="h-3 w-2/3 rounded-full bg-ink-500/20" />
                        <div className="h-2.5 w-1/3 rounded-full bg-ink-500/20" />
                      </div>
                    </div>
                    <div className="mt-4 h-3 w-full rounded-full bg-ink-500/20" />
                    <div className="mt-2 h-3 w-4/5 rounded-full bg-ink-500/20" />
                  </div>
                ))}
              </div>
            ) : null}

            {hasMore && !error ? (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
                  {t("projects.loadMore")}
                </Button>
              </div>
            ) : null}

            <div ref={sentinelRef} aria-hidden="true" />
          </>
        )}
      </div>
    </section>
  );
}
